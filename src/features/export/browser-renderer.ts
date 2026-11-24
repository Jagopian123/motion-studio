import type { CanRenderMediaOnWebOptions, RenderMediaOnWebProgress } from '@remotion/web-renderer';
import { getClip } from '../../engine/composition/clip';
import { StoryComposition, type StoryCompositionProps } from '../../engine/composition/StoryComposition';
import { isMp4, type EncoderPreference, type Preset, type PresetSupport } from './settings';

const loadRenderer = () => import('@remotion/web-renderer');
const mediaOptions = {
  container: 'mp4',
  videoCodec: 'h264',
  muted: true,
  outputTarget: 'arraybuffer',
} as const satisfies Omit<CanRenderMediaOnWebOptions, 'width' | 'height'>;

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
  // Both presets fit AVC level 3.1 up to 30 FPS. Check High and Constrained Baseline
  // because the browser-specific codec string is selected inside the renderer.
  for (const codec of ['avc1.64001f', 'avc1.42401f']) {
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

export async function checkPreset(device: Device, preset: Preset, fps: number): Promise<PresetSupport> {
  if (!device.secureContext || !device.webgl2 || !device.videoEncoder) {
    return { supported: false, detail: 'Perlu konteks aman, WebGL2, dan WebCodecs.' };
  }

  try {
    const { canRenderMediaOnWeb } = await loadRenderer();
    const { width, height, videoBitrate } = preset;
    const check = await canRenderMediaOnWeb({ ...mediaOptions, width, height, videoBitrate });
    if (!check.canRender || check.resolvedVideoCodec !== mediaOptions.videoCodec) {
      const detail = check.issues.find((issue) => issue.severity === 'error')?.message;
      return { supported: false, detail: detail ?? 'Encoder H.264 MP4 tidak tersedia.' };
    }

    if (await supportsAvc(preset, fps, 'prefer-hardware')) {
      return { supported: true, encoder: 'prefer-hardware' };
    }
    if (await supportsAvc(preset, fps, 'no-preference')) {
      return { supported: true, encoder: 'no-preference' };
    }
    return { supported: false, detail: `WebCodecs menolak konfigurasi H.264 pada ${fps} FPS.` };
  } catch (error) {
    return { supported: false, detail: error instanceof Error ? error.message : String(error) };
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
  const result = await renderMediaOnWeb({
    ...mediaOptions,
    composition: { id, fps, durationInFrames, component: StoryComposition, width, height, defaultProps: inputProps },
    inputProps,
    videoBitrate,
    hardwareAcceleration,
    signal,
    onProgress,
    pageResponsiveness: 'high',
    licenseKey: 'free-license',
  });
  signal.throwIfAborted();
  const blob = await result.getBlob();
  if (!(await isMp4(blob))) throw new Error('Output MP4 tidak valid.');
  return blob;
}
