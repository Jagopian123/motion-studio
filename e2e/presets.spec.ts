import { expect, test, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { BlobSource, Input, MP4 } from 'mediabunny';

const reference = { button: 'Isi dengan Robot dan Kristal', title: 'Robot dan Kristal Ajaib' };
const laboratory = { button: 'Isi dengan Laboratorium Gerak', title: 'Laboratorium Gerak' };

async function applyStory(page: Page, story: typeof reference) {
  await page.goto('/');
  await page.getByText('Muat demo', { exact: true }).click();
  await page.getByRole('button', { name: story.button }).click();
  await page.getByRole('button', { name: 'Terapkan JSON' }).click();
  await expect(page.getByRole('heading', { name: story.title })).toBeVisible();
}

function diagnostic(page: Page, label: string) {
  return page.getByRole('term').filter({ hasText: label }).locator('..').getByRole('definition');
}

function slider(page: Page) {
  return page.getByRole('slider', { name: 'Posisi frame preview' });
}

async function seek(page: Page, frame: number) {
  await slider(page).evaluate((input: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, frame);
  await expect(slider(page)).toHaveValue(String(frame));
}

async function samplePreview(page: Page) {
  return page.locator('.preview-frame canvas').evaluate((source: HTMLCanvasElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = 54;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set<number>();
    for (let i = 0; i < pixels.length; i += 4) {
      colors.add((pixels[i]! << 16) | (pixels[i + 1]! << 8) | pixels[i + 2]!);
    }
    return { colors: colors.size, png: canvas.toDataURL() };
  });
}

test('copies the published AI guide and offers selectable text if clipboard access fails', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const guide = await readFile('public/ai-guide.md', 'utf8');
  const published = await page.request.get('/ai-guide.md');
  expect(await published.text()).toBe(guide);
  const copy = page.getByRole('button', { name: 'Copy AI Guide' });
  await copy.click();
  await expect(page.getByText(/Panduan disalin/)).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.replaceAll('\r\n', '\n')).toBe(guide.replaceAll('\r\n', '\n'));
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, 'writeText', { value: () => Promise.reject(new DOMException('Denied')) });
  });
  await copy.click();
  await expect(page.getByText(/Clipboard tidak tersedia/)).toBeVisible();
  const fallback = page.getByRole('textbox', { name: 'Panduan JSON v1' });
  await expect(fallback).toHaveValue(guide.replaceAll('\r\n', '\n'));
});

test('previews the three-scene story and the isometric asset lab with deterministic seek at 360 px', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 360, height: 800 });
  await applyStory(page, reference);
  test.skip(await diagnostic(page, 'WebGL2').textContent() !== 'Tersedia', 'Browser has no WebGL2 context.');
  await page.getByRole('tab', { name: 'Scenes' }).click();
  const view = page.locator('.preview-frame');
  const scenes = [
    { id: 'arrival', title: 'Perjalanan dimulai', caption: 'Di planet yang jauh, sebuah robot memulai petualangan.' },
    { id: 'discovery', title: 'Menemukan kristal', caption: 'Ia menemukan kristal yang bersinar terang.' },
    { id: 'joy', title: 'Harapan baru', caption: 'Penemuan kecil bisa membawa harapan besar.' },
  ];
  for (const [index, { id, title, caption }] of scenes.entries()) {
    const start = index * 150;
    await page.getByRole('button', { name: new RegExp(title) }).click();
    await expect(view.locator(`[data-story-scene="${id}"]`)).toHaveCount(1);
    await expect(view.locator('canvas')).toHaveCount(1);
    await expect(slider(page)).toHaveValue(String(start));
    const text = view.getByText(caption);
    await expect(text).toBeVisible();
    const safe = await text.evaluate((element) => {
      const captionBox = element.getBoundingClientRect();
      const canvasBox = element.parentElement!.getBoundingClientRect();
      return captionBox.left > canvasBox.left + canvasBox.width * 0.05
        && captionBox.right < canvasBox.right - canvasBox.width * 0.05
        && captionBox.top > canvasBox.top + canvasBox.height * 0.05
        && captionBox.bottom < canvasBox.bottom - canvasBox.height * 0.05
        && element.scrollHeight <= element.clientHeight + 1;
    });
    expect(safe).toBe(true);

    await expect.poll(async () => (await samplePreview(page)).colors).toBeGreaterThan(70);
    const initial = (await samplePreview(page)).png;
    let last = initial;
    for (const offset of [0, 75, 149]) {
      if (offset) {
        await seek(page, start + offset);
        await expect.poll(async () => (await samplePreview(page)).png).not.toBe(last);
        last = (await samplePreview(page)).png;
      }
      await view.screenshot({ path: testInfo.outputPath(`preview-${id}-${offset}.png`) });
    }
    await seek(page, start);
    await expect.poll(async () => (await samplePreview(page)).png).toBe(initial);
  }
  await slider(page).press('ArrowLeft');
  await expect(slider(page)).toHaveValue('299');
  await expect(view.getByText(scenes[1]!.caption)).toBeVisible();

  await applyStory(page, laboratory);
  await expect(view.getByText(/Melambai: bahu/)).toBeVisible();
  await expect.poll(async () => (await samplePreview(page)).colors).toBeGreaterThan(70);
  const labStart = (await samplePreview(page)).png;
  await view.screenshot({ path: testInfo.outputPath('preview-lab-0.png') });
  await seek(page, 24);
  await expect.poll(async () => (await samplePreview(page)).png).not.toBe(labStart);
  await view.screenshot({ path: testInfo.outputPath('preview-lab-24.png') });
  await seek(page, 143);
  await expect(view.getByText(/Berjalan: kaki/)).toBeVisible();
  await view.screenshot({ path: testInfo.outputPath('preview-lab-143.png') });
  await seek(page, 0);
  await expect.poll(async () => (await samplePreview(page)).png).toBe(labStart);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

