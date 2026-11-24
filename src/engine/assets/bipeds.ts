import { part, type Joint, type Part, type PresetDefinition, type Shape } from './preset-types';

const sides = [
  { sign: 1, arm: 'leftArm', leg: 'leftLeg', ankle: 'leftAnkle' },
  { sign: -1, arm: 'rightArm', leg: 'rightLeg', ankle: 'rightAnkle' },
] as const;

function limbJoints(robot: boolean): Joint[] {
  const shape: Shape = robot ? 'box' : 'pill';
  return sides.flatMap(({ sign, arm, leg, ankle }) => {
    const forearm = [
      part(shape, 'primary', [0, -0.16, 0], [0.16, 0.35, 0.17]),
      part('oval', 'accent', [0, -0.32, 0.015], [0.19, 0.22, 0.21]),
    ];
    const isRight = arm === 'rightArm';
    return [
      {
        name: arm,
        position: [sign * (robot ? 0.48 : 0.41), 1.53, 0],
        parts: [
          part('oval', 'secondary', [0, 0, 0], [0.25, 0.24, 0.28]),
          part(shape, 'primary', [0, -0.15, 0], [0.18, 0.31, 0.19]),
          ...(!isRight ? forearm.map((item): Part => ({
            ...item, position: [item.position[0], item.position[1] - 0.28, item.position[2]],
          })) : []),
        ],
        joints: isRight ? [{ name: 'rightElbow', position: [0, -0.28, 0], parts: forearm }] : undefined,
      },
      {
        name: leg,
        position: [sign * 0.20, 0.93, 0],
        parts: [part(shape, 'secondary', [0, -0.40, 0], [0.25, 0.83, 0.27])],
        joints: [{
          name: ankle, position: [0, -0.80, 0],
          parts: [part(robot ? 'box' : 'oval', 'primary', [0, 0, 0.075], [0.30, 0.26, 0.44])],
        }],
      },
    ] satisfies Joint[];
  });
}

export const human: PresetDefinition = {
  colors: { primary: '#E38155', secondary: '#334E77', accent: '#E8B08B' },
  parts: [
    part('pill', 'primary', [0, 1.27, 0], [0.73, 0.85, 0.49]),
    part('oval', 'secondary', [0, 0.94, 0], [0.64, 0.30, 0.45]),
    part('pill', 'accent', [0, 1.71, 0], [0.22, 0.27, 0.22]),
    part('oval', 'secondary', [0, 1.62, 0.13], [0.35, 0.15, 0.27]),
  ],
  rig: {
    gait: 'biped',
    joints: [...limbJoints(false), {
      name: 'head', position: [0, 1.77, 0],
      parts: [
        part('oval', 'accent', [0, 0.28, 0], [0.68, 0.65, 0.59]),
        part('oval', 'detail', [0, 0.43, -0.06], [0.71, 0.44, 0.60], [0.22, 0, 0.14]),
        part('oval', 'accent', [0, 0.22, 0.286], [0.13, 0.12, 0.15]),
        ...sides.map(({ sign }) => part('oval', 'detail', [sign * 0.13, 0.29, 0.26], [0.065, 0.086, 0.048])),
      ],
    }],
  },
};

export const robot: PresetDefinition = {
  colors: { primary: '#D9EAF3', secondary: '#398BC0', accent: '#FFCB66' },
  parts: [
    part('box', 'primary', [0, 1.29, 0], [0.79, 0.70, 0.53]),
    part('box', 'secondary', [0, 0.96, 0], [0.62, 0.24, 0.44]),
    part('box', 'secondary', [0, 1.36, 0.27], [0.54, 0.39, 0.08]),
    part('oval', 'accent', [0, 1.37, 0.32], [0.18, 0.18, 0.07]),
    part('trunk', 'detail', [0, 1.72, 0], [0.27, 0.25, 0.27]),
  ],
  rig: {
    gait: 'biped',
    joints: [...limbJoints(true), {
      name: 'head', position: [0, 1.75, 0],
      parts: [
        part('box', 'primary', [0, 0.28, 0], [0.79, 0.55, 0.60]),
        part('box', 'detail', [0, 0.29, 0.31], [0.64, 0.30, 0.065]),
        ...sides.map(({ sign }) => part('pill', 'accent', [sign * 0.15, 0.30, 0.354], [0.095, 0.16, 0.035])),
        part('trunk', 'secondary', [0.25, 0.62, 0.01], [0.085, 0.19, 0.085]),
        part('oval', 'accent', [0.25, 0.74, 0.01], [0.16, 0.16, 0.16]),
      ],
    }],
  },
};
