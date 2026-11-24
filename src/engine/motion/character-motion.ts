import type { PresetNode, Vec3 } from '../schema/story-v1';

export type Gait = 'biped' | 'quadruped';
export type JointName =
  | 'head' | 'tail'
  | 'leftArm' | 'rightArm' | 'rightElbow' | 'leftWrist'
  | 'leftLeg' | 'rightLeg' | 'leftAnkle' | 'rightAnkle';

type Pose = {
  lift: number;
  heightScale: number;
  joints: Partial<Record<JointName, Vec3>>;
};

export const neutralPose: Pose = { lift: 0, heightScale: 1, joints: {} };
const turn = Math.PI * 2;

function jointPose(joints: Pose['joints']): Pose {
  return { ...neutralPose, joints };
}

export function evaluateCharacterMotion(
  gait: Gait, action: PresetNode['action'], sceneFrame: number, fps: number,
): Pose {
  if (!action) return neutralPose;
  const time = sceneFrame / fps * action.speed;
  const cat = gait === 'quadruped';

  switch (action.name) {
    case 'idle': {
      const sway = Math.sin(turn * 0.5 * time);
      return jointPose({
        head: [0.035 * sway, 0.16 * sway, 0.045 * sway],
        tail: [0, 0.24 * sway, 0],
      });
    }
    case 'walk': {
      const stride = Math.sin(turn * 1.25 * time);
      const arm = stride * (cat ? 0.45 : 0.34);
      const leg = stride * (cat ? 0.43 : 0.5);
      // The cat moves diagonal pairs together. Biped arms oppose their matching legs.
      return jointPose({
        leftArm: [arm, 0, 0],
        rightArm: [-arm, 0, 0],
        leftLeg: [-leg, 0, 0],
        rightLeg: [leg, 0, 0],
        rightElbow: [cat ? arm : 0, 0, 0],
        leftWrist: [-arm, 0, 0],
        leftAnkle: [leg, 0, 0],
        rightAnkle: [-leg, 0, 0],
        head: [0.04 * stride, 0, 0],
        tail: [0, 0.22 * stride, 0],
      });
    }
    case 'wave': {
      const cycle = time / 1.8;
      const raise = Math.sin(Math.PI * (cycle % 1)) ** 2;
      const wave = Math.sin(turn * 4 * cycle);
      return jointPose(cat ? {
        rightArm: [-raise * (0.88 + 0.17 * wave), 0, -0.14 * raise],
        rightElbow: [-raise * (0.38 + 0.2 * wave), 0, 0],
        head: [-0.1 * raise, 0, 0.12 * raise],
        tail: [0, 0.3 * wave * raise, 0],
      } : {
        rightArm: [-0.35 * raise, 0, -2.05 * raise],
        rightElbow: [-0.9 * raise, 0, (-0.25 + 0.35 * wave) * raise],
        head: [0, -0.13 * raise, 0.12 * raise],
      });
    }
    case 'jump': {
      const phase = (time / 1.6) % 1;
      const launch = 0.25;
      const landing = 0.75;
      const flight = Math.max(0, Math.min(1, (phase - launch) / (landing - launch)));
      const arc = 4 * flight * (1 - flight);
      const crouch = phase < launch
        ? Math.sin(Math.PI * phase / launch)
        : Math.sin(Math.PI * Math.max(0, (phase - landing) / (1 - landing)));
      return {
        lift: arc * (cat ? 0.42 : 0.54),
        heightScale: 1 - 0.12 * crouch,
        joints: {
          head: [0.16 * crouch - 0.1 * arc, 0, 0],
          leftArm: [-0.55 * arc, 0, 0.12 * arc],
          rightArm: [-0.55 * arc, 0, -0.12 * arc],
          leftLeg: [0.38 * arc, 0, 0],
          rightLeg: [0.38 * arc, 0, 0],
          tail: [-0.28 * arc, 0, 0],
        },
      };
    }
  }
}
