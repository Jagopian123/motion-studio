import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

export function StudioDialog({ title, children, locked = false, onClose }: {
  title: string;
  children: ReactNode;
  locked?: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      if (!dialog.open) return;
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="studio-dialog"
      aria-labelledby="dialog-title"
      onClose={onClose}
      onCancel={(event) => { if (locked) event.preventDefault(); }}
    >
      <header className="panel-heading">
        <h2 id="dialog-title">{title}</h2>
        <button type="button" className="icon-button" aria-label="Tutup dialog" disabled={locked} onClick={() => ref.current?.close()}><X size={20} aria-hidden /></button>
      </header>
      {children}
    </dialog>
  );
}
