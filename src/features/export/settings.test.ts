import { describe, expect, it } from 'vitest';
import { canRetryWithBrowserEncoder, describeRenderError, estimateRemaining, getPresets, isMp4 } from './settings';

describe('browser export settings', () => {
  it.each([
    ['9:16', [[720, 1280], [540, 960], [1080, 1920]]],
    ['16:9', [[1280, 720], [960, 540], [1920, 1080]]],
    ['1:1', [[720, 720], [540, 540], [1080, 1080]]],
  ] as const)('maps %s to even dimensions for all presets', (ratio, dimensions) => {
    expect(getPresets(ratio).map(({ width, height }) => [width, height])).toEqual(dimensions);
  });

  it('allows a browser-selected encoder retry only for relevant failures', () => {
    expect(canRetryWithBrowserEncoder(new DOMException('failure', 'EncodingError'))).toBe(true);
    expect(canRetryWithBrowserEncoder(new Error('Could not create encoder'))).toBe(true);
    expect(canRetryWithBrowserEncoder(new Error('Output MP4 tidak valid.'))).toBe(false);
    expect(canRetryWithBrowserEncoder(new DOMException('abort', 'AbortError'))).toBe(false);
  });

  it('returns help specific to common rendering failures', () => {
    expect(describeRenderError(new Error('WebGL context lost'))).toContain('WebGL');
    expect(describeRenderError(new Error('Out of memory'))).toContain('Memori');
    expect(describeRenderError(new Error('delayRender timeout'))).toContain('batas waktu');
    expect(describeRenderError(new DOMException('write', 'QuotaExceededError'))).toContain('Kuota');
    expect(describeRenderError(new Error('audio codec failed'))).toContain('AAC');
    expect(describeRenderError(new Error('cannot decode audio'))).toContain('ganti file MP3/WAV');
    expect(describeRenderError(new DOMException('Video', 'NotSupportedError'))).toContain('H.264');
  });

  it('starts ETA only after measuring actual frame throughput', () => {
    expect(estimateRemaining(1000, 0, 150)).toBeNull();
    expect(estimateRemaining(800, 10, 150)).toBeNull();
    expect(estimateRemaining(2000, 50, 150)).toBe(4000);
    expect(estimateRemaining(2000, 150, 150)).toBeNull();
  });

  it('checks the MP4 file signature as well as the MIME type', async () => {
    expect(await isMp4(new Blob(['\x00\x00\x00\x18ftypisom'], { type: 'video/mp4' }))).toBe(true);
    expect(await isMp4(new Blob(['\x1a\x45\xdf\xa3webm'], { type: 'video/mp4' }))).toBe(false);
    expect(await isMp4(new Blob(['\x00\x00\x00\x18ftypisom'], { type: 'video/webm' }))).toBe(false);
  });
});
