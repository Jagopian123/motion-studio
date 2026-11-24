import { describe, expect, it } from 'vitest';
import fixture from '../../examples/primitive-story.json?raw';
import { parseStory } from '../schema/parse-story';
import type { StoryNode, Vec3 } from '../schema/story-v1';
import { easeProgress, evaluateCamera, evaluateTransform, interpolateVec3 } from './animation';
import { getCaptionAtFrame, getSceneAtFrame, getSceneRanges } from './scenes';

const result = parseStory(fixture);
if (!result.ok) throw new Error(JSON.stringify(result.issues));
const [first, second] = result.project.scenes;
const base: StoryNode = {
  id: 'group', kind: 'group', position: [9, 2, 0], rotation: [30, 45, 90], scale: [2, 2, 2], tracks: [],
};

describe('scene timeline', () => {
  it('uses contiguous [start, end) ranges and frame offsets when seeking either way', () => {
    const ranges = getSceneRanges(result.project.scenes);
    expect(ranges.map(({ start, end }) => [start, end])).toEqual([[0, 90], [90, 180]]);
    const seek = (frame: number) => {
      const match = getSceneAtFrame(ranges, frame);
      return match && [match.scene.id, match.localFrame];
    };
    expect([180, 179, 89, 90, 0, -1].map(seek)).toEqual([
      undefined, ['orbit', 89], ['prisma', 89], ['orbit', 0], ['prisma', 0], undefined,
    ]);
  });

  it('shows captions from the local start frame and excludes the end frame', () => {
    expect([90, 48, 47, 0, -1].map((frame) => getCaptionAtFrame(first!.captions, frame)?.text)).toEqual([
      undefined, 'Cincin menangkap cahaya.', 'Prisma mulai terangkat.', 'Prisma mulai terangkat.', undefined,
    ]);
  });
});

describe('frame evaluators', () => {
  it('interpolates each axis and supports all easing curves', () => {
    expect(interpolateVec3([0, -8, 8], [8, 0, 0], 0.25)).toEqual([2, -6, 6]);
    expect(easeProgress('linear', 0.25)).toBe(0.25);
    expect(easeProgress('easeIn', 0.25)).toBe(0.0625);
    expect(easeProgress('easeOut', 0.25)).toBe(0.4375);
    expect(easeProgress('easeInOut', 0.25)).toBe(0.125);
    expect(easeProgress('easeInOut', 0.75)).toBe(0.875);
    expect(easeProgress('step', 0.99)).toBe(0);
    expect(easeProgress('step', 1)).toBe(1);
  });

  it('evaluates destination easing, full turns in radians, step and both holds after arbitrary seeks', () => {
    const start: Vec3 = [0, 0, 0];
    const node: StoryNode = { ...base, tracks: [
      { property: 'position', keyframes: [
        { frame: 0, value: start, ease: 'linear' },
        { frame: 8, value: [8, 0, 0], ease: 'easeIn' },
        { frame: 12, value: [12, 0, 0], ease: 'step' },
      ] },
      { property: 'rotation', keyframes: [
        { frame: 0, value: start, ease: 'linear' },
        { frame: 8, value: [0, 360, 0], ease: 'linear' },
      ] },
    ] };
    const seek = (frame: number) => evaluateTransform(node, frame);
    expect(seek(4)).toEqual({ position: [2, 0, 0], rotation: [0, Math.PI, 0], scale: [2, 2, 2] });
    expect([23, 12, 11, 8, 4, 0, -5].map((frame) => seek(frame).position[0])).toEqual([12, 12, 8, 8, 2, 0, 0]);
    expect(seek(8).rotation[1]).toBeCloseTo(2 * Math.PI);
    expect(evaluateTransform(base, 20).rotation).toEqual([Math.PI / 6, Math.PI / 4, Math.PI / 2]);
  });

  it('interpolates perspective pose and orthographic size and holds the last camera pose', () => {
    const perspective = evaluateCamera(first!.camera, 44.5);
    expect(perspective).toMatchObject({ type: 'perspective', fov: 40.5 });
    expect(perspective.position[0]).toBeCloseTo(2.6);
    expect(perspective.target[1]).toBeCloseTo(1.45);
    const ortho = evaluateCamera(second!.camera, 44.5);
    if (ortho.type !== 'orthographic') throw new Error('Wrong camera type.');
    expect(ortho.orthoSize).toBeCloseTo(6.35);
    expect(evaluateCamera(second!.camera, 200)).toEqual(evaluateCamera(second!.camera, 89));
    expect(evaluateCamera(first!.camera, -2)).toEqual(evaluateCamera(first!.camera, 0));
    expect(evaluateCamera(first!.camera, 44.5)).toEqual(perspective);
  });
});
