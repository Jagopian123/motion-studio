import { formatStoryPath, MAX_STORY_BYTES, parseStory } from '../../engine/schema/parse-story';
import type { StoryIssue } from '../../engine/schema/semantic';

export async function readProjectFile(file: File) {
  if (!/\.json$/i.test(file.name)) throw new Error('Pilih file dengan ekstensi .json.');
  if (file.size > MAX_STORY_BYTES) throw new Error('Ukuran JSON maksimal 1 MiB (UTF-8).');
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('File JSON harus memakai encoding UTF-8 yang valid.');
  }
}

export function describeStoryIssue(issue: StoryIssue) {
  const [root, index] = issue.path;
  const scene = root === 'scenes' && typeof index === 'number' ? `Scene ${index + 1} · ` : '';
  return `${scene}${formatStoryPath(issue.path)} · ${issue.message}`;
}

export function readProjectJson(json: string) {
  const result = parseStory(json);
  if (!result.ok) throw new Error(`JSON proyek tidak dapat dibuka. ${describeStoryIssue(result.issues[0]!)}`);
  return { document: result.project, json };
}

export function renameProjectJson(json: string, title: string) {
  const source = JSON.parse(json);
  source.title = title.trim();
  const readable = JSON.stringify(source, null, 2);
  const revised = new TextEncoder().encode(readable).length <= MAX_STORY_BYTES ? readable : JSON.stringify(source);
  return readProjectJson(revised);
}

export const newProjectJson = JSON.stringify({
  schemaVersion: 1,
  title: 'Proyek baru',
  aspectRatio: '9:16',
  fps: 30,
  scenes: [{
    id: 'scene-1', name: 'Scene 1', durationFrames: 150,
    world: { background: '#172554', ground: true, groundColor: '#334155' },
    camera: { type: 'perspective', keyframes: [{ frame: 0, position: [3, 3.5, 6], target: [0, 0.75, 0] }] },
    nodes: [{ id: 'cube', kind: 'mesh', geometry: { type: 'box', size: [1.3, 1.3, 1.3] }, material: { color: '#2DD4BF' }, position: [0, 0.65, 0] }],
  }],
}, null, 2);

export function downloadProjectJson(title: string, json: string) {
  const safeTitle = Array.from(title, (char) => char.charCodeAt(0) < 32 ? '-' : char).join('');
  const filename = safeTitle.replace(/[<>:"/\\|?*]/gu, '-').trim() || 'motion-studio';
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
