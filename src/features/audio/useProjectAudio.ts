import { useEffect, useMemo, useRef, useState } from 'react';
import { readProjectAudio, storageErrorMessage, writeProjectAudio } from '../projects/project-storage';
import { audioSource, validAudioSettings, type AudioRole, type AudioSettings, type LocalAudioTrack } from './audio-track';
import { readAudioFile } from './read-audio';

type LoadedAudio = { projectId: string; tracks: LocalAudioTrack[]; error?: string };
const emptyTracks: LocalAudioTrack[] = [];

export function useProjectAudio(projectId: string | undefined, durationInFrames: number, flush: () => Promise<boolean>) {
  const [loaded, setLoaded] = useState<LoadedAudio>();
  const [loadVersion, setLoadVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ projectId: string; message: string }>();
  const writing = useRef(false);
  const current = loaded?.projectId === projectId ? loaded : undefined;
  const tracks = current?.tracks ?? emptyTracks;

  useEffect(() => {
    let cancelled = false;
    if (projectId) {
      void readProjectAudio(projectId).then((tracks) => {
        if (!cancelled) setLoaded({ projectId, tracks });
      }).catch((failure: unknown) => {
        if (!cancelled) setLoaded({ projectId, tracks: [], error: storageErrorMessage(failure) });
      });
    } else {
      queueMicrotask(() => { if (!cancelled) setLoaded(undefined); });
    }
    return () => { cancelled = true; };
  }, [projectId, loadVersion]);

  function reload() {
    if (writing.current) return;
    setLoaded(undefined);
    setError(undefined);
    setLoadVersion((version) => version + 1);
  }

  async function change(role: AudioRole, prepare: (previous: LocalAudioTrack | undefined, projectId: string) => Promise<LocalAudioTrack | null>) {
    if (!projectId || !current || current.error || writing.current) return;
    const previous = tracks.find((track) => track.role === role);
    writing.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const next = await prepare(previous, projectId);
      if (!await flush()) throw new Error('Simpan proyek terlebih dahulu, lalu coba lagi.');
      try {
        await writeProjectAudio(projectId, role, previous, next);
      } catch (failure) {
        throw new Error(storageErrorMessage(failure), { cause: failure });
      }
      setLoaded({ projectId, tracks: [...tracks.filter((track) => track.role !== role), ...(next ? [next] : [])] });
      return true;
    } catch (failure) {
      setError({ projectId, message: failure instanceof Error ? failure.message : String(failure) });
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  return {
    tracks, busy, loading: Boolean(projectId && !current), loadError: current?.error, reload,
    error: error?.projectId === projectId ? error?.message : undefined,
    replace: (role: AudioRole, file: File) => change(role, async (previous, projectId) => ({
      ...await readAudioFile(file), id: crypto.randomUUID(), revision: 1, projectId, role,
      startFrame: previous?.startFrame ?? 0, volume: previous?.volume ?? (role === 'music' ? 0.25 : 1),
    })),
    update: (role: AudioRole, settings: AudioSettings) => change(role, async (previous) => {
      if (!previous || !validAudioSettings(settings, durationInFrames)) throw new Error('Mulai harus berada dalam durasi proyek dan volume harus antara 0 dan 1.');
      return { ...previous, ...settings, revision: previous.revision + 1 };
    }),
    remove: (role: AudioRole) => change(role, async () => null),
  };
}

function useAudioUrl(blob: Blob | undefined) {
  const [value, setValue] = useState<{ blob: Blob; url: string }>();
  useEffect(() => {
    let active = true;
    let url: string | undefined;
    // Wait for teardown of the previous Player source before opening a new one.
    queueMicrotask(() => {
      if (!active) return;
      url = blob ? URL.createObjectURL(blob) : undefined;
      setValue(blob && url ? { blob, url } : undefined);
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [blob]);
  return value?.blob === blob ? value?.url : undefined;
}

export function usePreviewAudio(tracks: LocalAudioTrack[]) {
  const narration = tracks.find((track) => track.role === 'narration');
  const music = tracks.find((track) => track.role === 'music');
  const narrationUrl = useAudioUrl(narration?.blob);
  const musicUrl = useAudioUrl(music?.blob);
  return useMemo(() => [
    ...(narration && narrationUrl ? [audioSource(narration, narrationUrl)] : []),
    ...(music && musicUrl ? [audioSource(music, musicUrl)] : []),
  ], [narration, narrationUrl, music, musicUrl]);
}
