import { part, type Joint, type PresetDefinition } from './preset-types';

export const cat: PresetDefinition = {
  colors: { primary: '#DD9A5B', secondary: '#FFF0D5', accent: '#C45C78' },
  parts: [
    part('oval', 'primary', [0, 0.58, -0.12], [0.67, 0.64, 1.16]),
    part('oval', 'secondary', [0, 0.63, 0.30], [0.56, 0.55, 0.48]),
  ],
  rig: {
    gait: 'quadruped',
    joints: [
      {
        name: 'head', position: [0, 0.78, 0.37],
        parts: [
          part('oval', 'primary', [0, 0.14, 0.10], [0.72, 0.59, 0.59]),
          part('oval', 'secondary', [0, 0.04, 0.34], [0.43, 0.22, 0.23]),
          part('oval', 'accent', [0, 0.12, 0.447], [0.12, 0.075, 0.06]),
          ...([-1, 1] as const).flatMap((side) => [
            part('cone', 'primary', [side * 0.24, 0.42, 0.085], [0.30, 0.38, 0.28], [0, 0, -side * 0.25]),
            part('cone', 'accent', [side * 0.24, 0.43, 0.16], [0.17, 0.24, 0.15], [0, 0, -side * 0.25]),
            part('oval', 'detail', [side * 0.145, 0.19, 0.355], [0.069, 0.096, 0.047]),
          ]),
        ],
      },
      {
        name: 'tail', position: [0, 0.56, -0.61],
        parts: [
          part('pill', 'primary', [0, 0.19, -0.20], [0.17, 0.59, 0.17], [-0.78, 0, 0]),
          part('pill', 'secondary', [0, 0.44, -0.37], [0.155, 0.25, 0.155], [-0.29, 0, 0]),
        ],
      },
      ...([
        ['leftArm', 'leftWrist', 0.21, 0.32], ['rightArm', 'rightElbow', -0.21, 0.32],
        ['leftLeg', 'leftAnkle', 0.22, -0.48], ['rightLeg', 'rightAnkle', -0.22, -0.48],
      ] as const).map(([name, pawJoint, x, z]): Joint => ({
        name, position: [x, 0.48, z],
        parts: [part('pill', 'primary', [0, -0.18, 0], [0.20, 0.48, 0.21])],
        joints: [{
          name: pawJoint, position: [0, -0.39, 0],
          parts: [part('oval', 'secondary', [0, 0, 0.055], [0.23, 0.18, 0.27])],
        }],
      })),
    ],
  },
};
