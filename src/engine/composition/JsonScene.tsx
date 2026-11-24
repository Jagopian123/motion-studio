import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Caption, StoryScene } from '../schema/story-v1';
import { SceneCamera } from '../scene/SceneCamera';
import { SceneNodes } from '../scene/SceneNodes';
import { getCaptionAtFrame } from '../timeline/scenes';

const rendererOptions = { antialias: true, preserveDrawingBuffer: true, alpha: false };
const cameraOptions = { near: 0.01, far: 512, manual: true };

function CaptionOverlay({ caption, width, height }: { caption: Caption; width: number; height: number }) {
  const scale = Math.min(width, height) / 1080;
  // Limit long captions so even dense text has room to wrap inside the safe area.
  const fontSize = Math.min(caption.fontSize * scale, Math.sqrt(width * height * 0.43 / Math.max(1, caption.text.length)));
  return (
    <div
      style={{
        position: 'absolute',
        [caption.placement]: '7%',
        left: '7%',
        right: '7%',
        padding: `${10 * scale}px ${18 * scale}px`,
        borderRadius: 12 * scale,
        backgroundColor: 'rgba(6, 13, 26, 0.82)',
        color: caption.color,
        fontFamily: 'sans-serif',
        fontSize,
        lineHeight: 1.25,
        fontWeight: 700,
        textAlign: 'center',
        overflowWrap: 'anywhere',
        pointerEvents: 'none',
      }}
    >
      {caption.text}
    </div>
  );
}

export function JsonScene({ scene }: { scene: StoryScene }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { world, lighting } = scene;
  const caption = getCaptionAtFrame(scene.captions, frame);
  return (
    <AbsoluteFill data-story-scene={scene.id} style={{ backgroundColor: world.background }}>
      <ThreeCanvas width={width} height={height} dpr={1} frameloop="demand" gl={rendererOptions} camera={cameraOptions} orthographic={scene.camera.type === 'orthographic'}>
        <color attach="background" args={[world.background]} />
        {world.fog && <fog attach="fog" args={[world.fog.color, world.fog.near, world.fog.far]} />}
        <SceneCamera camera={scene.camera} frame={frame} aspect={width / height} />
        <ambientLight {...lighting.ambient} />
        <directionalLight {...lighting.directional} />
        {lighting.fill && <directionalLight {...lighting.fill} />}
        {world.ground && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[400, 400]} />
            <meshStandardMaterial color={world.groundColor} roughness={1} />
          </mesh>
        )}
        <SceneNodes nodes={scene.nodes} frame={frame} />
      </ThreeCanvas>
      {caption && <CaptionOverlay caption={caption} width={width} height={height} />}
    </AbsoluteFill>
  );
}
