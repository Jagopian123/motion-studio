import { useEffect, useRef, useState } from 'react';
import type { StoryCompositionProps } from '../../engine/composition/StoryComposition';
import { renderVideo } from './browser-renderer';
import { canRetryWithBrowserEncoder, describeRenderError, type EncoderPreference, type Preset } from './settings';

type ExportState =
  | { phase: 'idle' }
  | { phase: 'rendering'; progress: number; frames: number; encoder: EncoderPreference; fallback: boolean; cancelling: boolean }
  | { phase: 'cancelled' }
  | { phase: 'error'; help: string; detail: string }
  | { phase: 'done'; url: string; fileSize: number; elapsed: number; preset: Preset; encoder: EncoderPreference; fallback: boolean };

export function useVideoExport(inputProps: StoryCompositionProps) {
  const [state, setState] = useState<ExportState>({ phase: 'idle' });
  const activeJob = useRef<AbortController | null>(null);
  const download = useRef<string | null>(null);

  useEffect(() => () => {
    activeJob.current?.abort();
    if (download.current) URL.revokeObjectURL(download.current);
  }, []);

  const start = async (preset: Preset, preference: EncoderPreference) => {
    if (activeJob.current) return;
    if (download.current) URL.revokeObjectURL(download.current);
    download.current = null;
    const job = new AbortController();
    activeJob.current = job;
    const startTime = performance.now();

    const attempt = (encoder: EncoderPreference, fallback: boolean) => {
      setState({ phase: 'rendering', progress: 0, frames: 0, encoder, fallback, cancelling: false });
      return renderVideo(inputProps, preset, encoder, job.signal, ({ encodedFrames, progress }) => {
        if (job.signal.aborted) return;
        setState({ phase: 'rendering', progress, frames: encodedFrames, encoder, fallback, cancelling: false });
      });
    };

    try {
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
      setState({ phase: 'done', url, fileSize: blob.size, elapsed: performance.now() - startTime, preset, encoder, fallback: encoder !== preference });
    } catch (error) {
      if (job.signal.aborted) setState({ phase: 'cancelled' });
      else setState({ phase: 'error', help: describeRenderError(error), detail: error instanceof Error ? error.message : String(error) });
    } finally {
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
