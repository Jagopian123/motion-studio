import { describe, expect, it } from 'vitest';
import reference from '../../../example-story.json?raw';
import demo from '../../examples/primitive-story.json?raw';
import { formatStoryPath, MAX_STORY_BYTES, parseStory, validateStoryV1 } from './parse-story';

const world = { background: '#123456', ground: true, groundColor: '#223344' };
const camera = { type: 'perspective', keyframes: [{ frame: 0, position: [1, 2, 3], target: [0, 1, 0] }] };
const group = { id: 'root', kind: 'group' };
const scene = { id: 'one', name: 'Scene one', durationFrames: 24, world, camera, nodes: [group] };
const story = { schemaVersion: 1, title: 'Test story', fps: 24, scenes: [scene] };

function errorPaths(value: unknown) {
  const result = validateStoryV1(value);
  if (result.ok) throw new Error('Invalid value was accepted.');
  return result.issues.map((issue) => formatStoryPath(issue.path));
}

describe('strict JSON v1', () => {
  it('normalizes optional fields independently without changing the input', () => {
    const result = validateStoryV1(story);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.project).toMatchObject({
      aspectRatio: '9:16',
      scenes: [{
        lighting: { directional: { position: [4, 8, 5] } },
        captions: [],
        camera: { keyframes: [{ fov: 45, ease: 'linear' }] },
        nodes: [{ position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], tracks: [] }],
      }],
    });
    result.project.scenes[0]!.nodes[0]!.position[1] = 8;
    expect(validateStoryV1(story)).toMatchObject({ project: { scenes: [{ nodes: [{ position: [0, 0, 0] }] }] } });
    expect(group).not.toHaveProperty('position');
  });

  it('validates both fixtures and reports known presets unavailable to the current engine', () => {
    expect(parseStory(demo)).toMatchObject({ ok: true, project: { title: 'Observatorium Prisma' } });
    expect(validateStoryV1(JSON.parse(reference))).toMatchObject({ ok: true });
    const result = parseStory(reference);
    if (result.ok) throw new Error('The preset story was unexpectedly accepted for rendering.');
    expect(result.issues[0]).toMatchObject({
      path: ['scenes', 0, 'nodes', 0, 'preset'],
      message: expect.stringMatching(/robot.*Sesi 3/),
    });
  });

  it('rejects bad syntax and oversize UTF-8 input before parsing', () => {
    expect(parseStory('{')).toMatchObject({ ok: false, issues: [{ path: [], message: expect.stringMatching(/Sintaks JSON/) }] });
    expect(parseStory(JSON.stringify(story).padEnd(MAX_STORY_BYTES, ' ')).ok).toBe(true);
    for (const source of [' '.repeat(MAX_STORY_BYTES + 1), `"${'é'.repeat(MAX_STORY_BYTES / 2)}"`]) {
      expect(parseStory(source)).toMatchObject({ ok: false, issues: [{ path: [], message: expect.stringMatching(/1 MiB/) }] });
    }
  });

  it('reports unknown fields individually, including prototype keys, across nested objects', () => {
    const input = {
      ...story, script: 'some code', scenes: [{
        ...scene,
        camera: { ...camera, keyframes: [{ ...camera.keyframes[0], 'camera.url': 'https://example.com' }] },
        nodes: [{ ...group, material: {}, code: 'doSomething()' }],
      }],
    };
    expect(errorPaths(input)).toEqual(expect.arrayContaining([
      'script', 'scenes[0].camera.keyframes[0]["camera.url"]', 'scenes[0].nodes[0].material', 'scenes[0].nodes[0].code',
    ]));
    expect(parseStory(JSON.stringify(story).replace('{', '{"__proto__":{"polluted":true},'))).toMatchObject({
      ok: false, issues: [{ path: ['__proto__'] }],
    });
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it.each([
    ['schemaVersion', { schemaVersion: 2 }],
    ['fps', { fps: 25 }],
    ['aspectRatio', { aspectRatio: '4:3' }],
    ['title', { title: 't'.repeat(101) }],
    ['scenes', { scenes: [] }],
    ['scenes', { scenes: Array.from({ length: 13 }, () => scene) }],
  ])('checks root bounds at %s', (path, overrides) => {
    expect(errorPaths({ ...story, ...overrides })).toContain(path);
  });

  it.each([
    ['kind', { ...group, kind: 'generator' }],
    ['position[0]', { ...group, position: [101, 0, 0] }],
    ['rotation[2]', { ...group, rotation: [0, 0, Infinity] }],
    ['position', { ...group, position: [0, 0, 0, 0] }],
    ['scale[2]', { ...group, scale: [1, 1, 0] }],
    ['preset', { ...group, kind: 'preset', preset: 'spaceship' }],
    ['action', { ...group, kind: 'preset', preset: 'tree', action: { name: 'walk', speed: 1 } }],
    ['action.speed', { ...group, kind: 'preset', preset: 'cat', action: { name: 'walk', speed: 3.01 } }],
    ['geometry.type', { id: 'mesh', kind: 'mesh', geometry: { type: 'plane' }, material: { color: '#000000' } }],
    ['geometry.radiusTop', { id: 'mesh', kind: 'mesh', geometry: { type: 'cylinder', radiusTop: 0, radiusBottom: 0, height: 1 }, material: { color: '#000000' } }],
    ['geometry.radius', { id: 'mesh', kind: 'mesh', geometry: { type: 'sphere', radius: 51 }, material: { color: '#000000' } }],
    ['material.color', { id: 'mesh', kind: 'mesh', geometry: { type: 'sphere', radius: 1 }, material: { color: 'red' } }],
    ['material.roughness', { id: 'mesh', kind: 'mesh', geometry: { type: 'sphere', radius: 1 }, material: { color: '#000000', roughness: 1.1 } }],
  ])('validates node field %s', (path, node) => {
    expect(errorPaths({ ...story, scenes: [{ ...scene, nodes: [node] }] })).toContain(`scenes[0].nodes[0].${path}`);
  });

  it('checks scene/node limits, duplicate ids and total duration at the actual FPS', () => {
    expect(errorPaths({
      ...story,
      scenes: [{ ...scene, durationFrames: 1441 }, { ...scene, nodes: [group, group] }],
    })).toEqual(expect.arrayContaining(['scenes', 'scenes[0].durationFrames', 'scenes[1].id', 'scenes[1].nodes[1].id']));
    expect(errorPaths({
      ...story, scenes: [{ ...scene, nodes: Array.from({ length: 101 }, (_, index) => ({ ...group, id: String(index) })) }],
    })).toContain('scenes[0].nodes');
    expect(validateStoryV1({ ...story, scenes: [{ ...scene, durationFrames: 1440 }] }).ok).toBe(true);
  });

  it('stops at an oversized collection before validating its entries', () => {
    expect(errorPaths({ ...story, scenes: Array(10000).fill(null) })).toEqual(['scenes']);
    expect(errorPaths({ ...story, scenes: [{ ...scene, nodes: Array(101).fill(null) }] })).toEqual(['scenes[0].nodes']);
  });

  it('resolves forward references and reports missing parents, self cycles and longer cycles', () => {
    const node = (id: string, parentId?: string) => ({ ...group, id, parentId });
    expect(validateStoryV1({ ...story, scenes: [{ ...scene, nodes: [node('leaf', 'constructor'), node('constructor')] }] }).ok).toBe(true);
    expect(errorPaths({
      ...story, scenes: [{ ...scene, nodes: [
        node('a', 'b'), node('b', 'c'), node('c', 'a'), node('d', 'unknown'), node('self', 'self'),
      ] }],
    })).toEqual(['scenes[0].nodes[2].parentId', 'scenes[0].nodes[3].parentId', 'scenes[0].nodes[4].parentId']);
  });

  it('reports keyframe order, start/end limits, duplicate tracks, camera target and fog ranges', () => {
    const keyframe = camera.keyframes[0]!;
    const track = { property: 'position', keyframes: [{ frame: 0, value: [0, 0, 0] }] };
    expect(errorPaths({
      ...story,
      scenes: [{
        ...scene,
        world: { ...world, fog: { color: '#000000', near: 10, far: 9 } },
        camera: { ...camera, keyframes: [
          { ...keyframe, frame: 3 },
          { ...keyframe, frame: 3, target: keyframe.position },
          { ...keyframe, frame: 24 },
        ] },
        nodes: [{ ...group, tracks: [
          { ...track, keyframes: [...track.keyframes, { frame: 24, value: [2, 0, 0] }, { frame: 1, value: [0, 0, 0] }] },
          track,
        ] }],
      }],
    })).toEqual(expect.arrayContaining([
      'scenes[0].world.fog.far', 'scenes[0].camera.keyframes[0].frame',
      'scenes[0].camera.keyframes[1].frame', 'scenes[0].camera.keyframes[1].target',
      'scenes[0].camera.keyframes[2].frame', 'scenes[0].nodes[0].tracks[0].keyframes[1].frame',
      'scenes[0].nodes[0].tracks[0].keyframes[2].frame', 'scenes[0].nodes[0].tracks[1].property',
    ]));
  });

  it('permits adjacent, unordered captions and reports overlaps and exclusive end violations by source index', () => {
    const caption = (startFrame: number, endFrame: number) => ({ startFrame, endFrame, text: '<caption>', placement: 'top' });
    expect(validateStoryV1({
      ...story, scenes: [{ ...scene, captions: [caption(10, 24), caption(0, 10)] }],
    })).toMatchObject({ ok: true, project: { scenes: [{ captions: [{ color: '#FFFFFF', fontSize: 52 }, { startFrame: 0 }] }] } });
    expect(errorPaths({
      ...story, scenes: [{ ...scene, captions: [caption(10, 25), caption(0, 11), caption(17, 17)] }],
    })).toEqual(expect.arrayContaining(['scenes[0].captions[0].startFrame', 'scenes[0].captions[0].endFrame', 'scenes[0].captions[2].endFrame']));
  });
});
