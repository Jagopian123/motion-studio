import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { AudioSample, AudioSampleSource, BlobSource, BufferTarget, Input, MP4, Mp3OutputFormat, Output } from 'mediabunny';
import { registerMp3Encoder } from '@mediabunny/mp3-encoder';

const sampleRate = 24_000;
const exportButton = (page: Page) => page.getByRole('button', { name: 'Buka dialog ekspor' });
const audioTab = (page: Page) => page.getByRole('tab', { name: 'Audio' });
const diagnostic = (page: Page, label: string) => page.locator('.diagnostics-list > div')
  .filter({ has: page.getByText(label, { exact: true }) }).locator('dd');

function wav(seconds: number, frequency = 320) {
  const samples = seconds * sampleRate;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(12_000 * Math.sin(2 * Math.PI * frequency * i / sampleRate)), 44 + i * 2);
  return buffer;
}

let music: Buffer | undefined;
async function mp3() {
  if (music) return music;
  registerMp3Encoder();
  const target = new BufferTarget();
  const output = new Output({ format: new Mp3OutputFormat(), target });
  const source = new AudioSampleSource({ codec: 'mp3', bitrate: 64_000 });
  output.addAudioTrack(source);
  await output.start();
  const data = Float32Array.from({ length: 16 * sampleRate }, (_, i) => 0.36 * Math.sin(2 * Math.PI * 690 * i / sampleRate));
  const sample = new AudioSample({ data, format: 'f32', sampleRate, numberOfChannels: 1, timestamp: 0 });
  try {
    await source.add(sample);
    await output.finalize();
  } finally {
    sample.close();
  }
  if (!target.buffer) throw new Error('MP3 test fixture was not encoded.');
  music = Buffer.from(target.buffer);
  return music;
}

async function openStory(page: Page, duration: number) {
  const story = JSON.parse(await readFile('example-story.json', 'utf8'));
  story.title = `Uji audio ${duration} detik`;
  story.scenes = story.scenes.slice(0, duration / 5);
  await page.goto('/');
  await page.getByRole('textbox', { name: 'JSON cerita' }).fill(JSON.stringify(story));
  await page.getByRole('button', { name: 'Terapkan JSON' }).click();
  await expect(page.getByRole('heading', { name: story.title })).toBeVisible();
}

async function addNarration(page: Page, startFrame = 30) {
  await audioTab(page).click();
  await page.getByLabel('Pilih file narasi').setInputFiles({ name: 'narasi.wav', mimeType: 'audio/wav', buffer: wav(16) });
  await expect(page.getByText('narasi.wav', { exact: true })).toBeVisible();
  await page.getByLabel('Frame mulai narasi').fill(String(startFrame));
  const volume = page.getByLabel(/^Volume narasi/);
  await volume.focus();
  await volume.press('Home');
  for (let i = 0; i < 5; i++) await volume.press('PageUp');
  await expect(volume).toHaveValue('0.5');
  await page.getByRole('button', { name: 'Simpan pengaturan narasi' }).click();
  await expect(page.getByRole('button', { name: 'Simpan pengaturan narasi' })).toBeDisabled();
}

async function openExport(page: Page) {
  await expect(page.getByText('Memeriksa', { exact: true })).toHaveCount(0, { timeout: 30_000 });
  await exportButton(page).click();
  return page.getByRole('dialog', { name: 'Ekspor video' });
}

