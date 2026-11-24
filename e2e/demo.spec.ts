import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { BlobSource, Input, MP4 } from 'mediabunny';
import { PRESETS, type Preset } from '../src/features/export/settings';

async function openDemo(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Orbit 01' })).toBeVisible();
  await expect(page.getByText('Memeriksa', { exact: true })).toHaveCount(0, { timeout: 20_000 });
}

function diagnostic(page: Page, label: string) {
  return page.locator('.diagnostics-list > div').filter({ has: page.getByText(label, { exact: true }) }).locator('dd');
}

test('mobile preview plays and seeks without horizontal scrolling', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openDemo(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  test.skip(await diagnostic(page, 'WebGL2').textContent() !== 'Tersedia', 'Browser has no WebGL2 context.');
  await expect(page.locator('.portrait canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Putar preview' }).click();
  await expect.poll(async () => Number(await page.getByRole('slider').inputValue())).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Jeda preview' }).click();
  await page.getByRole('slider').press('End');
  await expect(page.getByRole('slider')).toHaveValue('149');
  await page.getByRole('slider').press('Home');
  await expect(page.getByRole('slider')).toHaveValue('0');
  await page.screenshot({ path: testInfo.outputPath('mobile-preview.png'), fullPage: true });
});

test('unavailable WebCodecs disables both MP4 presets and export', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'VideoEncoder', { value: undefined, configurable: true }));
  await openDemo(page);
  for (const label of ['WebCodecs', 'H.264 720p30', 'H.264 540p30']) {
    await expect(diagnostic(page, label)).toHaveText('Tidak tersedia');
  }
  await expect(page.getByRole('button', { name: 'Ekspor MP4' })).toBeDisabled();
  await expect(page.getByText(/Buka di Chrome terbaru melalui HTTPS/)).toBeVisible();
});

