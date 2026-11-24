import { Box, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getClip } from '../engine/composition/clip';
import type { ProjectDocument } from '../engine/schema/story-v1';
import { readDevice } from '../features/export/browser-renderer';
import { ExportPanel } from '../features/export/ExportPanel';
import { useVideoExport } from '../features/export/useVideoExport';
import { ProjectPreview } from './ProjectPreview';
import { StoryInput } from './StoryInput';

export function App() {
  const [device] = useState(readDevice);
  const [{ project, revision }, setActive] = useState<{ project: ProjectDocument | null; revision: number }>({ project: null, revision: 0 });
  const inputProps = useMemo(() => ({ project }), [project]);
  const clip = useMemo(() => getClip(project), [project]);
  const job = useVideoExport(inputProps);
  const rendering = job.state.phase === 'rendering';
  const unavailable = rendering
    ? 'Preview dijeda selama ekspor.'
    : !device.webgl2 ? 'WebGL2 diperlukan untuk membuka preview 3D.' : null;

  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <div className="brand"><span className="brand-icon"><Box size={21} aria-hidden /></span><span>Motion Studio</span></div>
          <span className="local-tag"><ShieldCheck size={15} aria-hidden /> Render lokal</span>
        </div>
      </header>
      <main className="shell workspace">
        <header className="workspace-heading">
          <div>
            <h1>{clip.title}</h1>
            <p>{project ? `${clip.ranges.length} scene` : 'Demo animasi robot 3D dengan kamera orbit.'}</p>
          </div>
          <span className="clip-info hidden sm:inline">{(clip.durationInFrames / clip.fps).toLocaleString('id-ID', { maximumFractionDigits: 2 })} detik <span aria-hidden> / </span> {clip.fps} FPS</span>
        </header>
        <div className="workspace-grid">
          <ProjectPreview key={revision} unavailable={unavailable} clip={clip} inputProps={inputProps} />
          <ExportPanel key={`${clip.aspectRatio}-${clip.fps}`} device={device} job={job} clip={clip} />
        </div>
        <StoryInput disabled={rendering} imported={Boolean(project)} apply={(next) => {
          if (!job.reset()) return false;
          setActive((current) => ({ project: next, revision: current.revision + 1 }));
          return true;
        }} />
      </main>
    </>
  );
}
