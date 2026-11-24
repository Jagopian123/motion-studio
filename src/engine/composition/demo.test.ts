import { describe, expect, it } from 'vitest';
import { DEMO, getDemoPose } from './demo';

describe('Orbit 01', () => {
  it('runs for five seconds at 30 FPS', () => {
    expect(DEMO.durationInFrames).toBe(150);
    expect(DEMO.durationInFrames / DEMO.fps).toBe(5);
  });

  it('repeats the exact frame pose after a backward seek', () => {
    const first = getDemoPose(27, DEMO.fps);
    expect(getDemoPose(120, DEMO.fps)).not.toEqual(first);
    expect(getDemoPose(27, DEMO.fps)).toEqual(first);
  });

  it('moves the robot, ring, and camera using seconds derived from the frame rate', () => {
    const start = getDemoPose(0, 30);
    const later = getDemoPose(15, 30);
    expect(later).toEqual(getDemoPose(12, 24));
    expect(later.lift).toBeGreaterThan(start.lift);
    expect(later.cameraX).toBeLessThan(start.cameraX);
    expect(later.ring).toBeGreaterThan(start.ring);
  });
});