test('540p is selected when the browser rejects 720p', async ({ page }) => {
  await page.addInitScript(() => {
    if (typeof VideoEncoder === 'undefined') return;
    const original = VideoEncoder.isConfigSupported.bind(VideoEncoder);
    VideoEncoder.isConfigSupported = (config) => config.width === 720
      ? Promise.resolve({ supported: false, config })
      : original(config);
  });
  await openDemo(page);
  await expect(diagnostic(page, 'H.264 720p30')).toHaveText('Tidak tersedia');
  test.skip(await diagnostic(page, 'H.264 540p30').textContent() !== 'Tersedia', 'Browser has no native H.264 540p30 encoder.');
  await expect(page.getByRole('radio', { name: /540p/ })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Ekspor MP4' })).toBeEnabled();
});

async function verifyMp4(path: string, preset: Preset) {
  const file = await readFile(path);
  const input = new Input({ source: new BlobSource(new Blob([file])), formats: [MP4] });
  try {
    const track = await input.getPrimaryVideoTrack();
    expect(track).not.toBeNull();
    if (!track) throw new Error('Missing video track.');
    expect(await track.getCodec()).toBe('avc');
    expect(await track.getDisplayWidth()).toBe(preset.width);
    expect(await track.getDisplayHeight()).toBe(preset.height);
    expect(await input.getAudioTracks()).toHaveLength(0);
    expect(await input.computeDuration()).toBeCloseTo(5, 2);
    const packets = await track.computePacketStats();
    expect(packets.packetCount).toBe(150);
    expect(packets.averagePacketRate).toBeCloseTo(30, 2);
  } finally {
    input.dispose();
  }
  return file.byteLength;
}

async function verifyPlayback(page: Page, source: string | null) {
  const samples = await page.evaluate(async (src) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 320;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || !src) throw new Error('Playback verification is unavailable.');
    video.muted = true;
    video.playsInline = true;
    video.style.cssText = 'position:fixed;right:0;bottom:0;width:90px';
    document.body.append(video);

    // Wait for decoded frames delivered to the compositor. In Chrome on Windows,
    // seeked can fire before drawImage can read an accelerated video frame.
    const readFrame = (time: number) => new Promise<Uint8ClampedArray>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Video did not present a frame at ${time}s.`)), 8000);
      const frameCallback: VideoFrameRequestCallback = (_, metadata) => {
        if (metadata.mediaTime < time) {
          video.requestVideoFrameCallback(frameCallback);
          return;
        }
        clearTimeout(timeout);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
      };
      video.requestVideoFrameCallback(frameCallback);
    });
    video.src = src;
    video.playbackRate = 2;
    const frames = Promise.all([readFrame(0.16), readFrame(4.7)]);
    const [, [first, last]] = await Promise.all([video.play(), frames]);
    video.pause();
    video.remove();
    const brightPixels = (frame: Uint8ClampedArray, top: number, bottom: number) => {
      let count = 0;
      for (let i = top * canvas.width * 4; i < bottom * canvas.width * 4; i += 4) {
        if (frame[i]! > 120 && frame[i + 1]! > 145 && frame[i + 2]! > 165) count++;
      }
      return count;
    };
    let changed = 0;
    for (let i = 0; i < first.length; i += 4) {
      if (Math.abs(first[i]! - last[i]!) > 28) changed++;
    }
    return { first: brightPixels(first, 57, 240), last: brightPixels(last, 57, 240), title: brightPixels(first, 283, 301), changed };
  }, source);
  expect(samples.first).toBeGreaterThan(600);
  expect(samples.last).toBeGreaterThan(600);
  expect(samples.title).toBeGreaterThan(35);
  expect(samples.changed).toBeGreaterThan(900);
  return samples;
}

for (const preset of PRESETS) {
  test(`downloads and plays an offline five-second ${preset.id} MP4`, async ({ page, context, browser }, testInfo) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => { pageErrors.push(error.message); });
    await openDemo(page);
    test.skip(await diagnostic(page, `H.264 ${preset.id}30`).textContent() !== 'Tersedia', `Browser has no native H.264 ${preset.id}30 encoder.`);
    await page.getByRole('radio', { name: new RegExp(preset.id) }).check();
    if (preset.id === '720p') {
      await expect(page.getByRole('button', { name: 'Putar preview' })).toBeInViewport({ ratio: 1 });
      await page.screenshot({ path: testInfo.outputPath('desktop-preview.png') });
    }

    await context.setOffline(true);
    await page.getByRole('button', { name: 'Ekspor MP4' }).click();
    if (preset.id === '720p') {
      await expect.poll(async () => Number(await page.getByRole('progressbar').getAttribute('value')), { timeout: 30_000 }).toBeGreaterThan(0);
      await page.getByRole('button', { name: 'Batalkan' }).click();
      await expect(page.getByText(/Ekspor dibatalkan/)).toBeVisible();
      await expect(page.getByRole('link', { name: 'Unduh MP4' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Putar preview' })).toBeVisible();
      await page.getByRole('button', { name: 'Coba lagi' }).click();
    }

    const downloadLink = page.getByRole('link', { name: 'Unduh MP4' });
    await expect(downloadLink).toBeVisible({ timeout: 120_000 });
    const summary = await page.getByText('MP4 siap diunduh').locator('..').innerText();
    if (preset.id === '720p') await page.screenshot({ path: testInfo.outputPath('desktop-export.png'), fullPage: true });
    const [download] = await Promise.all([page.waitForEvent('download'), downloadLink.click()]);
    expect(download.suggestedFilename()).toBe(`motion-studio-orbit-01-${preset.id}.mp4`);
    const path = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(path);
    const bytes = await verifyMp4(path, preset);
    const samples = await verifyPlayback(page, await downloadLink.getAttribute('href'));
    expect(pageErrors).toEqual([]);
    console.log(`Chrome ${browser.version()}, ${bytes} bytes. ${summary.replaceAll('\n', ' | ')}. Pixel check: ${JSON.stringify(samples)}`);
  });
}
