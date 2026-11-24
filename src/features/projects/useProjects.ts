import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProjectDocument } from '../../engine/schema/story-v1';
import { newProjectJson, readProjectJson, renameProjectJson } from './project-document';
import {
  createLocalProject, deleteProject, duplicateProject, openProject, projectSummary, readWorkspace, restoreProject,
  saveProject, storageErrorMessage, type LocalProject, type ProjectSummary,
} from './project-storage';

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export function useProjects() {
  const [active, setActive] = useState<LocalProject | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState('');
  const latest = useRef<LocalProject | null>(null);
  const pending = useRef<LocalProject | null>(null);
  const saving = useRef<Promise<boolean> | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const changing = useRef(false);

  function activate(project: LocalProject | null) {
    latest.current = project;
    setActive(project);
  }

  useEffect(() => {
    let mounted = true;
    void readWorkspace().then(({ projects, selected }) => {
      if (!mounted) return;
      setProjects(projects);
      if (selected) {
        activate(restoreProject(selected));
        setSaveStatus('saved');
      }
    }).catch((failure: unknown) => {
      if (mounted) setError(storageErrorMessage(failure));
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const remember = useCallback((project: LocalProject) => {
    setProjects((items) => [projectSummary(project), ...items.filter(({ id }) => id !== project.id)]);
  }, []);

  const flush = useCallback((): Promise<boolean> => {
    window.clearTimeout(timer.current);
    if (saving.current) return saving.current;
    if (!pending.current) return Promise.resolve(true);
    const write = async () => {
      setSaveStatus('saving');
      try {
        while (pending.current) {
          const snapshot = pending.current;
          const revision = await saveProject(snapshot);
          remember(snapshot);
          if (pending.current === snapshot) pending.current = null;
          else pending.current = { ...pending.current, revision };
          activate(pending.current ?? { ...snapshot, revision });
        }
        setSaveStatus('saved');
        setError('');
        return true;
      } catch (failure) {
        setSaveStatus('error');
        setError(storageErrorMessage(failure));
        return false;
      }
    };
    saving.current = write().finally(() => { saving.current = null; });
    return saving.current;
  }, [remember]);

  useEffect(() => {
    function onHidden() {
      if (pending.current && document.visibilityState === 'hidden') void flush();
    }
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.clearTimeout(timer.current);
    };
  }, [flush]);

  useEffect(() => {
    if (saveStatus !== 'pending' && saveStatus !== 'saving' && saveStatus !== 'error') return;
    function warn(event: BeforeUnloadEvent) {
      if (!pending.current) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveStatus]);

  function stage(project: LocalProject) {
    pending.current = project;
    activate(project);
    setError('');
    setSaveStatus(saving.current ? 'saving' : 'pending');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 650);
  }

  function apply(document: ProjectDocument, json: string) {
    if (loading || changing.current) return false;
    const current = latest.current;
    stage(current ? { ...current, document, json, title: document.title, updatedAt: Date.now() } : createLocalProject(document, json));
    return true;
  }

  function rename(title: string) {
    const current = latest.current;
    if (!current) return false;
    const { document, json } = renameProjectJson(current.json, title);
    return apply(document, json);
  }

  async function change(operation: () => Promise<void>, deletingActive = false) {
    if (loading || changing.current) return false;
    changing.current = true;
    setBusy(true);
    try {
      if (!await flush() && !deletingActive) return false;
      await operation();
      setError('');
      return true;
    } catch (failure) {
      setError(storageErrorMessage(failure));
      return false;
    } finally {
      changing.current = false;
      setBusy(false);
    }
  }

  return {
    active, projects, loading, busy, saveStatus, error, flush, apply, rename,
    create: () => change(async () => {
      const { document, json } = readProjectJson(newProjectJson);
      stage(createLocalProject(document, json));
    }),
    open: (id: string | null) => change(async () => {
      activate(await openProject(id));
      setSaveStatus(id ? 'saved' : 'idle');
    }),
    duplicate: (id: string) => change(async () => {
      const copy = await duplicateProject(id);
      remember(copy);
      activate(copy);
      setSaveStatus('saved');
    }),
    remove: (id: string) => change(async () => {
      await deleteProject(id);
      setProjects((items) => items.filter((project) => project.id !== id));
      if (latest.current?.id === id) {
        pending.current = null;
        activate(null);
        setSaveStatus('idle');
      }
    }, latest.current?.id === id),
  };
}
