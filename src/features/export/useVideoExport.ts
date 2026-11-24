import { useEffect, useRef, useState } from 'react';
import type { StoryCompositionProps } from '../../engine/composition/StoryComposition';
import { getClip } from '../../engine/composition/clip';
import { audioSource, validAudioSettings, type LocalAudioTrack } from '../audio/audio-track';
import { renderVideo } from './browser-renderer';
import { keepScreenAwake } from './keep-screen-awake';
import { canRetryWithBrowserEncoder, describeRenderError, estimateRemaining, type EncoderPreference, type Preset } from './settings';

type ExportState =
  | { phase: 'idle' }
  | { phase: 'rendering'; progress: number; frames: number; elapsed: number; eta: number | null; encoder: EncoderPreference; fallback: boolean; cancelling: boolean }
  | { phase: 'cancelled' }
  | { phase: 'error'; help: string; detail: string }
  | { phase: 'done'; url: string; fileSize: number; elapsed: number; frames: number; preset: Preset; encoder: EncoderPreference; fallback: boolean; withAudio: boolean };

export function useVideoExport() {
  const [state, setState] = useState<ExportState>({ phase: 'idle' });
  const activeJob = useRef<AbortController | null>(null);
  const download = useRef<string | null>(null);

  useEffect(() => () => {
    activeJob.current?.abort();
    if (download.current) URL.revokeObjectURL(download.current);
  }, []);

  const start = async (project: StoryCompositionProps['project'], audio: LocalAudioTrack[], preset: Preset, preference: EncoderPreference) => {
    if (activeJob.current) return;
    if (download.current) URL.revokeObjectURL(download.current);
    download.current = null;
    const job = new AbortController();
    activeJob.current = job;
    const startTime = performance.now();
    const urls: string[] = [];
    const screenCleanup = keepScreenAwake();
    function contextLost(event: Event) {
      const canvas = event.target;
      if (canvas instanceof HTMLCanvasElement && canvas.closest('[data-motion-composition]') && !canvas.closest('.preview-frame')) {
        job.abort(new Error('WebGL context lost saat mengekspor.'));
      }
    }
    document.addEventListener('webglcontextlost', contextLost, true);
    const timer = window.setInterval(() => {
      setState((previous) => previous.phase === 'rendering' ? { ...previous, elapsed: performance.now() - startTime } : previous);
    }, 250);

    try {
      const { durationInFrames } = getClip(project);
      const inputProps = {
        project: structuredClone(project),
        audio: audio.map((track) => {
          if (!validAudioSettings(track, durationInFrames)) throw new Error('Posisi mulai audio berada di luar proyek.');
          const url = URL.createObjectURL(track.blob);
          urls.push(url);
          return audioSource(track, url);
        }),
      };
      const attempt = (encoder: EncoderPreference, fallback: boolean) => {
        const attemptTime = performance.now();
        setState({ phase: 'rendering', progress: 0, frames: 0, elapsed: attemptTime - startTime, eta: null, encoder, fallback, cancelling: false });
        return renderVideo(inputProps, preset, encoder, job.signal, ({ encodedFrames, progress }) => {
          if (job.signal.aborted) return;
          const now = performance.now();
          const frames = Math.min(encodedFrames, durationInFrames);
          const eta = estimateRemaining(now - attemptTime, frames, durationInFrames);
          setState({ phase: 'rendering', progress, frames, elapsed: now - startTime, eta, encoder, fallback, cancelling: false });
        });
      };
      let encoder = preference;
      let blob: Blob;
      try {
        blob = await attempt(encoder, false);
      } catch (error) {
        if (job.signal.aborted || encoder !== 'prefer-hardware' || !canRetryWithBrowserEncoder(error)) throw error;
        encoder = 'no-preference';
        blob = await attempt(encoder, true);
      }
      job.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      download.current = url;
      setState({ phase: 'done', url, fileSize: blob.size, elapsed: performance.now() - startTime, frames: durationInFrames, preset, encoder, fallback: encoder !== preference, withAudio: audio.length > 0 });
    } catch (error) {
      const failure: unknown = job.signal.aborted ? job.signal.reason : error;
      if (job.signal.aborted && failure instanceof DOMException && failure.name === 'AbortError') setState({ phase: 'cancelled' });
      else setState({ phase: 'error', help: describeRenderError(failure), detail: failure instanceof Error ? failure.message : String(failure) });
    } finally {
      window.clearInterval(timer);
      screenCleanup();
      document.removeEventListener('webglcontextlost', contextLost, true);
      urls.forEach((url) => URL.revokeObjectURL(url));
      activeJob.current = null;
    }
  };

  const cancel = () => {
    activeJob.current?.abort();
    setState((previous) => previous.phase === 'rendering' ? { ...previous, cancelling: true } : previous);
  };

  const reset = () => {
    if (activeJob.current) return false;
    if (download.current) URL.revokeObjectURL(download.current);
    download.current = null;
    setState({ phase: 'idle' });
    return true;
  };

  return { state, start, cancel, reset };
}
