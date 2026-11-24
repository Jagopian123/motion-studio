import { useState } from 'react';
import { audioRoleLabel, audioRoles, validAudioSettings, type LocalAudioTrack } from './audio-track';
import type { useProjectAudio } from './useProjectAudio';

type Audio = ReturnType<typeof useProjectAudio>;

function TrackSettings({ track, audio, durationInFrames, fps, onChange }: {
  track: LocalAudioTrack;
  audio: Audio;
  durationInFrames: number;
  fps: number;
  onChange: () => void;
}) {
  const { role } = track;
  const [startFrame, setStartFrame] = useState(String(track.startFrame));
  const [volume, setVolume] = useState(track.volume);
  const settings = { startFrame: startFrame.trim() ? Number(startFrame) : NaN, volume };
  const valid = validAudioSettings(settings, durationInFrames);
  const changed = settings.startFrame !== track.startFrame || settings.volume !== track.volume;
  const outside = track.startFrame >= durationInFrames;

  return (
    <form className="audio-settings" onSubmit={async (event) => {
      event.preventDefault();
      if (valid && changed && await audio.update(role, settings)) onChange();
    }}>
      <p className="audio-file-name"><strong>{track.name}</strong> <small>{track.duration.toFixed(2)} dtk · {(track.blob.size / 1024).toFixed(0)} KiB</small></p>
      {outside && <p className="notice" role="status">Posisi mulai berada di luar proyek. Ubah ke frame 0–{durationInFrames - 1} agar track diputar dan ikut ekspor.</p>}
      {!outside && <p className="helper">Siap · Mulai {(track.startFrame / fps).toFixed(2)} dtk</p>}
      <label className="audio-field" htmlFor={`audio-${role}-frame`}>Frame mulai {audioRoleLabel[role].toLowerCase()}
        <input id={`audio-${role}-frame`} className="text-input" type="number" min={0} max={durationInFrames - 1} step={1} required value={startFrame} onChange={(event) => setStartFrame(event.currentTarget.value)} />
      </label>
      <label className="audio-field" htmlFor={`audio-${role}-volume`}>Volume {audioRoleLabel[role].toLowerCase()} · {Math.round(volume * 100)}%
        <input id={`audio-${role}-volume`} type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => setVolume(event.currentTarget.valueAsNumber)} />
      </label>
      <button className="button secondary-button" type="submit" disabled={!valid || !changed}>Simpan pengaturan {audioRoleLabel[role].toLowerCase()}</button>
    </form>
  );
}

export function AudioPanel({ audio, projectId, disabled, durationInFrames, fps, onChange }: {
  audio: Audio;
  projectId?: string;
  disabled: boolean;
  durationInFrames: number;
  fps: number;
  onChange: () => void;
}) {
  if (!projectId) return <p className="panel-content helper">Buat atau buka proyek untuk menambahkan audio.</p>;
  if (audio.loading) return <p className="panel-content helper" role="status">Memuat audio lokal…</p>;

  return (
    <div className="panel-content">
      <p className="helper">MP3 atau WAV, maks. 25 MiB per slot. Frame mulai dihitung dari awal proyek. Audio berhenti di akhir proyek.</p>
      {audio.busy && <p role="status" className="helper">Memproses audio…</p>}
      {audio.error || audio.loadError ? <div className="notice error-notice">
        <p role="alert">{audio.error ?? audio.loadError}</p>
        <button type="button" className="button secondary-button" disabled={disabled} onClick={audio.reload}>Muat ulang audio</button>
      </div> : null}
      {!audio.loadError && audioRoles.map((role) => {
        const track = audio.tracks.find((item) => item.role === role);
        const label = audioRoleLabel[role];
        return (
          <fieldset className="audio-slot" disabled={disabled} key={role}>
            <legend>{label}</legend>
            {track ? <TrackSettings key={`${track.id}-${track.revision}`} track={track} audio={audio} durationInFrames={durationInFrames} fps={fps} onChange={onChange} />
              : <p className="helper">Belum ada file.</p>}
            <div className="audio-actions">
              <label className="button secondary-button audio-file">
                {track ? 'Ganti' : 'Pilih'} file {label.toLowerCase()}
                <input className="sr-only" type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" onChange={async (event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = '';
                  if (file && await audio.replace(role, file)) onChange();
                }} />
              </label>
              {track && <button className="button danger-button" type="button" onClick={async () => {
                if (await audio.remove(role)) onChange();
              }}>Hapus {label.toLowerCase()}</button>}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
