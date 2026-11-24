import { Check, Download, Files, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { StudioDialog } from '../../app/StudioDialog';
import { downloadProjectJson } from './project-document';
import type { useProjects } from './useProjects';

export const localDataNote = 'Proyek tersimpan di browser ini dan bisa hilang saat data situs dihapus. Unduh JSON untuk cadangan. File JSON hanya berisi cerita, tanpa audio.';

export function ProjectManager({ workspace, onClose, onSwitch, onRename }: {
  workspace: ReturnType<typeof useProjects>;
  onClose: () => void;
  onSwitch: (operation: () => Promise<boolean>) => Promise<boolean>;
  onRename: (title: string) => boolean;
}) {
  const { active, projects, busy, error } = workspace;
  const [mode, setMode] = useState<'list' | 'rename' | 'delete'>('list');
  const [title, setTitle] = useState('');
  const [renameError, setRenameError] = useState('');
  const nameField = useRef<HTMLInputElement>(null);
  const cancelDelete = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mode === 'rename') nameField.current?.focus();
    if (mode === 'delete') cancelDelete.current?.focus();
  }, [mode]);

  async function switchAndClose(operation: () => Promise<boolean>) {
    if (await onSwitch(operation)) onClose();
  }

  const listing = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <StudioDialog title={mode === 'rename' ? 'Ganti nama proyek' : mode === 'delete' ? 'Hapus proyek?' : 'Proyek lokal'} onClose={onClose} locked={busy}>
      <div className="panel-content">
        {error && <p className="notice error-notice" role="alert">{error}</p>}
        {mode === 'list' && (
          <>
            <button className="button primary-button" type="button" disabled={busy} onClick={() => void switchAndClose(workspace.create)}><Plus size={18} aria-hidden /> Proyek baru</button>
            {listing.length > 0 ? (
              <ul className="project-list" aria-label="Proyek tersimpan">
                {listing.map((project) => (
                  <li key={project.id}>
                    <button className="button secondary-button project-row" type="button" aria-current={active?.id === project.id ? 'true' : undefined} disabled={busy} onClick={() => void switchAndClose(() => workspace.open(project.id))}>
                      {active?.id === project.id ? <Check size={17} aria-hidden /> : <FolderOpen size={17} aria-hidden />}
                      <span>{active?.id === project.id ? active.title : project.title}</span>
                      {active?.id === project.id && <small>Aktif</small>}
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="helper">Belum ada proyek tersimpan.</p>}
            {active && (
              <section className="project-actions grid grid-cols-2 gap-2" aria-label="Kelola proyek aktif">
                <button className="button secondary-button" type="button" disabled={busy} onClick={() => { setTitle(active.title); setRenameError(''); setMode('rename'); }}><Pencil size={16} aria-hidden /> Ganti nama</button>
                <button className="button secondary-button" type="button" disabled={busy} onClick={() => void switchAndClose(() => workspace.duplicate(active.id))}><Files size={16} aria-hidden /> Duplikat</button>
                <button className="button secondary-button" type="button" onClick={() => downloadProjectJson(active.title, active.json)}><Download size={16} aria-hidden /> Ekspor JSON</button>
                <button className="button danger-button" type="button" disabled={busy} onClick={() => setMode('delete')}><Trash2 size={16} aria-hidden /> Hapus</button>
              </section>
            )}
            <p className="helper">{localDataNote}</p>
          </>
        )}
        {mode === 'rename' && (
          <form className="grid gap-3" onSubmit={(event) => {
            event.preventDefault();
            try { if (onRename(title)) onClose(); }
            catch (failure) { setRenameError(failure instanceof Error ? failure.message : 'Nama proyek tidak valid.'); }
          }}>
            <label htmlFor="project-name">Nama proyek</label>
            <input ref={nameField} id="project-name" className="text-input" value={title} maxLength={100} required onChange={(event) => { setTitle(event.currentTarget.value); setRenameError(''); }} />
            {renameError && <p role="alert" className="notice error-notice">{renameError}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button className="button secondary-button" type="button" onClick={() => setMode('list')}>Kembali</button>
              <button className="button primary-button" type="submit" disabled={busy || !title.trim()}>Simpan nama</button>
            </div>
          </form>
        )}
        {mode === 'delete' && active && (
          <>
            <p>Hapus <strong>{active.title}</strong> dari penyimpanan browser? Penghapusan bersifat permanen.</p>
            <div className="grid grid-cols-2 gap-2">
              <button ref={cancelDelete} className="button secondary-button" type="button" disabled={busy} onClick={() => setMode('list')}>Batal</button>
              <button className="button danger-button" type="button" disabled={busy} onClick={() => void switchAndClose(() => workspace.remove(active.id))}>Hapus proyek</button>
            </div>
          </>
        )}
      </div>
    </StudioDialog>
  );
}
