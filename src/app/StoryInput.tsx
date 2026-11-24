import { ClipboardCopy, FileUp, LibraryBig } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MAX_STORY_BYTES, parseStory } from '../engine/schema/parse-story';
import type { StoryIssue } from '../engine/schema/semantic';
import type { ProjectDocument } from '../engine/schema/story-v1';
import { describeStoryIssue, readProjectFile } from '../features/projects/project-document';
import reference from '../../example-story.json?raw';
import isometric from '../examples/isometric-story.json?raw';
import primitive from '../examples/primitive-story.json?raw';
import { CopyAiGuide } from './CopyAiGuide';

type Props = {
  disabled: boolean;
  initialDraft: string;
  imported: boolean;
  apply: (project: ProjectDocument, json: string) => boolean;
  showOrbit: () => void;
};

const demos = [
  { label: 'Isi dengan Robot dan Kristal', duration: '15 dtk', json: reference },
  { label: 'Isi dengan Laboratorium Gerak', duration: '6 dtk', json: isometric },
  { label: 'Isi dengan demo JSON', duration: '6 dtk', json: primitive },
];
const visibleIssueLimit = 12;

export function StoryInput({ apply, disabled, initialDraft, imported, showOrbit }: Props) {
  const [draft, setDraft] = useState(initialDraft);
  const [issues, setIssues] = useState<StoryIssue[]>([]);
  const [applied, setApplied] = useState(false);
  const [copy, setCopy] = useState<'copied' | 'manual' | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const demoList = useRef<HTMLDetailsElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const fileRead = useRef(0);
  const tooLarge = [{ path: [], message: 'Ukuran JSON maksimal 1 MiB (UTF-8).' }];
  const errorText = issues.map(describeStoryIssue).join('\n');

  useEffect(() => {
    const current = fileRead;
    return () => { current.current += 1; };
  }, []);

  function edit(value: string) {
    fileRead.current += 1;
    setApplied(false);
    setCopy(null);
    if (value.length > MAX_STORY_BYTES) {
      setIssues(tooLarge);
      return;
    }
    setDraft(value);
    setIssues([]);
  }

  function validate(json: string) {
    setCopy(null);
    const result = parseStory(json);
    if (!result.ok) {
      setIssues(result.issues);
      setApplied(false);
    } else if (apply(result.project, json)) {
      setIssues([]);
      setApplied(true);
    }
  }

  async function importFile(file: File) {
    const request = ++fileRead.current;
    try {
      const json = await readProjectFile(file);
      if (request !== fileRead.current) return;
      setDraft(json);
      validate(json);
    } catch (failure) {
      if (request !== fileRead.current) return;
      setApplied(false);
      setCopy(null);
      setIssues([{ path: [], message: failure instanceof Error ? failure.message : 'File JSON tidak dapat dibaca.' }]);
    }
  }

  async function copyErrors() {
    try {
      await navigator.clipboard.writeText(errorText);
      setCopy('copied');
    } catch {
      setCopy('manual');
    }
  }

  return (
    <div className="story-input">
      <form className="panel-content" onSubmit={(event) => { event.preventDefault(); fileRead.current += 1; validate(draft); }}>
        <div className="editor-label flex items-center justify-between gap-2">
          <label htmlFor="story-json">JSON cerita</label>
          <span className="technical-tag">v1 · maks. 1 MiB</span>
        </div>
        <textarea
          id="story-json"
          ref={editor}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          value={draft}
          placeholder="Tempel JSON dari ChatGPT…"
          aria-invalid={issues.length > 0}
          aria-describedby={issues.length > 0 ? 'story-errors' : undefined}
          onChange={(event) => edit(event.currentTarget.value)}
          rows={10}
        />
        <div className="editor-actions grid grid-cols-2 gap-2">
          <button type="button" className="button secondary-button" disabled={disabled} onClick={() => fileInput.current?.click()}><FileUp size={16} aria-hidden /> Impor file</button>
          <button type="submit" className="button primary-button" disabled={disabled}>Terapkan JSON</button>
          <input ref={fileInput} type="file" accept=".json,application/json" aria-label="File JSON" hidden onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void importFile(file);
          }} />
        </div>
        {applied && <p className="helper" role="status">Cerita diterapkan ke preview dan ekspor.</p>}
        {issues.length > 0 && (
          <div id="story-errors" className="notice error-notice">
            <div role="alert">
              <strong>Impor gagal. Proyek aktif tetap tersedia.</strong>
              <ul>{issues.slice(0, visibleIssueLimit).map((issue, index) => <li key={index}>{describeStoryIssue(issue)}</li>)}</ul>
              {issues.length > visibleIssueLimit && <p>Masih ada {issues.length - visibleIssueLimit} kesalahan lain. Salin untuk melihat semuanya.</p>}
            </div>
            <button type="button" className="button secondary-button" onClick={() => void copyErrors()}><ClipboardCopy size={16} aria-hidden /> Salin kesalahan</button>
            {copy === 'copied' && <p role="status">Kesalahan disalin.</p>}
            {copy === 'manual' && <>
              <p role="status">Clipboard tidak tersedia. Salin teks kesalahan di bawah ini.</p>
              <textarea aria-label="Teks kesalahan JSON" rows={5} value={errorText} readOnly onFocus={(event) => event.currentTarget.select()} />
            </>}
          </div>
        )}
      </form>
      <div className="story-resources">
        <CopyAiGuide />
        <details ref={demoList} className="demo-list">
          <summary><LibraryBig size={17} aria-hidden /> Muat demo</summary>
          <div className="grid gap-2 pt-2">
            {demos.map(({ label, duration, json }) => (
              <button key={label} type="button" className="button secondary-button demo-choice" disabled={disabled} onClick={() => {
                edit(json);
                if (demoList.current) demoList.current.open = false;
                editor.current?.focus();
              }}>{label}<span className="mono">{duration}</span></button>
            ))}
            {imported && <button type="button" className="button secondary-button" disabled={disabled} onClick={showOrbit}>Gunakan Orbit 01</button>}
          </div>
        </details>
      </div>
    </div>
  );
}
