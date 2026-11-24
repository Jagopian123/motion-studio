import type { CanRenderMediaOnWebOptions, RenderMediaOnWebProgress } from '@remotion/web-renderer';
import { getClip } from '../../engine/composition/clip';
import { StoryComposition, type StoryCompositionProps } from '../../engine/composition/StoryComposition';
import { isMp4, type EncoderPreference, type Preset, type PresetSupport } from './settings';

const loadRenderer = () => import('@remotion/web-renderer');
const mediaOptions = (withAudio: boolean) => ({
  container: 'mp4',
  videoCodec: 'h264',
  audioCodec: withAudio ? 'aac' : null,
  audioBitrate: 128_000,
  muted: !withAudio,
  outputTarget: 'arraybuffer',
  scale: 1,
} as const satisfies Omit<CanRenderMediaOnWebOptions, 'width' | 'height'>);

export function readDevice() {
  let webgl2 = false;
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    webgl2 = context !== null;
    context?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    // Some devices block creation of a WebGL context entirely.
  }

  return {
    webgl2,
    secureContext: window.isSecureContext,
    videoEncoder: typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined',
  };
}

export type Device = ReturnType<typeof readDevice>;

async function supportsAvc(preset: Preset, fps: number, hardwareAcceleration: EncoderPreference) {
  // Level 3.1 covers up to 720p30. Level 4.0 covers up to 1080p30.
  const level = preset.id === '1080p' ? '28' : '1f';
  for (const codec of [`avc1.6400${level}`, `avc1.4240${level}`]) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({
        codec,
        width: preset.width,
        height: preset.height,
        framerate: fps,
        bitrate: preset.videoBitrate,
        hardwareAcceleration,
        avc: { format: 'avc' },
      });
      if (supported) return true;
    } catch {
      // A browser can throw for unsupported encoder configurations.
    }
  }
  return false;
}

export async function checkPreset(device: Device, preset: Preset, fps: number, withAudio = false, videoSupport?: PresetSupport): Promise<PresetSupport> {
  if (!device.secureContext || !device.webgl2 || !device.videoEncoder) {
    return { supported: false, detail: 'Perlu konteks aman, WebGL2, dan WebCodecs.' };
  }

  try {
    const { canRenderMediaOnWeb } = await loadRenderer();
    const { width, height, videoBitrate } = preset;
    const options = mediaOptions(withAudio);
    const check = await canRenderMediaOnWeb({ ...options, width, height, videoBitrate });
    if (withAudio && (check.resolvedAudioCodec !== 'aac' || check.issues.some((issue) => issue.type === 'audio-codec-unsupported'))) {
      return { supported: false, detail: 'Encoder AAC tidak tersedia. Anda dapat memilih Ekspor tanpa audio.' };
    }
    if (!check.canRender || check.resolvedVideoCodec !== 'h264' || check.resolvedOutputTarget !== options.outputTarget) {
      return { supported: false, detail: 'Konfigurasi H.264 MP4 ini tidak tersedia. Coba resolusi lain.' };
    }
    if (videoSupport) return videoSupport;

    if (await supportsAvc(preset, fps, 'prefer-hardware')) {
      return { supported: true, encoder: 'prefer-hardware' };
    }
    if (await supportsAvc(preset, fps, 'no-preference')) {
      return { supported: true, encoder: 'no-preference' };
    }
    return { supported: false, detail: `WebCodecs menolak konfigurasi H.264 pada ${fps} FPS.` };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { supported: false, detail: withAudio ? `Pemeriksaan AAC gagal. ${detail}` : detail };
  }
}

export async function renderVideo(
  inputProps: StoryCompositionProps,
  preset: Preset,
  hardwareAcceleration: EncoderPreference,
  signal: AbortSignal,
  onProgress: (progress: RenderMediaOnWebProgress) => void,
): Promise<Blob> {
  const { renderMediaOnWeb } = await loadRenderer();
  signal.throwIfAborted();
  const { width, height, videoBitrate } = preset;
  const { id, fps, durationInFrames } = getClip(inputProps.project);
  const withAudio = inputProps.audio.length > 0;
  const result = await renderMediaOnWeb({
    ...mediaOptions(withAudio),
    composition: { id, fps, durationInFrames, component: StoryComposition, width, height, defaultProps: inputProps },
    inputProps,
    videoBitrate,
    hardwareAcceleration,
    signal,
    onProgress,
    sampleRate: 48_000,
    mediaCacheSizeInBytes: 32 * 1024 * 1024,
    pageResponsiveness: 'high',
    licenseKey: 'free-license',
  });
  signal.throwIfAborted();
  const blob = await result.getBlob();
  if (!(await isMp4(blob))) throw new Error('Output MP4 tidak valid.');
  if (withAudio) {
    const { BlobSource, Input, MP4 } = await import('mediabunny');
    const output = new Input({ source: new BlobSource(blob), formats: [MP4] });
    try {
      const audio = await output.getPrimaryAudioTrack();
      if (!audio || await audio.getCodec() !== 'aac' || await audio.computeDuration() <= 0) {
        throw new Error('Track AAC tidak ditemukan atau kosong di hasil MP4.');
      }
    } finally {
      output.dispose();
    }
  }
  return blob;
}
