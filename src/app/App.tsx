import { Box, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { readDevice } from '../features/export/browser-renderer';
import { ExportPanel } from '../features/export/ExportPanel';
import { useDemoExport } from '../features/export/useDemoExport';
import { DemoPreview } from './DemoPreview';

export function App() {
  const [device] = useState(readDevice);
  const job = useDemoExport();
  const unavailable = job.state.phase === 'rendering'
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
            <h1>Orbit 01</h1>
            <p>Demo animasi robot 3D dengan kamera orbit.</p>
          </div>
          <span className="clip-info hidden sm:inline">5 detik <span aria-hidden> / </span> 30 FPS</span>
        </header>
        <div className="workspace-grid">
          <DemoPreview unavailable={unavailable} />
          <ExportPanel device={device} job={job} />
        </div>
      </main>
    </>
  );
}
