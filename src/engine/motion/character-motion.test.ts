import { describe, expect, it } from 'vitest';
import { actionNames } from '../schema/story-v1';
import { evaluateCharacterMotion, neutralPose } from './character-motion';

describe('character motion', () => {
  it('uses a fixed rest pose when no action is specified', () => {
    expect(evaluateCharacterMotion('biped', undefined, 29, 30)).toEqual(neutralPose);
  });

  it.each(actionNames)('%s uses elapsed scene time and speed and is independent of seek order', (name) => {
    const action = { name, speed: 1 };
    const original = evaluateCharacterMotion('biped', action, 18, 30);
    const end = evaluateCharacterMotion('biped', action, 143, 30);
    expect(end).not.toEqual(original);
    expect(evaluateCharacterMotion('biped', action, 18, 30)).toEqual(original);
    expect(evaluateCharacterMotion('biped', { name, speed: 2 }, 9, 30)).toEqual(original);
    expect(evaluateCharacterMotion('biped', action, 30, 30))
      .toEqual(evaluateCharacterMotion('biped', action, 24, 24));
  });

  it('animates opposing biped limbs and diagonal cat paws', () => {
    const action = { name: 'walk', speed: 1 } as const;
    const biped = evaluateCharacterMotion('biped', action, 6, 30);
    const cat = evaluateCharacterMotion('quadruped', action, 6, 30);
    expect(biped.joints.leftArm![0]).toBeGreaterThan(0);
    expect(biped.joints.leftLeg![0]).toBeLessThan(0);
    expect(biped.joints.leftLeg![0] + biped.joints.leftAnkle![0]).toBe(0);
    expect(cat.joints.leftArm![0]).toBeGreaterThan(0);
    expect(cat.joints.rightLeg![0]).toBeGreaterThan(0);
    expect(cat.joints.rightArm![0]).toBeLessThan(0);
    expect(cat.joints.leftLeg![0]).toBeLessThan(0);
    expect(cat.joints.rightArm![0] + cat.joints.rightElbow![0]).toBe(0);
  });

  it('raises the biped shoulder sideways and the cat paw forwards', () => {
    const action = { name: 'wave', speed: 1 } as const;
    const biped = evaluateCharacterMotion('biped', action, 27, 30);
    const cat = evaluateCharacterMotion('quadruped', action, 27, 30);
    expect(biped.joints.rightArm![2]).toBeLessThan(-Math.PI / 2);
    expect(biped.joints.rightElbow![0]).toBeLessThan(-0.5);
    expect(cat.joints.rightArm![0]).toBeLessThan(-0.7);
    expect(Math.abs(cat.joints.rightArm![2])).toBeLessThan(0.2);
    expect(cat.joints.rightElbow![0]).toBeLessThan(-0.2);
    expect(cat.joints.leftArm).toBeUndefined();
    expect(cat.joints.leftLeg).toBeUndefined();
    expect(cat.joints.rightLeg).toBeUndefined();
  });

  it.each(['biped', 'quadruped'] as const)('%s jump loads, takes off, lands, and resets', (gait) => {
    const pose = (frame: number) => evaluateCharacterMotion(gait, { name: 'jump', speed: 1 }, frame, 30);
    expect(pose(6)).toMatchObject({ lift: 0, heightScale: 0.88 });
    expect(pose(12).lift).toBe(0);
    expect(pose(24).lift).toBeGreaterThan(0.4);
    expect(pose(36).lift).toBeCloseTo(0, 10);
    expect(pose(42)).toMatchObject({ lift: 0, heightScale: 0.88 });
    expect(pose(48)).toEqual(pose(0));
    for (let frame = 0; frame < 48; frame++) expect(pose(frame).lift).toBeGreaterThanOrEqual(0);
  });
});
