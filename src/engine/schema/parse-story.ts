import { validateStorySemantics, type StoryIssue } from './semantic';
import { storyV1Schema, type ProjectDocument } from './story-v1';

export const MAX_STORY_BYTES = 1024 * 1024;

export type StoryResult =
  | { ok: true; project: ProjectDocument }
  | { ok: false; issues: StoryIssue[] };

export function formatStoryPath(path: StoryIssue['path']): string {
  return path.reduce<string>((location, segment) => {
    if (typeof segment === 'number') return `${location}[${segment}]`;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(segment)) return `${location}[${JSON.stringify(segment)}]`;
    return location ? `${location}.${segment}` : segment;
  }, '') || '$';
}

export function validateStoryV1(value: unknown): StoryResult {
  const result = storyV1Schema.safeParse(value);
  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.flatMap<StoryIssue>((issue) => {
        const path = issue.path.map((segment) => typeof segment === 'number' ? segment : String(segment));
        if (issue.code === 'unrecognized_keys') {
          return issue.keys.map((key) => ({ path: [...path, key], message: 'Field ini tidak dikenal dalam kontrak JSON v1.' }));
        }
        if (issue.code === 'invalid_union' && issue.discriminator) {
          return [{ path, message: `Tipe "${issue.discriminator}" tidak didukung dalam kontrak JSON v1.` }];
        }
        if (path.at(-1) === 'preset' && issue.code === 'invalid_value') {
          return [{ path, message: 'Preset v1 yang didukung adalah human, robot, cat, tree, house, dan rock.' }];
        }
        return [{ path, message: issue.message }];
      }),
    };
  }
  const issues = validateStorySemantics(result.data);
  return issues.length ? { ok: false, issues } : { ok: true, project: result.data };
}

/** Import for the current engine. The v1 schema also recognizes presets reserved for S3. */
export function parseStory(text: string): StoryResult {
  if (text.length > MAX_STORY_BYTES || new TextEncoder().encode(text).length > MAX_STORY_BYTES) {
    return { ok: false, issues: [{ path: [], message: 'Ukuran JSON maksimal 1 MiB (UTF-8).' }] };
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof SyntaxError ? error.message.slice(0, 180) : '';
    return { ok: false, issues: [{ path: [], message: `Sintaks JSON tidak valid. ${detail}`.trim() }] };
  }
  const result = validateStoryV1(value);
  if (!result.ok) return result;

  const issues: StoryIssue[] = [];
  result.project.scenes.forEach((scene, sceneIndex) => {
    scene.nodes.forEach((node, nodeIndex) => {
      if (node.kind === 'preset') {
        issues.push({
          path: ['scenes', sceneIndex, 'nodes', nodeIndex, 'preset'],
          message: `Preset "${node.preset}" dikenali oleh JSON v1 dan baru dapat dirender setelah Sesi 3. Gunakan mesh primitive untuk Sesi 2.`,
        });
      }
    });
  });
  return issues.length ? { ok: false, issues } : result;
}
