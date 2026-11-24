import Dexie, { type Table } from 'dexie';
import type { ProjectDocument } from '../../engine/schema/story-v1';
import type { AudioRole, LocalAudioTrack } from '../audio/audio-track';
import { readProjectJson, renameProjectJson } from './project-document';

export type ProjectSummary = { id: string; title: string; createdAt: number; updatedAt: number };
// Store the validated source so default normalization cannot increase the exported JSON past 1 MiB.
type ProjectRecord = ProjectSummary & { json: string; revision: number | null };
export type LocalProject = ProjectRecord & { document: ProjectDocument };
type WorkspaceSetting = { key: 'activeProject'; projectId: string | null };

class ProjectDatabase extends Dexie {
  projects!: Table<ProjectRecord, string>;
  audioAssets!: Table<LocalAudioTrack, [string, AudioRole]>;
  settings!: Table<WorkspaceSetting, WorkspaceSetting['key']>;

  constructor() {
    super('motion-studio');
    this.version(1).stores({ projects: 'id', audioAssets: '[projectId+role], projectId', settings: 'key' });
  }
}

const db = new ProjectDatabase();
const selectProject = (projectId: string | null) => db.settings.put({ key: 'activeProject', projectId });

export function projectSummary({ id, title, createdAt, updatedAt }: ProjectSummary): ProjectSummary {
  return { id, title, createdAt, updatedAt };
}

export function createLocalProject(document: ProjectDocument, json: string): LocalProject {
  const id = crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const now = Date.now();
  return { id, title: document.title, document, json, createdAt: now, updatedAt: now, revision: null };
}

export function restoreProject(record: ProjectRecord): LocalProject {
  const { document } = readProjectJson(record.json);
  return { ...record, title: document.title, document };
}

export function readWorkspace() {
  return db.transaction('r', db.projects, db.settings, async () => {
    const records = await db.projects.toArray();
    const selected = await db.settings.get('activeProject');
    return { projects: records.map(projectSummary), selected: records.find(({ id }) => id === selected?.projectId) };
  });
}

export function openProject(id: string | null) {
  return db.transaction('rw', db.projects, db.settings, async () => {
    if (id === null) {
      await selectProject(null);
      return null;
    }
    const record = await db.projects.get(id);
    if (!record) throw new Error('Proyek ini sudah dihapus. Muat ulang halaman.');
    const project = restoreProject(record);
    await selectProject(id);
    return project;
  });
}

export function saveProject(project: LocalProject) {
  return db.transaction('rw', db.projects, db.settings, async () => {
    const current = await db.projects.get(project.id);
    if ((current?.revision ?? null) !== project.revision) {
      throw new Error('Proyek berubah di tab lain. Ekspor JSON perubahan Anda, lalu muat ulang halaman.');
    }
    const revision = (project.revision ?? 0) + 1;
    await db.projects.put({ ...projectSummary(project), json: project.json, revision });
    if (project.revision === null) await selectProject(project.id);
    return revision;
  });
}

export function readProjectAudio(projectId: string) {
  return db.audioAssets.where('projectId').equals(projectId).toArray();
}

export function writeProjectAudio(projectId: string, role: AudioRole, previous: LocalAudioTrack | undefined, next: LocalAudioTrack | null) {
  return db.transaction('rw', db.projects, db.audioAssets, async () => {
    if (!await db.projects.get(projectId)) throw new Error('Proyek ini sudah dihapus. Muat ulang halaman.');
    const key: [string, AudioRole] = [projectId, role];
    const stored = await db.audioAssets.get(key);
    if (stored?.id !== previous?.id || stored?.revision !== previous?.revision) {
      throw new Error('Track berubah di tab lain. Muat ulang audio proyek sebelum mengedit lagi.');
    }
    if (next) await db.audioAssets.put(next);
    else await db.audioAssets.delete(key);
  });
}

export function duplicateProject(id: string) {
  return db.transaction('rw', db.projects, db.audioAssets, db.settings, async () => {
    const source = await db.projects.get(id);
    if (!source) throw new Error('Proyek sumber sudah dihapus. Muat ulang halaman.');
    const { document, json } = renameProjectJson(source.json, `${source.title.slice(0, 89)} (salinan)`);
    const copy = { ...createLocalProject(document, json), revision: 1 };
    await db.projects.add({ ...projectSummary(copy), json, revision: copy.revision });
    const assets = await db.audioAssets.where('projectId').equals(id).toArray();
    await db.audioAssets.bulkAdd(assets.map((asset) => ({ ...asset, projectId: copy.id })));
    await selectProject(copy.id);
    return copy;
  });
}

export function deleteProject(id: string) {
  return db.transaction('rw', db.projects, db.audioAssets, db.settings, async () => {
    await db.audioAssets.where('projectId').equals(id).delete();
    await db.projects.delete(id);
    if ((await db.settings.get('activeProject'))?.projectId === id) await selectProject(null);
  });
}

export function storageErrorMessage(error: unknown) {
  const reason = error as { name?: string; inner?: { name?: string }; message?: string } | null;
  if ([reason?.name, reason?.inner?.name].includes('QuotaExceededError')) {
    return 'Penyimpanan browser penuh. Unduh JSON sebagai cadangan, kosongkan ruang, lalu coba simpan lagi.';
  }
  return `Penyimpanan lokal gagal. ${reason?.message ?? 'Periksa izin penyimpanan browser dan coba lagi.'}`;
}
