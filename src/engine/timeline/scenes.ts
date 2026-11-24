import type { Caption, StoryScene } from '../schema/story-v1';

export function getSceneRanges(scenes: readonly StoryScene[]) {
  let end = 0;
  return scenes.map((scene) => {
    const start = end;
    end += scene.durationFrames;
    return { scene, start, end };
  });
}

export function getSceneAtFrame(ranges: ReturnType<typeof getSceneRanges>, frame: number) {
  const range = ranges.find(({ start, end }) => frame >= start && frame < end);
  return range ? { ...range, localFrame: frame - range.start } : undefined;
}

export function getCaptionAtFrame(captions: readonly Caption[], frame: number) {
  return captions.find(({ startFrame, endFrame }) => frame >= startFrame && frame < endFrame);
}
