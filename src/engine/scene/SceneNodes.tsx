import { useMemo } from 'react';
import type { StoryNode } from '../schema/story-v1';
import { evaluateTransform } from '../timeline/animation';

type Geometry = Extract<StoryNode, { kind: 'mesh' }>['geometry'];

function PrimitiveGeometry({ geometry }: { geometry: Geometry }) {
  switch (geometry.type) {
    case 'box': return <boxGeometry args={geometry.size} />;
    case 'sphere': return <sphereGeometry args={[geometry.radius, 24, 16]} />;
    case 'cylinder': return <cylinderGeometry args={[geometry.radiusTop, geometry.radiusBottom, geometry.height, 24]} />;
    case 'cone': return <coneGeometry args={[geometry.radius, geometry.height, 24]} />;
    case 'capsule': return <capsuleGeometry args={[geometry.radius, geometry.length, 6, 16]} />;
    case 'torus': return <torusGeometry args={[geometry.radius, geometry.tube, 10, 24]} />;
  }
}

type ChildNodes = Map<string | undefined, StoryNode[]>;

function NodeBranch({ node, childrenByParent, frame }: { node: StoryNode; childrenByParent: ChildNodes; frame: number }) {
  if (node.kind === 'preset') throw new Error(`Preset "${node.preset}" baru dapat dirender setelah Sesi 3.`);
  const { rotation, ...transform } = evaluateTransform(node, frame);
  return (
    <group name={node.id} {...transform} rotation={[...rotation, 'XYZ']}>
      {node.kind === 'mesh' && (
        <mesh>
          <PrimitiveGeometry geometry={node.geometry} />
          <meshStandardMaterial {...node.material} />
        </mesh>
      )}
      {childrenByParent.get(node.id)?.map((child) => (
        <NodeBranch key={child.id} node={child} childrenByParent={childrenByParent} frame={frame} />
      ))}
    </group>
  );
}

export function SceneNodes({ nodes, frame }: { nodes: readonly StoryNode[]; frame: number }) {
  const childrenByParent = useMemo(() => {
    const tree: ChildNodes = new Map();
    for (const node of nodes) {
      const siblings = tree.get(node.parentId);
      if (siblings) siblings.push(node);
      else tree.set(node.parentId, [node]);
    }
    return tree;
  }, [nodes]);

  return childrenByParent.get(undefined)?.map((node) => (
    <NodeBranch key={node.id} node={node} childrenByParent={childrenByParent} frame={frame} />
  ));
}