for (const { story, size, fps, frames, width, height, times } of [
  { story: laboratory, size: 540, fps: 24, frames: 144, width: 540, height: 540, times: [0.16, 1, 5.7] },
  { story: reference, size: 720, fps: 30, frames: 450, width: 720, height: 1280, times: [0.16, 2.5, 4.75, 5.16, 7.5, 9.75, 10.16, 12.5, 14.75] },
]) {
  test(`exports ${story.title} offline at ${size}p${fps}, verifies metadata and decodes all sampled shots`, async ({ page, browser }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await applyStory(page, story);
    await expect(page.getByText('Memeriksa', { exact: true })).toHaveCount(0, { timeout: 20_000 });
    test.skip(await diagnostic(page, `H.264 ${size}p${fps}`).textContent() !== 'Tersedia', `Native H.264 ${size}p${fps} or WebGL2 is unavailable.`);
    await page.getByRole('button', { name: 'Buka dialog ekspor' }).click();
    await page.getByRole('radio', { name: new RegExp(`${width} × ${height}`) }).check();
    await page.context().setOffline(true);
    await page.getByRole('button', { name: 'Ekspor MP4' }).click();
    const link = page.getByRole('link', { name: 'Unduh MP4' });
    await expect(link).toBeVisible({ timeout: 120_000 });
    const filename = testInfo.outputPath(`preset-${size}p${fps}.mp4`);
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
    await download.saveAs(filename);
    const file = await readFile(filename);
    const input = new Input({ source: new BlobSource(new Blob([file])), formats: [MP4] });
    try {
      const track = await input.getPrimaryVideoTrack();
      if (!track) throw new Error('No video track in the export.');
      expect(await track.getCodec()).toBe('avc');
      expect(await track.getDisplayWidth()).toBe(width);
      expect(await track.getDisplayHeight()).toBe(height);
      expect(await input.getAudioTracks()).toHaveLength(0);
      expect(await input.computeDuration()).toBeCloseTo(frames / fps, 2);
      const { packetCount, averagePacketRate } = await track.computePacketStats();
      expect(packetCount).toBe(frames);
      expect(averagePacketRate).toBeCloseTo(fps, 2);
    } finally {
      input.dispose();
    }

    const samples = await page.evaluate(async ({ url, times, top }) => {
      if (!url) throw new Error('Missing MP4 URL.');
      const video = document.createElement('video');
      video.src = url;
      video.playsInline = true;
      video.muted = true;
      video.playbackRate = 2;
      video.style.cssText = 'position:fixed;right:0;bottom:0;width:90px';
      document.body.append(video);
      const canvas = document.createElement('canvas');
      canvas.height = top ? 200 : 320;
      canvas.width = top ? 200 : 180;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

      function capture(at: number) {
        return new Promise<{ png: string; caption: number; colors: number; mediaTime: number }>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error(`No decoded video frame at ${at}s.`)), 20_000);
          const read: VideoFrameRequestCallback = (_, { mediaTime }) => {
            if (mediaTime < at) {
              video.requestVideoFrameCallback(read);
              return;
            }
            clearTimeout(timeout);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let caption = 0;
            const colors = new Set<number>();
            for (let i = 0; i < data.length; i += 4) {
              const row = Math.floor(i / (4 * canvas.width)) / canvas.height;
              const [r, g, b] = [data[i]!, data[i + 1]!, data[i + 2]!];
              if (row > 0.22 && row < 0.75) colors.add((r << 16) | (g << 8) | b);
              const captionBand = top ? row >= 0.07 && row < 0.22 : row > 0.80 && row <= 0.93;
              if (captionBand && r > 180 && g > 180 && b > 180) caption++;
            }
            resolve({ png: canvas.toDataURL(), caption, colors: colors.size, mediaTime });
          };
          video.requestVideoFrameCallback(read);
        });
      }

      try {
        const [, snapshots] = await Promise.all([video.play(), Promise.all(times.map(capture))]);
        return snapshots;
      } finally {
        video.pause();
        video.remove();
      }
    }, { url: await link.getAttribute('href'), times, top: story === laboratory });
    for (const [index, sample] of samples.entries()) {
      expect(sample.mediaTime).toBeLessThan(times[index]! + 0.24);
      expect(sample.caption).toBeGreaterThan(25);
      expect(sample.colors).toBeGreaterThan(70);
      await writeFile(testInfo.outputPath(`decoded-${index}.png`), Buffer.from(sample.png.split(',')[1]!, 'base64'));
    }
    expect(new Set(samples.map(({ png }) => png)).size).toBe(times.length);
    expect(errors).toEqual([]);
    const summary = await page.getByText('MP4 siap diunduh').locator('..').innerText();
    console.log(`Chrome ${browser.version()}, ${file.byteLength} bytes, duration ${frames / fps}s. ${summary.replaceAll('\n', ' | ')}`);
  });
}
