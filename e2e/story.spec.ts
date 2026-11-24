import { expect, test, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { BlobSource, Input, MP4 } from 'mediabunny';
import { getPresets } from '../src/features/export/settings';

async function applyDemo(page: Page, landscape = false) {
  await page.goto('/');
  await page.getByText('Muat demo', { exact: true }).click();
  await page.getByRole('button', { name: 'Isi dengan demo JSON' }).click();
  const editor = page.getByRole('textbox', { name: 'JSON cerita' });
  if (landscape) {
    const project = JSON.parse(await editor.inputValue());
    project.aspectRatio = '16:9';
    project.fps = 24;
    await editor.fill(JSON.stringify(project));
  }
  await page.getByRole('button', { name: 'Terapkan JSON' }).click();
  await expect(page.getByRole('heading', { name: 'Observatorium Prisma' })).toBeVisible();
}

function diagnostic(page: Page, name: string) {
  return page.locator('.diagnostics-list > div').filter({ has: page.getByText(name, { exact: true }) }).locator('dd');
}

async function previewPixels(page: Page) {
  return page.locator('.preview-frame canvas').evaluate((canvas: HTMLCanvasElement) => {
    const sample = document.createElement('canvas');
    sample.width = 48;
    sample.height = 64;
    const ctx = sample.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0, 48, 64);
    const data = ctx.getImageData(0, 0, 48, 64).data;
    let bright = 0;
    for (let offset = 0; offset < data.length; offset += 4) {
      if (Math.max(data[offset]!, data[offset + 1]!, data[offset + 2]!) > 170) bright++;
    }
    return { bright, image: sample.toDataURL() };
  });
}

test('JSON import, path errors and deterministic scene seek on a 360px viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await applyDemo(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const editor = page.getByRole('textbox', { name: 'JSON cerita' });
  const source = await editor.inputValue();
  await editor.fill('{');
  await page.getByRole('button', { name: 'Terapkan JSON' }).click();
  await expect(page.getByRole('alert')).toContainText('Sintaks JSON tidak valid');
  await expect(page.getByRole('heading', { name: 'Observatorium Prisma' })).toBeVisible();

  await editor.fill(source.replace('"orthoSize": 6.8', '"orthoSize": 6.8, "extra": true'));
  await page.getByRole('button', { name: 'Terapkan JSON' }).click();
  await expect(page.getByRole('alert')).toContainText('scenes[1].camera.keyframes[0].extra');

  await editor.fill((await readFile('example-story.json', 'utf8')).replace('"preset": "robot"', '"preset": "spaceship"'));
  await page.getByRole('button', { name: 'Terapkan JSON' }).click();
  await expect(page.getByRole('alert')).toContainText('scenes[0].nodes[0].preset');
  await expect(page.getByRole('alert')).toContainText('Preset v1 yang didukung');
  await expect(page.getByRole('heading', { name: 'Observatorium Prisma' })).toBeVisible();

  test.skip(await diagnostic(page, 'WebGL2').textContent() !== 'Tersedia', 'Browser has no WebGL2 context.');
  await page.getByRole('tab', { name: 'Scenes' }).click();
  const canvas = page.locator('.preview-frame canvas');
  const slider = page.getByRole('slider', { name: 'Posisi frame preview' });
  const first = page.getByRole('button', { name: /Prisma bangkit/ });
  const second = page.getByRole('button', { name: /Orbit satelit/ });
  await expect(canvas).toHaveCount(1);
  await expect.poll(async () => (await previewPixels(page)).bright).toBeGreaterThan(20);
  const start = (await previewPixels(page)).image;
  await expect(page.getByText('Prisma mulai terangkat.')).toBeVisible();
  await page.locator('.preview-frame').screenshot({ path: testInfo.outputPath('preview-prisma.png') });

  await second.click();
  await expect(slider).toHaveValue('90');
  await expect(second).toHaveAttribute('aria-current', 'step');
  await expect(page.getByText('Satelit memasuki orbit.')).toBeVisible();
  await expect(canvas).toHaveCount(1);
  await expect.poll(async () => (await previewPixels(page)).bright).toBeGreaterThan(20);
  expect((await previewPixels(page)).image).not.toBe(start);
  await page.locator('.preview-frame').screenshot({ path: testInfo.outputPath('preview-orbit.png') });

  await slider.press('ArrowLeft');
  await expect(slider).toHaveValue('89');
  await expect(first).toHaveAttribute('aria-current', 'step');
  await expect(page.getByText('Cincin menangkap cahaya.')).toBeVisible();
  await expect.poll(async () => (await previewPixels(page)).image).not.toBe(start);
  await first.click();
  await expect(slider).toHaveValue('0');
  await expect.poll(async () => (await previewPixels(page)).image).toBe(start);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);

  await page.getByRole('tab', { name: 'Story' }).click();
  await page.getByText('Muat demo', { exact: true }).click();
  await page.getByRole('button', { name: 'Gunakan Orbit 01' }).click();
  await expect(page.getByRole('heading', { name: 'Orbit 01' })).toBeVisible();
  await expect(slider).toHaveAttribute('max', '149');
});

