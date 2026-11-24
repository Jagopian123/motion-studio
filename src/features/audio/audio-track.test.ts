import { expect, it } from 'vitest';
import { validAudioSettings } from './audio-track';

it('accepts whole global frames inside the project and finite unit volume', () => {
  expect(validAudioSettings({ startFrame: 0, volume: 0 }, 150)).toBe(true);
  expect(validAudioSettings({ startFrame: 149, volume: 1 }, 150)).toBe(true);
  for (const startFrame of [-1, 0.5, 150, Infinity, NaN]) {
    expect(validAudioSettings({ startFrame, volume: 0.5 }, 150)).toBe(false);
  }
  for (const volume of [-0.01, 1.01, Infinity, NaN]) {
    expect(validAudioSettings({ startFrame: 0, volume }, 150)).toBe(false);
  }
});
