import type { ProjectDocument } from '../schema/story-v1';
import { getSceneRanges } from '../timeline/scenes';
import { DEMO } from './demo';

export function getClip(project: ProjectDocument | null) {
  const ranges = getSceneRanges(project?.scenes ?? []);
  return {
    id: project ? 'cerita-json' : 'orbit-01',
    title: project?.title ?? 'Orbit 01',
    aspectRatio: project?.aspectRatio ?? '9:16' as const,
    fps: project?.fps ?? DEMO.fps,
    durationInFrames: ranges.at(-1)?.end ?? DEMO.durationInFrames,
    ranges,
  };
}

export type Clip = ReturnType<typeof getClip>;
