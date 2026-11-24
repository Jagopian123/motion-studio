import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const editor = (page: Page) => page.getByRole('textbox', { name: 'JSON cerita' });
const apply = (page: Page) => page.getByRole('button', { name: 'Terapkan JSON' });
const projects = (page: Page) => page.getByRole('button', { name: 'Proyek', exact: true });
const exportButton = (page: Page) => page.getByRole('button', { name: 'Buka dialog ekspor' });
const saved = (page: Page) => page.getByText('Tersimpan lokal', { exact: true });

async function pasteStory(page: Page, title: string) {
  const story = JSON.parse(await readFile('example-story.json', 'utf8'));
  story.title = title;
  await editor(page).fill(JSON.stringify(story));
  await apply(page).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
}

test.describe('mobile project workspace', () => {
  test.use({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });

  test('pastes a story, rejects invalid changes, restores the last save and exposes usable tabs', async ({ page }, testInfo) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await expect(exportButton(page)).toBeInViewport({ ratio: 1 });
    await pasteStory(page, 'Cerita dari ChatGPT');
    await expect(saved(page)).toBeVisible();
    const original = await editor(page).inputValue();
    await editor(page).fill(original.replace('"preset":"robot"', '"preset":"alien"'));
    await apply(page).click();
    const issue = 'Scene 1 · scenes[0].nodes[0].preset';
    await expect(page.getByRole('alert')).toContainText(issue);
    await page.getByRole('button', { name: 'Salin kesalahan' }).click();
    await expect(page.getByText('Kesalahan disalin.')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(issue);
    await expect(page.getByRole('heading', { name: 'Cerita dari ChatGPT' })).toBeVisible();
    await expectNoOverflow(page);

    await page.reload();
    await expect(saved(page)).toBeVisible();
    await expect(editor(page)).toHaveValue(original);
    const preview = page.getByRole('region', { name: 'Preview 3D' });
    const story = page.getByRole('tab', { name: 'Story' });
    expect((await preview.boundingBox())!.y).toBeLessThan((await story.boundingBox())!.y);
    await page.screenshot({ path: testInfo.outputPath('mobile-studio.png'), fullPage: true });
    await story.focus();
    await page.keyboard.press('ArrowRight');
    const scenes = page.getByRole('tab', { name: 'Scenes' });
    await expect(scenes).toBeFocused();
    await expect(scenes).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'Scenes' })).toContainText('450 frame');
    const seek = page.getByRole('button', { name: /Menemukan kristal/ });
    if (await seek.isEnabled()) {
      await seek.tap();
      await expect(page.getByRole('slider')).toHaveValue('150');
      await expect(seek).toHaveAttribute('aria-current', 'step');
    } else {
      await expect(preview).toContainText('WebGL2 diperlukan');
    }
    await scenes.focus();
    await page.keyboard.press('End');
    const audio = page.getByRole('tabpanel', { name: 'Audio' });
    await expect(audio.getByLabel('Pilih file narasi')).toBeEnabled();
    await expect(audio.getByLabel('Pilih file musik')).toBeEnabled();
    for (const control of [story, exportButton(page)]) {
      const box = await control.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    await exportButton(page).tap();
    const dialog = page.getByRole('dialog', { name: 'Ekspor video' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('radio', { name: /720 × 1280/ })).toBeVisible();
    const close = await dialog.getByRole('button', { name: 'Tutup dialog' }).boundingBox();
    expect(close!.height).toBeGreaterThanOrEqual(44);
    expect(close!.width).toBeGreaterThanOrEqual(44);
    await expectNoOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('mobile-export-dialog.png') });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(exportButton(page)).toBeFocused();
  });
});

