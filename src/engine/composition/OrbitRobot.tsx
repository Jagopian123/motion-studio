import { extend } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { getDemoPose } from './demo';

const RoundedBox = extend(RoundedBoxGeometry);
const shell = '#e0e9f5';
const joint = '#1d304c';
const blue = '#78e1ff';

export function OrbitRobot({ pose }: { pose: ReturnType<typeof getDemoPose> }) {
  return (
    <group position={[0, pose.lift, 0]} rotation={[0, pose.yaw, pose.tilt]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[0.28 * side, 0.22, 0]}>
          <mesh>
            <capsuleGeometry args={[0.12, 0.21, 4, 12]} />
            <meshStandardMaterial color={joint} />
          </mesh>
          <mesh position={[0, -0.15, 0.09]}>
            <RoundedBox args={[0.38, 0.20, 0.51, 2, 0.09]} />
            <meshStandardMaterial color={shell} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.72, 0]}>
        <RoundedBox args={[1.03, 0.74, 0.69, 3, 0.23]} />
        <meshStandardMaterial color={shell} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.74, 0.345]}>
        <circleGeometry args={[0.17, 24]} />
        <meshBasicMaterial color="#284d78" />
      </mesh>
      <mesh position={[0, 0.74, 0.35]}>
        <circleGeometry args={[0.092, 20]} />
        <meshBasicMaterial color={blue} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[0.56 * side, 0.91, 0]} rotation={[0, 0, side < 0 ? pose.rightArm : pose.leftArm]}>
          <mesh position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.09, 0.22, 4, 12]} />
            <meshStandardMaterial color={joint} />
          </mesh>
          <mesh position={[0, -0.30, 0]}>
            <RoundedBox args={[0.26, 0.32, 0.29, 2, 0.08]} />
            <meshStandardMaterial color={shell} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.12, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.22, 16]} />
        <meshStandardMaterial color={joint} />
      </mesh>
      <group position={[0, 1.57, 0]} rotation={[0, 0, -pose.tilt * 2]}>
        <mesh>
          <RoundedBox args={[1.49, 0.91, 0.89, 3, 0.25]} />
          <meshStandardMaterial color={shell} roughness={0.36} />
        </mesh>
        <mesh position={[0, 0, 0.408]}>
          <RoundedBox args={[1.21, 0.61, 0.15, 3, 0.075]} />
          <meshStandardMaterial color="#101a38" roughness={0.27} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.26, 0.02, 0.487]}>
            <RoundedBox args={[0.13, 0.19, 0.035, 2, 0.017]} />
            <meshBasicMaterial color={blue} />
          </mesh>
        ))}
        <mesh position={[0, -0.135, 0.487]}>
          <RoundedBox args={[0.18, 0.034, 0.028, 2, 0.014]} />
          <meshBasicMaterial color="#69b4ff" />
        </mesh>
        <mesh position={[0.51, 0.51, 0]} rotation={[0, 0, -0.19]}>
          <cylinderGeometry args={[0.026, 0.035, 0.32, 10]} />
          <meshStandardMaterial color={joint} />
        </mesh>
        <mesh position={[0.54, 0.69, 0]}>
          <sphereGeometry args={[0.08, 10, 8]} />
          <meshBasicMaterial color={blue} />
        </mesh>
      </group>
    </group>
  );
}
