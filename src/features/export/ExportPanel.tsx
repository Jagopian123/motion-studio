import { Download, Info, MonitorCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { StudioDialog } from '../../app/StudioDialog';
import type { Clip } from '../../engine/composition/clip';
import type { StoryCompositionProps } from '../../engine/composition/StoryComposition';
import { validAudioSettings, type LocalAudioTrack } from '../audio/audio-track';
import { checkPreset, type Device } from './browser-renderer';
import { getPresets, type EncoderPreference, type Preset, type PresetSupport } from './settings';
import type { useVideoExport } from './useVideoExport';

type Support = Partial<Record<Preset['id'], { video: PresetSupport; withAudio?: PresetSupport }>>;

function SupportBadge({ value }: { value: boolean | undefined }) {
  if (value === undefined) return <span className="status-tag">Memeriksa</span>;
  return <span className={`status-tag ${value ? 'status-ok' : 'status-fail'}`}>{value ? 'Tersedia' : 'Tidak tersedia'}</span>;
}

function encoderLabel(encoder: EncoderPreference) {
  return encoder === 'prefer-hardware' ? 'Prioritas perangkat keras' : 'Pilihan browser';
}

export function ExportPanel({ device, job, clip, project, tracks, open, onClose }: {
  device: Device;
  job: ReturnType<typeof useVideoExport>;
  clip: Clip;
  project: StoryCompositionProps['project'];
  tracks: LocalAudioTrack[];
  open: boolean;
  onClose: () => void;
}) {
  const { aspectRatio, durationInFrames, fps } = clip;
  const presets = useMemo(() => getPresets(aspectRatio), [aspectRatio]);
  const [support, setSupport] = useState<Support | null>(null);
  const [selection, setSelection] = useState<Preset['id']>('720p');
  const [silentFor, setSilentFor] = useState<string | null>(null);
  const { state, start, cancel } = job;
  const rendering = state.phase === 'rendering';
  const hasAudio = tracks.length > 0;
  const audioKey = tracks.map(({ id, revision }) => `${id}-${revision}`).join('-');
  const silent = silentFor === audioKey;
  const withAudio = hasAudio && !silent;
  const audioOutsideProject = withAudio && tracks.some((track) => !validAudioSettings(track, durationInFrames));

  useEffect(() => {
    let mounted = true;
    async function check() {
      // Probe sequentially to avoid competing for a limited mobile encoder.
      const results: Support = {};
      for (const preset of presets) {
        const video = await checkPreset(device, preset, fps);
        if (!mounted) return;
        const withAudio = hasAudio && video.supported ? await checkPreset(device, preset, fps, true, video) : undefined;
        if (!mounted) return;
        results[preset.id] = { video, withAudio };
      }
      setSupport(results);
    }
    void check();
    return () => { mounted = false; };
  }, [device, presets, fps, hasAudio]);

  const capabilityFor = (id: Preset['id']) => withAudio ? support?.[id]?.withAudio ?? support?.[id]?.video : support?.[id]?.video;
  const preferred = presets.find((preset) => preset.id === selection) ?? presets[0];
  const fallback = capabilityFor(preferred.id)?.supported === false
    ? presets.find((preset) => preset.videoBitrate < preferred.videoBitrate && capabilityFor(preset.id)?.supported)
    : undefined;
  const selected = fallback ?? preferred;
  const capability = capabilityFor(selected.id);
  const retry = state.phase === 'cancelled' || state.phase === 'error';

  return (
    <aside className="inspector" aria-label="Detail proyek dan perangkat">
      {open && <StudioDialog title="Ekspor video" locked={rendering} onClose={onClose}>
        <div className="panel-content">
          <div className="export-intro flex items-start justify-between gap-2"><p className="helper">{clip.title}</p><span className="technical-tag">MP4 / H.264</span></div>
          <fieldset disabled={rendering} className="presets">
            <legend>Resolusi</legend>
            <div className="preset-grid">
              {presets.map((preset) => (
                <label className="preset" key={preset.id}>
                  <input
                    type="radio"
                    name="resolution"
                    value={preset.id}
                    checked={selected.id === preset.id}
                    disabled={capabilityFor(preset.id)?.supported === false}
                    onChange={() => setSelection(preset.id)}
                  />
                  <span><strong>{preset.id}</strong><small>{preset.width} × {preset.height}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="export-spec"><span>{fps} FPS</span><span>{durationInFrames} frame</span><span>{withAudio ? `AAC · ${tracks.length} track sumber` : 'Tanpa audio'}</span></div>
          {hasAudio && <label className="silent-option">
            <input type="checkbox" checked={silent} disabled={rendering} onChange={(event) => setSilentFor(event.currentTarget.checked ? audioKey : null)} />
            Ekspor tanpa audio
          </label>}
          {audioOutsideProject && <p className="notice" role="status">Ada track yang mulai di luar durasi proyek. Ubah frame mulai di tab Audio atau pilih Ekspor tanpa audio.</p>}
          {fallback && <p className="helper">{preferred.id} tidak tersedia. {fallback.id} dipilih otomatis.</p>}
          {capability?.supported && !rendering && <p className="helper">{encoderLabel(capability.encoder)} · {(selected.videoBitrate / 1_000_000).toLocaleString('id-ID')} Mbps</p>}
          {rendering ? (
            <div className="render-progress">
              <div className="progress-label" role="status">
                <span>{state.cancelling ? 'Membatalkan…' : state.progress === 0 ? 'Menyiapkan render…' : 'Mengekspor…'}</span>
                <span>{Math.floor(state.progress * 100)}%</span>
              </div>
              <progress aria-label="Progres ekspor" value={state.progress} max={1} />
              <p className="helper">{Math.min(state.frames, durationInFrames)} / {durationInFrames} frame · {state.fallback ? 'Fallback encoder browser' : encoderLabel(state.encoder)}</p>
              <p className="helper">Berjalan {(state.elapsed / 1000).toFixed(1)} dtk{state.eta !== null && !state.cancelling ? ` · Perkiraan sisa ${Math.ceil(state.eta / 1000)} dtk` : ''}</p>
              <button type="button" className="button secondary-button" disabled={state.cancelling} onClick={cancel}>Batalkan</button>
            </div>
          ) : (
            <>
              {state.phase === 'error' && <div role="alert" className="notice error-notice"><p>{state.help}</p><small>{state.detail}</small></div>}
              {state.phase === 'cancelled' && <p role="status" className="notice">Ekspor dibatalkan. Anda bisa mencoba lagi.</p>}
              {state.phase === 'done' && (
                <div className="notice result-notice" role="status">
                  <strong>MP4 siap diunduh</strong>
                  <p>{state.preset.width} × {state.preset.height} · {state.frames} frame · {(state.fileSize / 1024).toFixed(0)} KiB · {(state.elapsed / 1000).toFixed(1)} dtk render</p>
                  <p>{state.withAudio ? 'AAC' : 'Tanpa audio'} · {state.fallback ? 'Fallback encoder browser' : encoderLabel(state.encoder)}</p>
                </div>
              )}
              {state.phase === 'done' && (
                <a className="button primary-button" href={state.url} download={`motion-studio-${clip.id}-${state.preset.id}.mp4`}><Download size={17} aria-hidden /> Unduh MP4</a>
              )}
              <button
                type="button"
                className={`button ${state.phase === 'done' ? 'secondary-button' : 'primary-button'}`}
                disabled={!capability?.supported || audioOutsideProject}
                onClick={() => { if (capability?.supported && !audioOutsideProject) void start(project, withAudio ? tracks : [], selected, capability.encoder); }}
              >
                <Download size={17} aria-hidden /> {retry ? 'Coba lagi' : state.phase === 'done' ? 'Ekspor ulang' : 'Ekspor MP4'}
              </button>
              {!capability && <p className="helper" role="status">Memeriksa konfigurasi ekspor…</p>}
              {capability?.supported === false && <p role="status" className="helper">{capability.detail} Buka di Chrome terbaru melalui HTTPS atau localhost.</p>}
            </>
          )}
          <p className="foreground-note"><Info size={16} aria-hidden /> Biarkan tab aktif dan layar menyala selama ekspor. Jika perangkat panas, jeda antar-ekspor atau gunakan 540p.</p>
        </div>
      </StudioDialog>}
      <section className="panel" aria-labelledby="detail-title">
        <header className="panel-heading"><h2 id="detail-title">Detail proyek</h2></header>
        <dl className="diagnostics-list">
          <div><dt>Durasi</dt><dd>{(durationInFrames / fps).toFixed(2)} dtk</dd></div>
          <div><dt>Frame rate</dt><dd>{fps} FPS</dd></div>
          <div><dt>Total frame</dt><dd>{durationInFrames}</dd></div>
          <div><dt>Rasio</dt><dd>{aspectRatio}</dd></div>
        </dl>
      </section>
      <section className="panel diagnostics-panel" aria-labelledby="diagnostics-title">
        <header className="panel-heading">
          <div className="heading-with-icon"><MonitorCheck size={18} aria-hidden /><h2 id="diagnostics-title">Diagnostik perangkat</h2></div>
        </header>
        <dl className="diagnostics-list">
          <div><dt>Konteks aman</dt><dd><SupportBadge value={device.secureContext} /></dd></div>
          <div><dt>WebGL2</dt><dd><SupportBadge value={device.webgl2} /></dd></div>
          <div><dt>WebCodecs</dt><dd><SupportBadge value={device.videoEncoder} /></dd></div>
          {presets.map(({ id }) => <div key={id}><dt>H.264 {id}{fps}</dt><dd><SupportBadge value={support?.[id]?.video.supported} /></dd></div>)}
          {hasAudio && <div><dt>H.264 + AAC MP4</dt><dd><SupportBadge value={support ? Object.values(support).some((item) => item?.withAudio?.supported) : undefined} /></dd></div>}
        </dl>
      </section>
      {state.phase === 'done' && <section className="panel" aria-labelledby="render-diagnostics-title">
        <header className="panel-heading"><h2 id="render-diagnostics-title">Hasil render terakhir</h2></header>
        <dl className="diagnostics-list">
          <div><dt>Output</dt><dd>{state.preset.width} × {state.preset.height} · {state.withAudio ? 'H.264/AAC' : 'H.264'}</dd></div>
          <div><dt>Waktu render</dt><dd>{(state.elapsed / 1000).toFixed(2)} dtk</dd></div>
          <div><dt>Throughput</dt><dd>{(state.frames * 1000 / state.elapsed).toFixed(1)} frame/dtk</dd></div>
          <div><dt>Ukuran</dt><dd>{(state.fileSize / 1024 / 1024).toFixed(2)} MiB</dd></div>
          <div><dt>Preferensi encoder</dt><dd>{encoderLabel(state.encoder)}</dd></div>
        </dl>
      </section>}
    </aside>
  );
}
