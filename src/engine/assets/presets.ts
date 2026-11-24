import type { PresetNode } from '../schema/story-v1';
import { human, robot } from './bipeds';
import { cat } from './cat';
import { part, type PresetDefinition } from './preset-types';

export const presets = {
  human,
  robot,
  cat,
  tree: {
    colors: { primary: '#41866F', secondary: '#896050', accent: '#A4BB61' },
    parts: [
      part('trunk', 'secondary', [0, 0.56, 0], [0.34, 1.12, 0.34]),
      part('cone', 'primary', [0, 1.10, 0], [1.42, 1.10, 1.42]),
      part('cone', 'primary', [0.04, 1.60, -0.04], [1.14, 1.06, 1.14], [0, 0.38, 0]),
      part('cone', 'accent', [0.06, 2.00, -0.04], [0.84, 0.94, 0.84], [0, 0.7, 0]),
    ],
  },
  house: {
    colors: { primary: '#E7C494', secondary: '#AF5753', accent: '#66A8AD' },
    parts: [
      part('box', 'detail', [0, 0.09, 0], [2.08, 0.18, 1.65]),
      part('box', 'primary', [0, 0.66, 0], [1.86, 1.04, 1.45]),
      part('roof', 'secondary', [0, 1.48, 0], [2.19, 0.68, 1.76]),
      part('box', 'primary', [0.62, 1.54, -0.27], [0.25, 0.68, 0.27]),
      part('box', 'secondary', [0.62, 1.90, -0.27], [0.32, 0.10, 0.34]),
      part('box', 'secondary', [-0.36, 0.49, 0.74], [0.38, 0.66, 0.08]),
      part('oval', 'accent', [-0.25, 0.49, 0.793], [0.065, 0.065, 0.04]),
      part('box', 'detail', [0.40, 0.77, 0.75], [0.60, 0.45, 0.08]),
      part('box', 'accent', [0.40, 0.77, 0.804], [0.45, 0.30, 0.045]),
      part('box', 'primary', [0.40, 0.77, 0.838], [0.045, 0.30, 0.045]),
      part('box', 'accent', [0.94, 0.77, 0], [0.06, 0.36, 0.57]),
    ],
  },
  rock: {
    colors: { primary: '#748096', secondary: '#525B70', accent: '#B6AD95' },
    parts: [
      part('facet', 'primary', [0, 0.38, 0], [1.16, 0.82, 0.90], [0, 0.2, 0]),
      part('facet', 'secondary', [-0.39, 0.20, 0.04], [0.58, 0.43, 0.55], [0, 0.9, 0]),
      part('facet', 'accent', [0.27, 0.14, 0.28], [0.45, 0.30, 0.39], [0, 1.4, 0]),
    ],
  },
} satisfies Record<PresetNode['preset'], PresetDefinition>;