async function verifyDownload(page: Page, info: TestInfo, seconds: number, withAudio: boolean, musicStart = 0) {
  const link = page.getByRole('link', { name: 'Unduh MP4' });
  await expect(link).toBeVisible({ timeout: 120_000 });
  const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
  expect(download.suggestedFilename()).toBe('motion-studio-cerita-json-720p.mp4');
  const path = info.outputPath(download.suggestedFilename());
  await download.saveAs(path);
  const file = await readFile(path);
  const input = new Input({ source: new BlobSource(new Blob([file])), formats: [MP4] });
  try {
    const video = await input.getPrimaryVideoTrack();
    expect(await video?.getCodec()).toBe('avc');
    expect(await video?.getDisplayWidth()).toBe(720);
    expect(await video?.getDisplayHeight()).toBe(1280);
    expect((await video?.computePacketStats())?.packetCount).toBe(seconds * 30);
    expect(await video?.computeDuration()).toBeCloseTo(seconds, 3);
    const tracks = await input.getAudioTracks();
    expect(tracks).toHaveLength(withAudio ? 1 : 0);
    if (withAudio) {
      const audio = tracks[0]!;
      expect(await audio.getCodec()).toBe('aac');
      expect(Math.abs(await audio.computeDuration() - seconds)).toBeLessThanOrEqual(1 / 30);
    }
  } finally {
    input.dispose();
  }

  const result = await page.evaluate(async ({ src, withAudio, seconds, musicStart }) => {
    if (!src) throw new Error('Missing MP4 URL');
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.src = src;
    document.body.append(video);
    try {
      const frame = new Promise<{ width: number; captionPixels: number }>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('No decoded video frame')), 8000);
        video.requestVideoFrameCallback((_, metadata) => {
          clearTimeout(timeout);
          const canvas = document.createElement('canvas');
          canvas.width = 180;
          canvas.height = 320;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(video, 0, 0, 180, 320);
          const pixels = ctx.getImageData(10, 265, 160, 33).data;
          let captionPixels = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i]! > 200 && pixels[i + 1]! > 200 && pixels[i + 2]! > 200) captionPixels++;
          }
          resolve({ width: metadata.width, captionPixels });
        });
      });
      const [, visual] = await Promise.all([video.play(), frame]);
      video.pause();
      if (!withAudio) return { ...visual, audio: null };
      const context = new OfflineAudioContext(1, 1, 48_000);
      const decoded = await context.decodeAudioData(await (await fetch(src)).arrayBuffer());
      const data = decoded.getChannelData(0);
      function amplitude(time: number, frequency: number) {
        let re = 0;
        let im = 0;
        const start = Math.round(time * decoded.sampleRate);
        const size = Math.round(decoded.sampleRate / 10);
        for (let i = 0; i < size; i++) {
          const phase = 2 * Math.PI * frequency * i / decoded.sampleRate;
          re += data[start + i]! * Math.cos(phase);
          im += data[start + i]! * Math.sin(phase);
        }
        return 2 * Math.hypot(re, im) / size;
      }
      return { ...visual, audio: {
        beforeNarration: amplitude(0.8, 320),
        afterNarration: amplitude(1.1, 320),
        beforeMusic: amplitude(musicStart - 0.2, 690),
        afterMusic: amplitude(musicStart + 0.12, 690),
        narrationAtEnd: amplitude(seconds - 0.18, 320),
        musicAtEnd: amplitude(seconds - 0.18, 690),
      } };
    } finally {
      video.pause();
      video.remove();
    }
  }, { src: await link.getAttribute('href'), withAudio, seconds, musicStart });
  expect(result.width).toBe(720);
  expect(result.captionPixels).toBeGreaterThan(35);
  if (withAudio) {
    expect(result.audio?.beforeNarration).toBeLessThan(0.009);
    expect(result.audio?.afterNarration).toBeGreaterThan(0.11);
    expect(result.audio?.afterNarration).toBeLessThan(0.24);
    expect(result.audio?.beforeMusic).toBeLessThan(0.009);
    expect(result.audio?.afterMusic).toBeGreaterThan(0.045);
    expect(result.audio?.afterMusic).toBeLessThan(0.13);
    expect(result.audio?.narrationAtEnd).toBeGreaterThan(0.11);
    expect(result.audio?.musicAtEnd).toBeGreaterThan(0.045);
  }
  const resultNotice = await page.getByText('MP4 siap diunduh').locator('..').innerText();
  console.log(`${seconds}s · ${file.byteLength} byte · ${resultNotice.replaceAll('\n', ' | ')} · ${JSON.stringify(result.audio)}`);
}

