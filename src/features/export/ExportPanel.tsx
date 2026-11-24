import { Download, Film, Info, MonitorCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Clip } from '../../engine/composition/clip';
import { checkPreset, type Device } from './browser-renderer';
import { getPresets, type EncoderPreference, type Preset, type PresetSupport } from './settings';
import type { useVideoExport } from './useVideoExport';

type Support = Record<Preset['id'], PresetSupport>;

function SupportBadge({ value }: { value: boolean | undefined }) {
  if (value === undefined) return <span className="status-tag">Memeriksa</span>;
  return <span className={`status-tag ${value ? 'status-ok' : 'status-fail'}`}>{value ? 'Tersedia' : 'Tidak tersedia'}</span>;
}

function encoderLabel(encoder: EncoderPreference) {
  return encoder === 'prefer-hardware' ? 'Prioritas perangkat keras' : 'Pilihan browser';
}

export function ExportPanel({ device, job, clip }: { device: Device; job: ReturnType<typeof useVideoExport>; clip: Clip }) {
  const { aspectRatio, durationInFrames, fps } = clip;
  const presets = useMemo(() => getPresets(aspectRatio), [aspectRatio]);
  const [mainPreset, fallbackPreset] = presets;
  const [support, setSupport] = useState<Support | null>(null);
  const [selection, setSelection] = useState<Preset['id']>('720p');
  const { state, start, cancel } = job;
  const rendering = state.phase === 'rendering';

  useEffect(() => {
    let mounted = true;
    async function check() {
      // Probe sequentially to avoid competing for a limited mobile encoder.
      const main = await checkPreset(device, mainPreset, fps);
      if (!mounted) return;
      const fallback = await checkPreset(device, fallbackPreset, fps);
      if (mounted) setSupport({ '720p': main, '540p': fallback });
    }
    void check();
    return () => { mounted = false; };
  }, [device, mainPreset, fallbackPreset, fps]);

  const autoFallback = support && !support[mainPreset.id].supported && support[fallbackPreset.id].supported;
  const selected = selection === fallbackPreset.id || autoFallback ? fallbackPreset : mainPreset;
  const capability = support?.[selected.id];
  const retry = state.phase === 'cancelled' || state.phase === 'error';

  return (
    <aside className="side-panels" aria-label="Ekspor dan diagnostik">
      <section className="panel export-panel" aria-labelledby="export-title">
        <header className="panel-heading">
          <div className="heading-with-icon"><Film size={18} aria-hidden /><h2 id="export-title">Ekspor video</h2></div>
          <span className="technical-tag">MP4 / H.264</span>
        </header>
        <div className="panel-content">
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
                    disabled={support?.[preset.id].supported === false}
                    onChange={() => setSelection(preset.id)}
                  />
                  <span><strong>{preset.id}</strong><small>{preset.width} × {preset.height}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="export-spec"><span>{fps} FPS</span><span>{durationInFrames} frame</span><span>Tanpa audio</span></div>
          {autoFallback && <p className="helper">720p tidak tersedia. 540p dipilih otomatis.</p>}
          {capability?.supported && !rendering && state.phase !== 'done' && <p className="helper">Encoder · {encoderLabel(capability.encoder)}</p>}
          {rendering ? (
            <div className="render-progress">
              <div className="progress-label" role="status">
                <span>{state.cancelling ? 'Membatalkan…' : state.progress === 0 ? 'Menyiapkan render…' : 'Mengekspor…'}</span>
                <span>{Math.floor(state.progress * 100)}%</span>
              </div>
              <progress aria-label="Progres ekspor" value={state.progress} max={1} />
              <p className="helper">{Math.min(state.frames, durationInFrames)} / {durationInFrames} frame · {state.fallback ? 'Fallback encoder browser' : encoderLabel(state.encoder)}</p>
              <button type="button" className="button secondary-button" disabled={state.cancelling} onClick={cancel}>Batalkan</button>
            </div>
          ) : (
            <>
              {state.phase === 'error' && <div role="alert" className="notice error-notice"><p>{state.help}</p><small>{state.detail}</small></div>}
              {state.phase === 'cancelled' && <p role="status" className="notice">Ekspor dibatalkan. Anda bisa mencoba lagi.</p>}
              {state.phase === 'done' && (
                <div className="notice result-notice" role="status">
                  <strong>MP4 siap diunduh</strong>
                  <p>{state.preset.width} × {state.preset.height} · {durationInFrames} frame · {(state.fileSize / 1024).toFixed(0)} KiB · {(state.elapsed / 1000).toFixed(1)} dtk render</p>
                  <p>{state.fallback ? 'Fallback encoder browser' : encoderLabel(state.encoder)}</p>
                </div>
              )}
              {state.phase === 'done' && (
                <a className="button primary-button" href={state.url} download={`motion-studio-${clip.id}-${state.preset.id}.mp4`}><Download size={17} aria-hidden /> Unduh MP4</a>
              )}
              <button
                type="button"
                className={`button ${state.phase === 'done' ? 'secondary-button' : 'primary-button'}`}
                disabled={!capability?.supported}
                onClick={() => { if (capability?.supported) void start(selected, capability.encoder); }}
              >
                <Film size={17} aria-hidden /> {retry ? 'Coba lagi' : state.phase === 'done' ? 'Ekspor ulang' : 'Ekspor MP4'}
              </button>
              {capability?.supported === false && <p role="status" className="helper">{capability.detail} Buka di Chrome terbaru melalui HTTPS atau localhost.</p>}
            </>
          )}
          <p className="foreground-note"><Info size={16} aria-hidden /> Biarkan tab aktif dan layar menyala selama ekspor.</p>
        </div>
      </section>
      <section className="panel diagnostics-panel" aria-labelledby="diagnostics-title">
        <header className="panel-heading">
          <div className="heading-with-icon"><MonitorCheck size={18} aria-hidden /><h2 id="diagnostics-title">Diagnostik perangkat</h2></div>
        </header>
        <dl className="diagnostics-list">
          <div><dt>Konteks aman</dt><dd><SupportBadge value={device.secureContext} /></dd></div>
          <div><dt>WebGL2</dt><dd><SupportBadge value={device.webgl2} /></dd></div>
          <div><dt>WebCodecs</dt><dd><SupportBadge value={device.videoEncoder} /></dd></div>
          <div><dt>H.264 720p{fps}</dt><dd><SupportBadge value={support?.[mainPreset.id].supported} /></dd></div>
          <div><dt>H.264 540p{fps}</dt><dd><SupportBadge value={support?.[fallbackPreset.id].supported} /></dd></div>
        </dl>
      </section>
    </aside>
  );
}
