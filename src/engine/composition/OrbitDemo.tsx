import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import { useLayoutEffect } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { DEMO, getDemoPose } from './demo';
import { OrbitRobot } from './OrbitRobot';

const sky = '#111d36';
const cameraOptions = { fov: 41, near: 0.1, far: 70 };
const rendererOptions = { antialias: true, preserveDrawingBuffer: true, alpha: false };

function OrbitCamera({ x, y, z }: { x: number; y: number; z: number }) {
  const camera = useThree((state) => state.camera);
  useLayoutEffect(() => {
    camera.position.set(x, y, z);
    camera.lookAt(0, 1.28, 0);
  }, [camera, x, y, z]);
  return null;
}

export function OrbitDemo() {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const pose = getDemoPose(frame, fps);
  const textScale = width / DEMO.width;

  return (
    <AbsoluteFill style={{ backgroundColor: sky }}>
      <ThreeCanvas width={width} height={height} dpr={1} frameloop="demand" gl={rendererOptions} camera={cameraOptions}>
        <color attach="background" args={[sky]} />
        <fog attach="fog" args={[sky, 5, 21]} />
        <OrbitCamera x={pose.cameraX} y={pose.cameraY} z={pose.cameraZ} />
        <hemisphereLight args={['#b4ddff', '#292759', 1.85]} />
        <directionalLight color="#fff0e2" intensity={2.5} position={[3, 6, 4]} />
        <directionalLight color="#38aaff" intensity={2.1} position={[-3, 2, -4]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.30, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#142847" roughness={1} />
        </mesh>
        <gridHelper args={[38, 38, '#345a7e', '#284767']} position={[0, -0.295, 0]} />
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[1.22, 1.34, 0.35, 48]} />
          <meshStandardMaterial color="#233751" metalness={0.3} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.065, 0]}>
          <cylinderGeometry args={[1.12, 1.18, 0.08, 48]} />
          <meshStandardMaterial color="#263f64" metalness={0.2} roughness={0.66} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.11, 0]}>
          <ringGeometry args={[1.00, 1.03, 48]} />
          <meshBasicMaterial color="#4bbbf6" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.112, 0.05]} scale={[1, 0.73, 1]}>
          <circleGeometry args={[0.57, 24]} />
          <meshBasicMaterial color="#142238" transparent opacity={0.55} depthWrite={false} />
        </mesh>
        <group rotation={[0, pose.ring, 0]}>
          {[0, Math.PI, Math.PI / 2, -Math.PI / 2].map((angle) => (
            <mesh key={angle} position={[Math.sin(angle) * 1.12, 0.14, Math.cos(angle) * 1.12]} rotation={[0, angle, 0]}>
              <boxGeometry args={[0.13, 0.038, 0.074]} />
              <meshBasicMaterial color="#a3f5ff" />
            </mesh>
          ))}
        </group>
        <OrbitRobot pose={pose} />
      </ThreeCanvas>
      <div style={{ position: 'absolute', top: 86 * textScale, left: 58 * textScale, color: '#a2e4ff', fontFamily: 'monospace', fontSize: 22 * textScale, letterSpacing: 4 * textScale }}>
        MOTION STUDIO
      </div>
      <div style={{ position: 'absolute', bottom: 83 * textScale, left: 58 * textScale, color: '#f5f9ff', fontFamily: 'sans-serif', fontSize: 66 * textScale, fontWeight: 700 }}>
        Orbit 01
      </div>
    </AbsoluteFill>
  );
}
