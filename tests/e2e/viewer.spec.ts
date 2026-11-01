import { readOkf } from '../helpers/okf';
import { test, expect } from '../helpers/ld-fixture';
import fs from 'node:fs/promises';
import path from 'node:path';

test('sidebar lists all documents from the minimal fixture', async ({ page, ld }) => {
  await page.goto(ld.baseURL);
  const sidebar = page.getByTestId('category-tree');
  // No category groups: root documents are listed directly in the explorer.
  await expect(sidebar.getByText('Intro')).toBeVisible();
  await expect(sidebar.getByText('Quickstart')).toBeVisible();
  await expect(sidebar.getByText('Advanced')).toBeVisible();
});

test('opening a document renders its heading and body', async ({ page, ld }) => {
  await page.goto(ld.baseURL);
  // Root documents are listed directly in the explorer.
  await page.getByTestId('category-tree').getByText('Intro', { exact: true }).click();
  await expect(page.getByTestId('doc-title')).toHaveText(/Intro/i);
  await expect(page.getByTestId('doc-view')).toContainText('Welcome to the test documentation');
});

test('document header copies the MCP document id', async ({ page, ld }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ld.baseURL });
  const docId = '2026_01_02_10_00_[Guide]_quickstart';
  await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
  await expect(page.getByTestId('doc-title')).toHaveText('Quickstart');

  const copyButton = page.getByTestId('copy-doc-id-btn');
  await expect(copyButton).toBeVisible();
  await copyButton.click();

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toBe(docId);
  // The Svelte UI flips the icon to a check mark instead of mutating the title.
  await expect(copyButton.locator('i.fa-check')).toBeVisible();
});

test('listen asks for a missing reading language and saves it to frontmatter', async ({
  page,
  ld,
}) => {
  await page.route('**/api/tts', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'tts unavailable for test' }),
    });
  });

  const docId = '2026_01_02_10_00_[Guide]_quickstart';
  await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
  await expect(page.getByTestId('doc-title')).toHaveText('Quickstart');

  await page.getByTestId('tts-play').click();
  await expect(page.getByTestId('tts-language-modal')).toBeVisible();
  await page.getByTestId('tts-language-en').click();
  await expect(page.getByTestId('tts-language-modal')).toBeHidden();

  const docPath = path.join(ld.docsAbs, '2026_01_02_10_00_[Guide]_quickstart.md');
  await expect
    .poll(async () => readOkf(await fs.readFile(docPath, 'utf8')).fields.language)
    .toBe('en');
  await expect(page.getByTestId('tts-error')).toContainText('tts unavailable for test');
});

test('french reading plays server audio and supports pause, resume and stop', async ({
  page,
  ld,
}) => {
  const requestedLanguages: unknown[] = [];
  // A ten-second WAV keeps playback active while exercising the controls.
  // Real French/English model output is covered by tests/api/tts.spec.ts.
  const sampleRate = 24_000;
  const bytesPerSample = 2;
  const dataSize = sampleRate * bytesPerSample * 10;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write('RIFF');
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * bytesPerSample, 28);
  wav.writeUInt16LE(bytesPerSample, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(dataSize, 40);
  await page.route('**/api/tts', async (route) => {
    requestedLanguages.push(JSON.parse(route.request().postData() || '{}').language);
    await route.fulfill({
      status: 200,
      contentType: 'audio/wav',
      body: wav,
    });
  });

  const docId = '2026_01_01_10_00_[General]_intro';
  const docPath = path.join(ld.docsAbs, '2026_01_01_10_00_[General]_intro.md');
  const original = await fs.readFile(docPath, 'utf8');
  await fs.writeFile(docPath, original.replace('---', '---\nlanguage: fr'));

  await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
  await expect(page.getByTestId('doc-title')).toHaveText(/Intro/i);
  await page.getByTestId('tts-play').click();

  const toggle = page.getByTestId('tts-toggle');
  await expect(toggle.locator('.fa-pause')).toBeVisible();
  await expect(page.getByTestId('tts-language-modal')).toBeHidden();
  await expect(page.getByTestId('tts-error')).toBeHidden();
  expect(requestedLanguages).toContain('fr');
  await toggle.click();
  await expect(toggle.locator('.fa-play')).toBeVisible();
  await toggle.click();
  await expect(toggle.locator('.fa-pause')).toBeVisible();
  await page.getByTestId('tts-stop').click();
  await expect(page.getByTestId('tts-play')).toBeVisible();
});
