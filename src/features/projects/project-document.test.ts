import { describe, expect, it } from 'vitest';
import { MAX_STORY_BYTES, parseStory } from '../../engine/schema/parse-story';
import { describeStoryIssue, newProjectJson, readProjectFile, readProjectJson, renameProjectJson } from './project-document';

describe('local project JSON', () => {
  it('validates the starter and preserves the original bounded source', () => {
    const json = newProjectJson.padEnd(MAX_STORY_BYTES, ' ');
    expect(readProjectJson(json).json).toBe(json);
    expect(readProjectJson(json).document.scenes[0]?.durationFrames).toBe(150);
    expect(() => readProjectJson(`${json} `)).toThrow('maksimal 1 MiB');
  });

  it('renames through the same validator and can be reimported', () => {
    const renamed = renameProjectJson(newProjectJson, '  Judul baru  ');
    expect(renamed.document.title).toBe('Judul baru');
    expect(parseStory(renamed.json)).toEqual({ ok: true, project: renamed.document });
    expect(() => renameProjectJson(newProjectJson, '   ')).toThrow('title');
  });

  it('identifies scene errors while keeping the exact validator path', () => {
    expect(describeStoryIssue({ path: ['scenes', 1, 'nodes', 0, 'id'], message: 'Duplikat' }))
      .toBe('Scene 2 · scenes[1].nodes[0].id · Duplikat');
    expect(describeStoryIssue({ path: [], message: 'JSON rusak' })).toBe('$ · JSON rusak');
  });

  it('checks file type and byte size before reading', async () => {
    await expect(readProjectFile(new File([' hi '], 'scene.js'))).rejects.toThrow('ekstensi .json');
    await expect(readProjectFile(new File([new Uint8Array(MAX_STORY_BYTES + 1)], 'scene.json'))).rejects.toThrow('maksimal 1 MiB');
    await expect(readProjectFile(new File([newProjectJson], 'scene.JSON'))).resolves.toBe(newProjectJson);
  });

  it('accepts a UTF-8 BOM and rejects malformed bytes instead of replacing them', async () => {
    await expect(readProjectFile(new File(['\uFEFF', newProjectJson], 'scene.json'))).resolves.toBe(newProjectJson);
    const broken = new File(['{"title":"', Uint8Array.of(0xff), '"}'], 'scene.json');
    await expect(readProjectFile(broken)).rejects.toThrow('encoding UTF-8 yang valid');
  });
});
