import { useState } from 'react';
import { formatStoryPath, parseStory } from '../engine/schema/parse-story';
import type { StoryIssue } from '../engine/schema/semantic';
import type { ProjectDocument } from '../engine/schema/story-v1';
import example from '../examples/primitive-story.json?raw';

type Props = {
  disabled: boolean;
  imported: boolean;
  apply: (project: ProjectDocument | null) => boolean;
};

const visibleIssueLimit = 12;

export function StoryInput({ apply, disabled, imported }: Props) {
  const [draft, setDraft] = useState('');
  const [issues, setIssues] = useState<StoryIssue[]>([]);
  const [applied, setApplied] = useState(false);

  return (
    <section className="panel story-input" aria-labelledby="story-input-title">
      <header className="panel-heading">
        <h2 id="story-input-title">Impor cerita JSON v1</h2>
      </header>
      <form className="panel-content" onSubmit={(event) => {
        event.preventDefault();
        const result = parseStory(draft);
        if (!result.ok) {
          setIssues(result.issues);
          setApplied(false);
        } else if (apply(result.project)) {
          setIssues([]);
          setApplied(true);
        }
      }}>
        <label htmlFor="story-json">JSON cerita</label>
        <textarea
          id="story-json"
          disabled={disabled}
          spellCheck={false}
          value={draft}
          aria-invalid={issues.length > 0}
          aria-describedby={issues.length > 0 ? 'story-errors' : undefined}
          onChange={(event) => { setDraft(event.currentTarget.value); setIssues([]); setApplied(false); }}
          rows={8}
        />
        <div className="story-actions">
          <button type="submit" className="button primary-button" disabled={disabled}>Terapkan JSON</button>
          <button type="button" className="button secondary-button" disabled={disabled} onClick={() => {
            setDraft(example);
            setIssues([]);
            setApplied(false);
          }}>Isi dengan demo JSON</button>
          {imported && (
            <button type="button" className="button secondary-button" disabled={disabled} onClick={() => {
              if (apply(null)) setApplied(false);
            }}>Gunakan Orbit 01</button>
          )}
        </div>
        {applied && <p className="helper" role="status">Cerita diterapkan ke preview dan ekspor.</p>}
        {issues.length > 0 && (
          <div id="story-errors" className="notice error-notice" role="alert">
            <strong>Impor gagal. Proyek aktif tetap tersedia.</strong>
            <ul>
              {issues.slice(0, visibleIssueLimit).map((issue, index) => (
                <li key={index}><code>{formatStoryPath(issue.path)}</code> · {issue.message}</li>
              ))}
            </ul>
            {issues.length > visibleIssueLimit && <p>Masih ada {issues.length - visibleIssueLimit} kesalahan lain.</p>}
          </div>
        )}
      </form>
    </section>
  );
}
