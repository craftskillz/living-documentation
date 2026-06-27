import { test, expect } from '../helpers/ld-fixture';
import fs from 'fs/promises';
import path from 'path';

test('sidebar lists all documents from the minimal fixture', async ({ page, ld }) => {
  await page.goto(ld.baseURL);
  const sidebar = page.getByTestId('category-tree');
  // "General" is expanded by default; other categories collapse — expand "Guide"
  // (which holds Quickstart + Advanced) to assert the full document listing.
  await expect(sidebar.getByText('Intro')).toBeVisible();
  await sidebar.getByRole('button', { name: /^Guide/ }).click();
  await expect(sidebar.getByText('Quickstart')).toBeVisible();
  await expect(sidebar.getByText('Advanced')).toBeVisible();
});

test('opening a document renders its heading and body', async ({ page, ld }) => {
  await page.goto(ld.baseURL);
  // Intro is under General, expanded by default per sidebar conventions.
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
    .poll(async () => fs.readFile(docPath, 'utf8'))
    .toContain('**language:** en');
  await expect(page.getByTestId('tts-error')).toContainText('tts unavailable for test');
});

test('french reading calls server TTS and displays unsupported language error', async ({
  page,
  ld,
}) => {
  const requestedLanguages: unknown[] = [];
  await page.route('**/api/tts', async (route) => {
    requestedLanguages.push(JSON.parse(route.request().postData() || '{}').language);
    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'TTS engine kokoro does not support fr documents yet.' }),
    });
  });

  const docId = '2026_01_01_10_00_[General]_intro';
  const docPath = path.join(ld.docsAbs, '2026_01_01_10_00_[General]_intro.md');
  const original = await fs.readFile(docPath, 'utf8');
  await fs.writeFile(docPath, `---\n**language:** fr\n---\n\n${original}`);

  await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
  await expect(page.getByTestId('doc-title')).toHaveText(/Intro/i);
  await page.getByTestId('tts-play').click();

  await expect(page.getByTestId('tts-error')).toContainText(
    'TTS engine kokoro does not support fr documents yet.',
  );
  expect(requestedLanguages).toContain('fr');
});
