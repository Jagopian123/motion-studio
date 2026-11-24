import { ClipboardCopy } from 'lucide-react';
import { useEffect, useState } from 'react';

const guideUrl = `${import.meta.env.BASE_URL}ai-guide.md`;

export function CopyAiGuide() {
  const [guide, setGuide] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable' | 'copied' | 'manual'>('loading');

  useEffect(() => {
    const request = new AbortController();
    async function load() {
      try {
        const response = await fetch(guideUrl, { signal: request.signal });
        if (!response.ok) throw new Error('Panduan gagal dimuat.');
        const text = await response.text();
        if (request.signal.aborted) return;
        setGuide(text);
        setStatus('ready');
      } catch {
        if (!request.signal.aborted) setStatus('unavailable');
      }
    }
    void load();
    return () => request.abort();
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(guide);
      setStatus('copied');
    } catch {
      setStatus('manual');
    }
  }

  return (
    <div className="guide-control">
      <button type="button" className="button secondary-button" disabled={!guide} onClick={() => void copy()}><ClipboardCopy size={17} aria-hidden /> Copy AI Guide</button>
      {status === 'unavailable' && <p className="helper" role="status">Panduan gagal dimuat. Muat ulang halaman untuk mencoba lagi.</p>}
      {status === 'copied' && <p className="helper" role="status">Panduan disalin. Tempel di ChatGPT bersama brief cerita.</p>}
      {status === 'manual' && (
        <>
          <p className="helper" role="status">Clipboard tidak tersedia. Salin teks panduan di bawah ini.</p>
          <textarea aria-label="Panduan JSON v1" rows={6} value={guide} readOnly onFocus={(event) => event.currentTarget.select()} />
        </>
      )}
    </div>
  );
}
