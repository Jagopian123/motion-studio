import { describe, expect, it, vi } from 'vitest';
import { Box3, BoxGeometry, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { parseStory } from '../schema/parse-story';
import { characterPresets, presetNames } from '../schema/story-v1';
import { evaluateTransform } from '../timeline/animation';
import lab from '../../examples/isometric-story.json?raw';
import { evaluateCharacterMotion } from '../motion/character-motion';
import { createPresetResources } from './preset-resources';
import type { Joint, Part, PresetDefinition } from './preset-types';
import { presets } from './presets';

function countMeshes(parts: readonly Part[], joints: readonly Joint[] = []): number {
  return parts.length + joints.reduce((total, joint) => total + countMeshes(joint.parts, joint.joints), 0);
}

describe('preset registry', () => {
  it.each(presetNames)('%s stays within 24 procedural meshes and registers the correct rigs', (name) => {
    const { parts, rig }: PresetDefinition = presets[name];
    expect(countMeshes(parts, rig?.joints)).toBeLessThanOrEqual(24);
    expect(Boolean(rig)).toBe(characterPresets.some((character) => character === name));
    if (rig) {
      expect(rig.joints.map((joint) => joint.name)).toEqual(expect.arrayContaining(['head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg']));
    }
  });

  it('reuses shared geometries and matching colors and disposes each resource once', () => {
    const result = parseStory(lab);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const nodes = result.project.scenes[0]!.nodes;
    const robot = nodes.find((node) => node.kind === 'preset' && node.preset === 'robot')!;
    if (robot.kind !== 'preset') throw new Error('Expected a robot preset.');
    expect(createPresetResources(nodes.filter((node) => node.kind !== 'preset'))).toBeNull();
    const resources = createPresetResources([...nodes, { ...robot, id: 'other-robot' }])!;
    const palette = resources.palettes.get(robot.id)!;
    expect(palette).toEqual(resources.palettes.get('other-robot'));
    expect(palette.primary).toBe(resources.palettes.get('other-robot')!.primary);
    expect(palette.primary.color.getHexString()).toBe('cfe5e8');
    expect(resources.palettes.get('cat')!.primary.color.getHexString()).toBe('dd9a5b');
    const shared = vi.fn();
    const geometry = vi.fn();
    palette.primary.addEventListener('dispose', shared);
    resources.geometries.box.addEventListener('dispose', geometry);
    resources.dispose();
    expect(shared).toHaveBeenCalledTimes(1);
    expect(geometry).toHaveBeenCalledTimes(1);
  });

  it('keeps robot feet on the ground in rest and on landing', () => {
    const geometry = new BoxGeometry();
    geometry.computeBoundingBox();
    for (const joint of presets.robot.rig!.joints.filter(({ name }) => name.endsWith('Leg'))) {
      const ankle = joint.joints![0]!;
      const foot = ankle.parts[0]!;
      for (const frame of [0, 6, 12, 24, 36, 42, 48]) {
        const pose = evaluateCharacterMotion('biped', { name: 'jump', speed: 1 }, frame, 30);
        const rotation = new Quaternion().setFromEuler(new Euler(...pose.joints[joint.name]!));
        const ankleMatrix = new Matrix4().makeTranslation(...ankle.position);
        const jointMatrix = new Matrix4().compose(new Vector3(...joint.position), rotation, new Vector3(1, 1, 1));
        const poseMatrix = new Matrix4().makeTranslation(0, pose.lift, 0).scale(new Vector3(1, pose.heightScale, 1));
        const bounds = new Box3().copy(geometry.boundingBox!)
          .applyMatrix4(new Matrix4().makeTranslation(...foot.position).scale(new Vector3(...foot.scale)))
          .applyMatrix4(poseMatrix.multiply(jointMatrix).multiply(ankleMatrix));
        expect(bounds.min.y).toBeGreaterThanOrEqual(-1e-9);
        if (pose.lift < 1e-9) expect(bounds.min.y).toBeCloseTo(0, 9);
      }
    }
    geometry.dispose();
  });

  it('keeps position, rotation and scale in the scene hierarchy independent of action pose', () => {
    const result = parseStory(lab);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const [island] = result.project.scenes[0]!.nodes;
    const robot = result.project.scenes[0]!.nodes.find((node) => node.id === 'robot')!;
    if (robot.kind !== 'preset' || !island) throw new Error('Expected a robot below the island.');
    expect(robot.parentId).toBe(island.id);
    expect(evaluateTransform(robot, 30)).toEqual(evaluateTransform(robot, 0));
    expect(evaluateCharacterMotion('biped', robot.action, 24, 24).lift).toBeGreaterThan(0.5);
    const parent = evaluateTransform(island, 143);
    expect(parent.rotation[1]).toBeCloseTo(Math.PI / 18);
    expect(parent.scale).toEqual([0.95, 0.95, 0.95]);
    const placement = new Vector3(...robot.position)
      .multiply(new Vector3(...parent.scale)).applyEuler(new Euler(...parent.rotation));
    expect(placement.x).toBeCloseTo(0.2069, 3);
    expect(placement.y).toBeCloseTo(0.1615, 4);
    expect(placement.z).toBeCloseTo(-0.0847, 3);
  });
});
