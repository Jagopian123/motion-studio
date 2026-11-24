import type { PlayerRef } from '@remotion/player';
import { Box, HardDrive, FolderOpen, Film } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { getClip } from '../engine/composition/clip';
import { AudioPanel } from '../features/audio/AudioPanel';
import { usePreviewAudio, useProjectAudio } from '../features/audio/useProjectAudio';
import { readDevice } from '../features/export/browser-renderer';
import { ExportPanel } from '../features/export/ExportPanel';
import { useVideoExport } from '../features/export/useVideoExport';
import { ProjectManager } from '../features/projects/ProjectManager';
import { useProjects } from '../features/projects/useProjects';
import { EditorPanel } from './EditorPanel';
import { ProjectPreview } from './ProjectPreview';
import { StoryInput } from './StoryInput';
import { useStudioUi } from './studio-ui';

const saveLabels = { idle: 'Demo bawaan', pending: 'Menunggu simpan', saving: 'Menyimpan…', saved: 'Tersimpan lokal', error: 'Belum tersimpan' };

export function App() {
  const [device] = useState(readDevice);
  const workspace = useProjects();
  const modal = useStudioUi((state) => state.modal);
  const player = useRef<PlayerRef>(null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [editorVersion, setEditorVersion] = useState(0);
  const { active, loading, busy, error, saveStatus } = workspace;
  const project = active?.document ?? null;
  const clip = useMemo(() => getClip(project), [project]);
  const audio = useProjectAudio(active?.id, clip.durationInFrames, workspace.flush);
  const previewAudio = usePreviewAudio(audio.tracks);
  const inputProps = useMemo(() => ({ project, audio: previewAudio }), [project, previewAudio]);
  const job = useVideoExport();
  const rendering = job.state.phase === 'rendering';
  const disabled = loading || busy || rendering || audio.busy;
  const unavailable = rendering ? 'Preview dijeda selama ekspor.'
    : loading ? 'Memuat proyek lokal…'
      : audio.loading ? 'Memuat audio lokal…'
        : !device.webgl2 ? 'WebGL2 diperlukan untuk membuka preview 3D.' : null;

  function showModal(next: 'projects' | 'export') {
    player.current?.pause();
    useStudioUi.setState({ modal: next });
  }

  function closeModal() { useStudioUi.setState({ modal: null }); }

  async function switchProject(operation: () => Promise<boolean>) {
    if (rendering || !await operation()) return false;
    job.reset();
    useStudioUi.setState({ tab: 'story', currentScene: null });
    setPreviewVersion((version) => version + 1);
    setEditorVersion((version) => version + 1);
    return true;
  }

  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner flex items-center justify-between gap-2">
          <div className="brand"><span className="brand-icon"><Box size={20} aria-hidden /></span><span>Motion Studio</span></div>
          <div className="header-actions flex gap-2">
            <button className="button secondary-button" type="button" disabled={disabled} onClick={() => showModal('projects')}><FolderOpen size={17} aria-hidden /> Proyek</button>
            <button className="button primary-button" type="button" disabled={disabled || audio.loading || Boolean(audio.loadError)} aria-label="Buka dialog ekspor" onClick={() => showModal('export')}><Film size={17} aria-hidden /> Ekspor</button>
          </div>
        </div>
      </header>
      <main className="shell workspace">
        <header className="workspace-heading">
          <div>
            <h1>{clip.title}</h1>
            <p className="helper workspace-metadata">{clip.ranges.length || 1} scene <span aria-hidden>·</span> {clip.fps} FPS <span aria-hidden>·</span> {(clip.durationInFrames / clip.fps).toLocaleString('id-ID', { maximumFractionDigits: 2 })} dtk</p>
          </div>
          <span className="local-tag" data-save={saveStatus} role="status"><HardDrive size={15} aria-hidden />{loading ? 'Memuat proyek…' : saveLabels[saveStatus]}</span>
        </header>
        {error && <div className="notice error-notice workspace-error">
          <p role="alert">{error}</p>
          {saveStatus === 'error' && <button type="button" className="button secondary-button" disabled={disabled} onClick={() => void workspace.flush()}>Coba simpan lagi</button>}
        </div>}
        <div className="workspace-grid">
          <ProjectPreview key={`${active?.id}-${previewVersion}`} unavailable={unavailable} clip={clip} inputProps={inputProps} player={player} />
          <EditorPanel clip={clip} player={player} unavailable={Boolean(unavailable)} audio={
            <AudioPanel audio={audio} projectId={active?.id} disabled={disabled} durationInFrames={clip.durationInFrames} fps={clip.fps} onChange={job.reset} />
          }>
            <StoryInput
              key={`${active?.id}-${editorVersion}`}
              initialDraft={active?.json ?? ''}
              disabled={disabled}
              imported={Boolean(active)}
              apply={(next, json) => {
                if (!job.reset() || !workspace.apply(next, json)) return false;
                useStudioUi.setState({ currentScene: null });
                setPreviewVersion((version) => version + 1);
                return true;
              }}
              showOrbit={() => void switchProject(() => workspace.open(null))}
            />
          </EditorPanel>
          <ExportPanel key={`${clip.aspectRatio}-${clip.fps}-${audio.tracks.length > 0}`} device={device} job={job} clip={clip} project={project} tracks={audio.tracks} open={modal === 'export'} onClose={closeModal} />
        </div>
      </main>
      {modal === 'projects' && <ProjectManager workspace={workspace} onClose={closeModal} onSwitch={switchProject} onRename={(title) => {
        if (!workspace.rename(title)) return false;
        job.reset();
        setEditorVersion((version) => version + 1);
        return true;
      }} />}
    </>
  );
}
