import {
  BoxGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry,
  ExtrudeGeometry, MeshStandardMaterial, Shape as ThreeShape, SphereGeometry, type BufferGeometry,
} from 'three';
import type { StoryNode } from '../schema/story-v1';
import type { Part, Shape } from './preset-types';
import { presets } from './presets';

export type PresetMaterials = Record<Part['color'], MeshStandardMaterial>;
const detailColor = '#222E42';

function roofGeometry() {
  const profile = new ThreeShape();
  profile.moveTo(-0.5, -0.5);
  profile.lineTo(0.5, -0.5);
  profile.lineTo(0, 0.5);
  profile.closePath();
  return new ExtrudeGeometry(profile, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
}

// One pool per active scene. Meshes borrow resources from it, including across preset instances.
export function createPresetResources(nodes: readonly StoryNode[]) {
  const presetNodes = nodes.filter((node) => node.kind === 'preset');
  if (presetNodes.length === 0) return null;

  const geometries = {
    box: new BoxGeometry(),
    oval: new SphereGeometry(0.5, 12, 8),
    pill: new CapsuleGeometry(0.28, 0.44, 3, 10).scale(1 / 0.56, 1, 1 / 0.56),
    cone: new ConeGeometry(0.5, 1, 8),
    trunk: new CylinderGeometry(0.37, 0.5, 1, 8),
    facet: new DodecahedronGeometry(0.5),
    roof: roofGeometry(),
  } satisfies Record<Shape, BufferGeometry>;
  const materials = new Map<string, MeshStandardMaterial>();

  function materialFor(color: string) {
    const key = color.toLowerCase();
    const existing = materials.get(key);
    if (existing) return existing;
    const material = new MeshStandardMaterial({ color, roughness: 0.84 });
    materials.set(key, material);
    return material;
  }

  const palettes = new Map<string, PresetMaterials>(presetNodes.map((node) => {
    const defaults = presets[node.preset].colors;
    return [node.id, {
      primary: materialFor(node.colors?.primary ?? defaults.primary),
      secondary: materialFor(node.colors?.secondary ?? defaults.secondary),
      accent: materialFor(node.colors?.accent ?? defaults.accent),
      detail: materialFor(detailColor),
    }];
  }));

  return {
    geometries,
    palettes,
    dispose() {
      for (const geometry of Object.values(geometries)) geometry.dispose();
      for (const material of materials.values()) material.dispose();
    },
  };
}

export type PresetResources = NonNullable<ReturnType<typeof createPresetResources>>;