for (const landscape of [false, true]) {
  const fps = landscape ? 24 : 30;
  test(`exports both imported scenes as H.264 MP4 at ${fps} FPS`, async ({ page, browser }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await applyDemo(page, landscape);
    await expect(page.getByText('Memeriksa', { exact: true })).toHaveCount(0, { timeout: 20_000 });
    const presets = getPresets(landscape ? '16:9' : '9:16');
    const selected = landscape ? presets[1] : presets[0];
    test.skip(await diagnostic(page, `H.264 ${selected.id}${fps}`).textContent() !== 'Tersedia', `Native H.264 ${selected.id} at ${fps} FPS or WebGL2 is unavailable.`);
    await page.getByRole('button', { name: 'Buka dialog ekspor' }).click();
    const radio = page.getByRole('radio', { name: new RegExp(`${selected.width} × ${selected.height}`) });
    await radio.check();
    await page.context().setOffline(true);
    await page.getByRole('button', { name: 'Ekspor MP4' }).click();
    await expect(page.getByRole('button', { name: 'Terapkan JSON', includeHidden: true })).toBeDisabled();
    const link = page.getByRole('link', { name: 'Unduh MP4' });
    await expect(link).toBeVisible({ timeout: 120_000 });
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
    expect(download.suggestedFilename()).toBe(`motion-studio-cerita-json-${selected.id}.mp4`);
    const path = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(path);

    const file = await readFile(path);
    const input = new Input({ source: new BlobSource(new Blob([file])), formats: [MP4] });
    try {
      const track = await input.getPrimaryVideoTrack();
      if (!track) throw new Error('Missing video track.');
      expect(await track.getCodec()).toBe('avc');
      expect(await track.getDisplayWidth()).toBe(selected.width);
      expect(await track.getDisplayHeight()).toBe(selected.height);
      expect(await input.getAudioTracks()).toHaveLength(0);
      expect(await input.computeDuration()).toBeCloseTo(180 / fps, 2);
      const packets = await track.computePacketStats();
      expect(packets.packetCount).toBe(180);
      expect(packets.averagePacketRate).toBeCloseTo(fps, 2);
    } finally {
      input.dispose();
    }

    if (!landscape) {
      const samples = await page.evaluate(async ({ src, sceneCut }) => {
        if (!src) throw new Error('MP4 object URL is unavailable.');
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 320;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        video.muted = true;
        video.playsInline = true;
        video.style.cssText = 'position:fixed;right:0;bottom:0;width:90px';
        document.body.append(video);

        function sample(time: number) {
          return new Promise<{ png: string; blue: number; orange: number; top: number; bottom: number }>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error(`No video frame at ${time}s.`)), 10_000);
            const read: VideoFrameRequestCallback = (_, metadata) => {
              if (metadata.mediaTime < time) {
                video.requestVideoFrameCallback(read);
                return;
              }
              clearTimeout(timeout);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
              let blue = 0;
              let orange = 0;
              let top = 0;
              let bottom = 0;
              for (let index = 0; index < pixels.length; index += 4) {
                const y = Math.floor(index / (canvas.width * 4));
                const [r, g, b] = [pixels[index]!, pixels[index + 1]!, pixels[index + 2]!];
                if (y > 70 && y < 245 && b > 150 && g > r + 30) blue++;
                if (y > 70 && y < 245 && r > 155 && r > g + 22 && g > b + 15) orange++;
                if (r > 175 && g > 165 && b > 130) {
                  if (y >= 20 && y < 55) top++;
                  if (y >= 270 && y < 300) bottom++;
                }
              }
              resolve({ png: canvas.toDataURL(), blue, orange, top, bottom });
            };
            video.requestVideoFrameCallback(read);
          });
        }

        video.src = src;
        video.playbackRate = 2;
        const snapshots = Promise.all([sample(0.16), sample(sceneCut - 0.22), sample(sceneCut), sample(5.7)]);
        try {
          const [, result] = await Promise.all([video.play(), snapshots]);
          return result;
        } finally {
          video.pause();
          video.remove();
        }
      }, { src: await link.getAttribute('href'), sceneCut: 90 / fps });

      const [first, beforeCut, afterCut, last] = samples;
      for (const sample of [first!, beforeCut!]) {
        expect(sample.blue).toBeGreaterThan(100);
        expect(sample.bottom).toBeGreaterThan(45);
      }
      for (const sample of [afterCut!, last!]) {
        expect(sample.orange).toBeGreaterThan(100);
        expect(sample.top).toBeGreaterThan(45);
      }
      expect(first!.png).not.toBe(beforeCut!.png);
      expect(afterCut!.png).not.toBe(last!.png);
      await Promise.all(samples.map(({ png }, index) => writeFile(
        testInfo.outputPath(`decoded-${index}.png`), Buffer.from(png.split(',')[1]!, 'base64'),
      )));
      console.log('Decoded frame pixel counts:', samples.map(({ blue, orange, top, bottom }) => ({ blue, orange, top, bottom })));
    }

    expect(errors).toEqual([]);
    const summary = await page.getByText('MP4 siap diunduh').locator('..').innerText();
    console.log(`Chrome ${browser.version()}, ${file.byteLength} bytes, duration ${180 / fps}s. ${summary.replaceAll('\n', ' | ')}`);
  });
}
