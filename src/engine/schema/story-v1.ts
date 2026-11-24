import { z } from 'zod';

// Disable Zod's dynamic object parser before constructing any story schemas.
z.config({ jitless: true });

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Gunakan warna #RRGGBB.');
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/, 'Gunakan 1–64 huruf, angka, garis bawah, atau tanda hubung.');
const dimension = z.number().positive().max(50);
const radius = z.number().min(0).max(50);
const frame = z.number().int().min(0).max(1800);
const ease = z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut', 'step']).default('linear');
const vec3 = (value: z.ZodNumber) => z.tuple([value, value, value]);
const position = vec3(z.number().min(-100).max(100));
const rotation = vec3(z.number());
const scale = vec3(z.number().min(0.01).max(50));

function boundedArray<T extends z.ZodType>(item: T, min: number, max: number) {
  // Check the count before parsing each item, including on a large invalid paste.
  return z.array(z.unknown()).min(min).max(max).pipe(z.array(item));
}

const directional = z.strictObject({ color: hex, intensity: z.number().min(0).max(5), position });
const lighting = z.strictObject({
  ambient: z.strictObject({ color: hex, intensity: z.number().min(0).max(3) }),
  directional,
  fill: directional.optional(),
}).prefault({
  ambient: { color: '#FFFFFF', intensity: 0.65 },
  directional: { color: '#FFFFFF', intensity: 2, position: [4, 8, 5] },
});

const world = z.strictObject({
  background: hex,
  ground: z.boolean(),
  groundColor: hex,
  fog: z.strictObject({ color: hex, near: z.number().positive(), far: z.number().positive() }).optional(),
});

const cameraKeyframe = {
  frame,
  position,
  target: position,
  ease,
};
const fov = z.number().min(15).max(90);
const orthoSize = z.number().min(1).max(100);
const camera = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('perspective'),
    keyframes: boundedArray(z.strictObject({
      ...cameraKeyframe, fov: fov.default(45), orthoSize: orthoSize.optional(),
    }), 1, 100),
  }),
  z.strictObject({
    type: z.literal('orthographic'),
    keyframes: boundedArray(z.strictObject({
      ...cameraKeyframe, fov: fov.optional(), orthoSize: orthoSize.default(10),
    }), 1, 100),
  }),
]);

function track<Property extends string>(property: Property, value: typeof position) {
  return z.strictObject({
    property: z.literal(property),
    keyframes: boundedArray(z.strictObject({ frame, value, ease }), 1, 120),
  });
}

const tracks = boundedArray(z.discriminatedUnion('property', [
  track('position', position), track('rotation', rotation), track('scale', scale),
]), 0, 3).default(() => []);

const geometry = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('box'), size: vec3(dimension) }),
  z.strictObject({ type: z.literal('sphere'), radius: dimension }),
  z.strictObject({ type: z.literal('cylinder'), radiusTop: radius, radiusBottom: radius, height: dimension }),
  z.strictObject({ type: z.literal('cone'), radius: dimension, height: dimension }),
  z.strictObject({ type: z.literal('capsule'), radius: dimension, length: dimension }),
  z.strictObject({ type: z.literal('torus'), radius: dimension, tube: dimension }),
]);

const material = z.strictObject({
  color: hex,
  roughness: z.number().min(0).max(1).default(0.8),
  metalness: z.number().min(0).max(1).default(0),
  emissive: hex.default('#000000'),
  emissiveIntensity: z.number().min(0).max(2).default(1),
});

const nodeFields = {
  id,
  parentId: id.optional(),
  position: position.prefault([0, 0, 0]),
  rotation: rotation.prefault([0, 0, 0]),
  scale: scale.prefault([1, 1, 1]),
  tracks,
};

const node = z.discriminatedUnion('kind', [
  z.strictObject({ ...nodeFields, kind: z.literal('group') }),
  z.strictObject({ ...nodeFields, kind: z.literal('mesh'), geometry, material }),
  z.strictObject({
    ...nodeFields,
    kind: z.literal('preset'),
    preset: z.enum(['human', 'robot', 'cat', 'tree', 'house', 'rock']),
    colors: z.strictObject({ primary: hex.optional(), secondary: hex.optional(), accent: hex.optional() }).optional(),
    action: z.strictObject({
      name: z.enum(['idle', 'walk', 'wave', 'jump']),
      speed: z.number().min(0.25).max(3),
    }).optional(),
  }),
]);

const caption = z.strictObject({
  startFrame: frame,
  endFrame: frame,
  text: z.string().max(160),
  placement: z.enum(['top', 'bottom']),
  color: hex.default('#FFFFFF'),
  fontSize: z.number().min(24).max(100).default(52),
});

const scene = z.strictObject({
  id,
  name: z.string().min(1).max(80),
  durationFrames: z.number().int().min(1).max(1800),
  world,
  lighting,
  camera,
  nodes: boundedArray(node, 1, 100),
  captions: boundedArray(caption, 0, 30).default(() => []),
});

export const storyV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  title: z.string().min(1).max(100),
  aspectRatio: z.enum(['9:16', '16:9', '1:1']).default('9:16'),
  fps: z.literal([24, 30]),
  scenes: boundedArray(scene, 1, 12),
});

export type ProjectDocument = z.output<typeof storyV1Schema>;
export type StoryScene = z.output<typeof scene>;
export type StoryNode = z.output<typeof node>;
export type Caption = z.output<typeof caption>;
export type Vec3 = z.output<typeof position>;
export type Ease = z.output<typeof ease>;
