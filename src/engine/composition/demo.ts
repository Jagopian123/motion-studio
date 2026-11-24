import { Easing, interpolate } from 'remotion';

export const DEMO = { fps: 30, durationInFrames: 150, width: 720, height: 1280 };

export function getDemoPose(frame: number, fps: number) {
  const seconds = frame / fps;
  const progress = interpolate(seconds, [0, DEMO.durationInFrames / DEMO.fps], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const orbit = interpolate(progress, [0, 1], [0.38, -0.42]);
  const radius = 6.1 - 0.45 * progress;

  return {
    cameraX: Math.sin(orbit) * radius,
    cameraY: 2.95 - 0.43 * progress,
    cameraZ: Math.cos(orbit) * radius,
    lift: 0.54 + 0.14 * Math.sin(seconds * Math.PI),
    yaw: -0.13 + 0.30 * Math.sin(seconds * 1.1),
    tilt: 0.05 * Math.sin(seconds * Math.PI),
    rightArm: -0.36 - 0.26 * Math.sin(seconds * Math.PI),
    leftArm: 0.28 + 0.18 * Math.cos(seconds * Math.PI),
    ring: seconds * 0.75,
  };
}