test('validates local files, preserves and duplicates their settings, and removes them across reloads', async ({ page }, info) => {
  await page.addInitScript(() => {
    const { createObjectURL, revokeObjectURL } = URL;
    const audioUrls = new Set<string>();
    Reflect.set(window, 'motionAudioUrls', audioUrls);
    URL.createObjectURL = (object) => {
      const url = createObjectURL(object);
      if (object instanceof Blob && object.type.startsWith('audio/')) audioUrls.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      audioUrls.delete(url);
      revokeObjectURL(url);
    };
  });
  const countAudioUrls = () => page.evaluate(() => (Reflect.get(window, 'motionAudioUrls') as Set<string>).size);
  await page.setViewportSize({ width: 360, height: 800 });
  await openStory(page, 10);
  await addNarration(page, 180);
  const musicFile = page.getByLabel('Pilih file musik');
  await musicFile.setInputFiles({ name: 'invalid.wav', mimeType: 'text/plain', buffer: Buffer.from('no audio') });
  await expect(page.getByRole('alert')).toContainText('MIME');
  await musicFile.setInputFiles({ name: 'invalid.wav', mimeType: 'audio/wav', buffer: Buffer.from('no audio') });
  await expect(page.getByRole('alert')).toContainText('gagal didekode');
  await musicFile.setInputFiles({ name: 'large.wav', mimeType: 'audio/wav', buffer: Buffer.alloc(25 * 1024 * 1024 + 1) });
  await expect(page.getByRole('alert')).toContainText('25 MiB');
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'audioAssets') {
        IDBObjectStore.prototype.put = put;
        throw new DOMException('Test audio storage quota', 'QuotaExceededError');
      }
      return put.apply(this, args);
    };
  });
  await musicFile.setInputFiles({ name: 'musik.mp3', mimeType: 'audio/mpeg', buffer: await mp3() });
  await expect(page.getByRole('alert')).toContainText('Penyimpanan browser penuh');
  await expect(musicFile).toBeEnabled();
  await musicFile.setInputFiles({ name: 'musik.mp3', mimeType: 'audio/mpeg', buffer: await mp3() });
  await expect(page.getByText('musik.mp3', { exact: true })).toBeVisible();
  await expect(page.getByLabel(/^Volume musik/)).toHaveValue('0.25');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(countAudioUrls).toBe(2);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('audio-360.png'), fullPage: true });

  await page.reload();
  await audioTab(page).click();
  await expect(page.getByLabel('Frame mulai narasi')).toHaveValue('180');
  await expect(page.getByLabel(/^Volume narasi/)).toHaveValue('0.5');
  await expect(page.getByText('musik.mp3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Proyek', exact: true }).click();
  await page.getByRole('button', { name: 'Duplikat' }).click();
  await expect(page.getByRole('heading', { name: /salinan/ })).toBeVisible();
  await audioTab(page).click();
  await expect(page.getByLabel('Frame mulai narasi')).toHaveValue('180');
  const replacement = page.getByLabel('Ganti file narasi');
  await replacement.setInputFiles({ name: 'invalid.wav', mimeType: 'audio/wav', buffer: Buffer.from('no audio') });
  await expect(page.getByRole('alert')).toContainText('gagal didekode');
  await expect(page.getByText('narasi.wav', { exact: true })).toBeVisible();
  await replacement.setInputFiles({ name: 'narasi-baru.wav', mimeType: '', buffer: wav(10) });
  await expect(page.getByText('narasi-baru.wav', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Frame mulai narasi')).toHaveValue('180');
  await page.getByRole('button', { name: 'Hapus narasi', exact: true }).click();
  await expect(page.getByLabel('Pilih file narasi')).toBeEnabled();
  await expect.poll(countAudioUrls).toBe(1);
  await page.reload();
  await audioTab(page).click();
  await expect(page.getByLabel('Pilih file narasi')).toBeEnabled();
  await expect(page.getByText('musik.mp3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Proyek', exact: true }).click();
  await page.getByRole('button', { name: 'Uji audio 10 detik', exact: true }).click();
  await audioTab(page).click();
  await expect(page.getByText('narasi.wav', { exact: true })).toBeVisible();
  await expect.poll(countAudioUrls).toBe(2);
  await page.getByRole('tab', { name: 'Story' }).click();
  await page.getByText('Muat demo', { exact: true }).click();
  await page.getByRole('button', { name: 'Gunakan Orbit 01' }).click();
  await expect(page.getByRole('heading', { name: 'Orbit 01' })).toBeVisible();
  await expect.poll(countAudioUrls).toBe(0);
});

