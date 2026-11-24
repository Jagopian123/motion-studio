import type { Gait, JointName } from '../motion/character-motion';
import type { Vec3 } from '../schema/story-v1';

export type Palette = Record<'primary' | 'secondary' | 'accent', string>;
export type Shape = 'box' | 'oval' | 'pill' | 'cone' | 'trunk' | 'facet' | 'roof';

export type Part = {
  shape: Shape;
  color: keyof Palette | 'detail';
  position: Vec3;
  scale: Vec3;
  rotation?: Vec3;
};

export type Joint = {
  name: JointName;
  position: Vec3;
  parts: readonly Part[];
  joints?: readonly Joint[];
};

export type PresetDefinition = {
  colors: Palette;
  parts: readonly Part[];
  rig?: { gait: Gait; joints: readonly Joint[] };
};

export function part(shape: Shape, color: Part['color'], position: Vec3, scale: Vec3, rotation?: Vec3): Part {
  return { shape, color, position, scale, rotation };
}
