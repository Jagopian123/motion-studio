import type { Ease, StoryNode, StoryScene, Vec3 } from '../schema/story-v1';

const easing: Record<Ease, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) ** 2,
  easeInOut: (t) => t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) ** 2,
  step: (t) => t < 1 ? 0 : 1,
};

export function easeProgress(ease: Ease, progress: number) {
  return easing[ease](progress);
}

function lerp(from: number, to: number, progress: number) {
  return from * (1 - progress) + to * progress;
}

export function interpolateVec3(from: Vec3, to: Vec3, progress: number): Vec3 {
  return [lerp(from[0], to[0], progress), lerp(from[1], to[1], progress), lerp(from[2], to[2], progress)];
}

function findSegment<T extends { frame: number; ease: Ease }>(keyframes: readonly T[], frame: number) {
  let left = 0;
  let right = keyframes.length;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (keyframes[middle]!.frame <= frame) left = middle + 1;
    else right = middle;
  }
  const from = keyframes[Math.max(0, left - 1)]!;
  const to = keyframes[left];
  const progress = to && frame > from.frame
    ? easeProgress(to.ease, (frame - from.frame) / (to.frame - from.frame))
    : 0;
  return { from, to: to ?? from, progress };
}

export function evaluateTransform(node: StoryNode, frame: number) {
  const transform = { position: node.position, rotation: node.rotation, scale: node.scale };
  for (const { property, keyframes } of node.tracks) {
    const { from, to, progress } = findSegment(keyframes, frame);
    transform[property] = interpolateVec3(from.value, to.value, progress);
  }
  const radians = Math.PI / 180;
  const [x, y, z] = transform.rotation;
  const rotation: Vec3 = [x * radians, y * radians, z * radians];
  return { ...transform, rotation };
}

type CameraKeyframe = StoryScene['camera']['keyframes'][number];

export function evaluateCamera(camera: StoryScene['camera'], frame: number) {
  const { from, to, progress } = findSegment<CameraKeyframe>(camera.keyframes, frame);
  const position = interpolateVec3(from.position, to.position, progress);
  const target = interpolateVec3(from.target, to.target, progress);
  const lens = camera.type === 'perspective'
    ? { type: camera.type, fov: lerp(from.fov ?? 45, to.fov ?? 45, progress) }
    : { type: camera.type, orthoSize: lerp(from.orthoSize ?? 10, to.orthoSize ?? 10, progress) };
  return { position, target, ...lens };
}
