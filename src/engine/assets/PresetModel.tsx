import { memo } from 'react';
import { evaluateCharacterMotion } from '../motion/character-motion';
import type { PresetNode } from '../schema/story-v1';
import type { PresetMaterials, PresetResources } from './preset-resources';
import type { Joint, Part } from './preset-types';
import { presets } from './presets';

type PartsProps = {
  resources: PresetResources;
  palette: PresetMaterials;
};

const ModelParts = memo(function ModelParts({ parts, resources, palette }: PartsProps & { parts: readonly Part[] }) {
  return parts.map(({ shape, color, ...transform }, index) => (
    <mesh key={index} {...transform} geometry={resources.geometries[shape]} material={palette[color]} />
  ));
});

type JointProps = PartsProps & { joint: Joint; pose: ReturnType<typeof evaluateCharacterMotion> };

function ModelJoint({ joint, pose, ...partsProps }: JointProps) {
  return (
    <group name={joint.name} position={joint.position} rotation={pose.joints[joint.name] ?? [0, 0, 0]}>
      <ModelParts parts={joint.parts} {...partsProps} />
      {joint.joints?.map((child) => <ModelJoint key={child.name} joint={child} pose={pose} {...partsProps} />)}
    </group>
  );
}

export function PresetModel({ node, frame, fps, resources }: {
  node: PresetNode;
  frame: number;
  fps: number;
  resources: PresetResources;
}) {
  const model = presets[node.preset];
  const partsProps = { resources, palette: resources.palettes.get(node.id)! };
  if (!('rig' in model) || !model.rig) {
    return (
      <group dispose={null}>
        <ModelParts parts={model.parts} {...partsProps} />
      </group>
    );
  }
  const pose = evaluateCharacterMotion(model.rig.gait, node.action, frame, fps);
  return (
    <group dispose={null} position={[0, pose.lift, 0]} scale={[1, pose.heightScale, 1]}>
      <ModelParts parts={model.parts} {...partsProps} />
      {model.rig.joints.map((joint) => <ModelJoint key={joint.name} joint={joint} pose={pose} {...partsProps} />)}
    </group>
  );
}