test('opens, renames, duplicates and deletes projects, and round-trips JSON through a file', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await projects(page).click();
  await page.getByRole('button', { name: 'Proyek baru' }).click();
  await expect(page.getByRole('heading', { name: 'Proyek baru' })).toBeVisible();
  // Open the manager before the debounce ends. Duplication must flush the source first.
  await projects(page).click();
  await page.getByRole('button', { name: 'Duplikat' }).click();
  await expect(page.getByRole('heading', { name: 'Proyek baru (salinan)' })).toBeVisible();
  await expect(saved(page)).toBeVisible();

  await projects(page).click();
  await page.getByRole('button', { name: 'Ganti nama' }).click();
  await page.getByRole('textbox', { name: 'Nama proyek' }).fill('Set animasi');
  await page.getByRole('button', { name: 'Simpan nama' }).click();
  await expect(saved(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Set animasi' })).toBeVisible();
  expect(JSON.parse(await editor(page).inputValue()).title).toBe('Set animasi');
  const sidebar = page.getByRole('region', { name: 'Editor proyek' });
  const center = page.getByRole('region', { name: 'Preview 3D' });
  const inspector = page.getByRole('complementary', { name: 'Detail proyek dan perangkat' });
  expect((await sidebar.boundingBox())!.x).toBeLessThan((await center.boundingBox())!.x);
  expect((await center.boundingBox())!.x).toBeLessThan((await inspector.boundingBox())!.x);
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('desktop-studio.png') });

  await projects(page).click();
  await expect(page.getByText(/data situs dihapus/)).toBeVisible();
  await expect(page.getByText(/tanpa audio/)).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Ekspor JSON' }).click()]);
  expect(download.suggestedFilename()).toBe('Set animasi.json');
  const filePath = await download.path();
  expect(JSON.parse(await readFile(filePath, 'utf8')).title).toBe('Set animasi');

  await page.getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Hapus proyek?' })).toContainText('Set animasi');
  await page.getByRole('button', { name: 'Batal', exact: true }).click();
  await expect(page.getByRole('button', { name: /Set animasi/ })).toHaveAttribute('aria-current', 'true');
  await page.getByRole('button', { name: 'Hapus', exact: true }).click();
  await page.getByRole('button', { name: 'Hapus proyek' }).click();
  await expect(page.getByRole('heading', { name: 'Orbit 01' })).toBeVisible();
  await projects(page).click();
  await expect(page.getByRole('button', { name: /Set animasi/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Proyek baru', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Proyek baru' })).toBeVisible();
  await expect(saved(page)).toBeVisible();

  const invalid = page.getByLabel('File JSON', { exact: true });
  await invalid.setInputFiles({ name: 'salah.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.getByRole('alert')).toContainText('Sintaks JSON tidak valid');
  await invalid.setInputFiles({ name: 'besar.json', mimeType: 'application/json', buffer: Buffer.alloc(1024 * 1024 + 1) });
  await expect(page.getByRole('alert')).toContainText('maksimal 1 MiB');
  await expect(page.getByRole('heading', { name: 'Proyek baru' })).toBeVisible();
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Impor file' }).click()]);
  await chooser.setFiles({ name: 'Set animasi.json', mimeType: 'application/json', buffer: await readFile(filePath) });
  await expect(page.getByRole('heading', { name: 'Set animasi' })).toBeVisible();
  await expect(saved(page)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Set animasi' })).toBeVisible();
  await expect(saved(page)).toBeVisible();
});

test('reports an IndexedDB quota failure, preserves the draft and retries the save', async ({ page }) => {
  await page.goto('/');
  await expect(projects(page)).toBeEnabled();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (this.name === 'projects') {
        IDBObjectStore.prototype.put = original;
        throw new DOMException('Quota test', 'QuotaExceededError');
      }
      return original.call(this, value, key);
    };
  });
  await pasteStory(page, 'Cerita saat penyimpanan penuh');
  await expect(page.getByRole('alert')).toContainText('Penyimpanan browser penuh');
  await expect(page.getByText('Belum tersimpan')).toBeVisible();
  await expect(editor(page)).toHaveValue(/Cerita saat penyimpanan penuh/);
  await page.getByRole('button', { name: 'Coba simpan lagi' }).click();
  await expect(saved(page)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Cerita saat penyimpanan penuh' })).toBeVisible();
});

test('keeps the committed local project when an older tab tries to overwrite it', async ({ page, context }) => {
  await page.goto('/');
  await pasteStory(page, 'Proyek lintas tab');
  await expect(saved(page)).toBeVisible();
  const secondTab = await context.newPage();
  await secondTab.goto('/');
  await expect(secondTab.getByRole('heading', { name: 'Proyek lintas tab' })).toBeVisible();
  await expect(saved(secondTab)).toBeVisible();

  await pasteStory(page, 'Versi yang sudah disimpan');
  await expect(saved(page)).toBeVisible();
  await pasteStory(secondTab, 'Versi dari tab lama');
  await expect(secondTab.getByRole('alert')).toContainText('Proyek berubah di tab lain');
  await expect(editor(secondTab)).toHaveValue(/Versi dari tab lama/);
  await secondTab.close();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Versi yang sudah disimpan' })).toBeVisible();
});