test('shortening a story retains the track and requires fixing the global offset or opting out', async ({ page }) => {
  await openStory(page, 10);
  await addNarration(page, 180);
  await page.getByRole('tab', { name: 'Story' }).click();
  const editor = page.getByRole('textbox', { name: 'JSON cerita' });
  const shortened = JSON.parse(await editor.inputValue());
  shortened.scenes = shortened.scenes.slice(0, 1);
  await editor.fill(JSON.stringify(shortened));
  await page.getByRole('button', { name: 'Terapkan JSON' }).click();
  await audioTab(page).click();
  await expect(page.getByRole('tabpanel', { name: 'Audio' })).toContainText('Posisi mulai berada di luar proyek');
  await expect(page.getByLabel('Frame mulai narasi')).toHaveValue('180');
  const dialog = await openExport(page);
  await expect(dialog.getByRole('button', { name: 'Ekspor MP4' })).toBeDisabled();
  await expect(dialog.getByText(/Ada track yang mulai di luar durasi/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Tutup dialog' }).click();
  await page.getByLabel('Frame mulai narasi').fill('90');
  await page.getByRole('button', { name: 'Simpan pengaturan narasi' }).click();
  await expect(page.getByText('Siap · Mulai 3.00 dtk')).toBeVisible();
});

test('preview plays project-global audio after seeking across a scene cut', async ({ page }) => {
  await page.addInitScript(() => {
    // Observe the actual Player mix in parallel with the physical output.
    const connect = AudioNode.prototype.connect;
    Object.defineProperty(AudioNode.prototype, 'connect', {
      value: function (this: AudioNode, destination: AudioNode | AudioParam, ...args: number[]) {
        if (destination instanceof AudioDestinationNode && this.context instanceof AudioContext) {
          const analyser = this.context.createAnalyser();
          Reflect.apply(connect, this, [analyser]);
          Reflect.set(window, 'motionTestAnalyser', analyser);
        }
        return Reflect.apply(connect, this, [destination, ...args]);
      },
    });
  });
  await openStory(page, 10);
  test.skip(await diagnostic(page, 'WebGL2').textContent() !== 'Tersedia', 'Browser has no WebGL2 context.');
  await addNarration(page, 120);
  await page.getByRole('tab', { name: 'Scenes' }).click();
  await page.getByRole('button', { name: /Menemukan kristal/ }).click();
  const slider = page.getByRole('slider', { name: 'Posisi frame preview' });
  await expect(slider).toHaveValue('150');
  const readLevel = () => page.evaluate(() => {
    const analyser = Reflect.get(window, 'motionTestAnalyser') as AnalyserNode | undefined;
    if (!analyser) return -1;
    const waveform = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(waveform);
    return Math.sqrt(waveform.reduce((sum, sample) => sum + sample ** 2, 0) / waveform.length);
  });
  const play = page.getByRole('button', { name: 'Putar preview' });
  const pause = page.getByRole('button', { name: 'Jeda preview' });
  await play.click();
  await expect.poll(readLevel).toBeGreaterThan(0.07);
  await pause.click();
  await slider.press('Home');
  await expect(slider).toHaveValue('0');
  await play.click();
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(5);
  expect(await readLevel()).toBeLessThan(0.005);
  await pause.click();
});

for (const seconds of [5, 10, 15]) {
  for (const withAudio of [true, false]) {
    test(`exports and plays ${seconds}s at 720p30 ${withAudio ? 'with synced AAC' : 'without audio'}`, async ({ page, browser }, info) => {
      const musicStart = seconds === 5 ? 2 : 5.5;
      await openStory(page, seconds);
      if (withAudio) {
        await addNarration(page);
        await page.getByLabel('Pilih file musik').setInputFiles({ name: 'musik.mp3', mimeType: 'audio/mpeg', buffer: await mp3() });
        await page.getByLabel('Frame mulai musik').fill(String(musicStart * 30));
        await page.getByRole('button', { name: 'Simpan pengaturan musik' }).click();
        await expect(page.getByRole('button', { name: 'Simpan pengaturan musik' })).toBeDisabled();
      }
      await expect(page.getByText('Memeriksa', { exact: true })).toHaveCount(0, { timeout: 30_000 });
      test.skip(await diagnostic(page, 'H.264 720p30').textContent() !== 'Tersedia', 'No 720p H.264/WebGL2.');
      if (withAudio) test.skip(await diagnostic(page, 'H.264 + AAC MP4').textContent() !== 'Tersedia', 'No AAC support in this browser.');
      const dialog = await openExport(page);
      const button = dialog.getByRole('button', { name: 'Ekspor MP4' });
      await expect(button).toBeEnabled();
      await page.context().setOffline(true);
      await button.click();
      if (seconds === 5 && withAudio) {
        await expect.poll(async () => Number(await dialog.getByRole('progressbar').getAttribute('value'))).toBeGreaterThan(0);
        await dialog.getByRole('button', { name: 'Batalkan' }).click();
        await expect(dialog.getByText(/Ekspor dibatalkan/)).toBeVisible();
        await expect(dialog.getByRole('link', { name: 'Unduh MP4' })).toHaveCount(0);
        await dialog.getByRole('button', { name: 'Coba lagi' }).click();
      }
      await verifyDownload(page, info, seconds, withAudio, musicStart);
      if (seconds === 5 && withAudio) await page.screenshot({ path: info.outputPath('desktop-export-aac.png') });
      await dialog.getByRole('button', { name: 'Tutup dialog' }).click();
      await expect(page.getByRole('region', { name: 'Hasil render terakhir' })).toContainText('frame/dtk');
      console.log(`Chrome ${browser.version()}`);
    });
  }
}

test('AAC failure requires explicit consent before a silent MP4 export', async ({ page }, info) => {
  await page.addInitScript(() => {
    if (typeof AudioEncoder === 'undefined') return;
    const probe = AudioEncoder.isConfigSupported.bind(AudioEncoder);
    AudioEncoder.isConfigSupported = (config) => config.codec.startsWith('mp4a')
      ? Promise.resolve({ supported: false, config })
      : probe(config);
  });
  await page.route('**/assets/mediabunny-aac-encoder-*.js', (route) => route.abort());
  await openStory(page, 5);
  await addNarration(page);
  await expect(page.getByText('Memeriksa', { exact: true })).toHaveCount(0, { timeout: 30_000 });
  test.skip(await diagnostic(page, 'H.264 720p30').textContent() !== 'Tersedia', 'No 720p H.264/WebGL2.');
  await expect(diagnostic(page, 'H.264 + AAC MP4')).toHaveText('Tidak tersedia');
  const dialog = await openExport(page);
  const button = dialog.getByRole('button', { name: 'Ekspor MP4' });
  const consent = dialog.getByRole('checkbox', { name: 'Ekspor tanpa audio' });
  await expect(button).toBeDisabled();
  await expect(consent).not.toBeChecked();
  await expect(dialog.getByText(/Pemeriksaan AAC gagal|Encoder AAC tidak tersedia/)).toBeVisible();
  await consent.check();
  await button.click();
  await verifyDownload(page, info, 5, false);
  await dialog.getByRole('button', { name: 'Tutup dialog' }).click();
  await expect(page.getByText('narasi.wav', { exact: true })).toBeVisible();
});

test('context loss cleans up, reports an error, and can retry', async ({ page }) => {
  await page.addInitScript(() => {
    const counts = { acquired: 0, released: 0 };
    Reflect.set(window, 'motionWakeLock', counts);
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: async () => {
        counts.acquired++;
        return { released: false, release: async () => { counts.released++; } };
      } },
    });
  });
  await openStory(page, 5);
  const dialog = await openExport(page);
  test.skip(await diagnostic(page, 'H.264 720p30').textContent() !== 'Tersedia', 'No 720p H.264/WebGL2.');
  await dialog.getByRole('button', { name: 'Ekspor MP4' }).click();
  const canvas = page.locator('[data-motion-composition] canvas');
  await expect(canvas).toHaveCount(1);
  // Simulate the browser's non-bubbling WebGL context loss notification.
  await canvas.dispatchEvent('webglcontextlost', { bubbles: false, cancelable: true });
  await expect(dialog.getByRole('alert')).toContainText('WebGL berhenti');
  await expect(dialog.getByRole('link', { name: 'Unduh MP4' })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => Reflect.get(window, 'motionWakeLock'))).toEqual({ acquired: 1, released: 1 });
  await dialog.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(dialog.getByRole('link', { name: 'Unduh MP4' })).toBeVisible({ timeout: 120_000 });
  await expect.poll(() => page.evaluate(() => Reflect.get(window, 'motionWakeLock'))).toEqual({ acquired: 2, released: 2 });
});
