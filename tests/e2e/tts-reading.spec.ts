import { test, expect } from '../helpers/ld-fixture';
import type { Page, APIRequestContext } from '@playwright/test';

const DOC_ID = '2026_01_01_10_00_[General]_intro';

function silentWav(seconds = 20): Buffer {
  const sampleRate = 24_000;
  const bytesPerSample = 2;
  const dataSize = sampleRate * bytesPerSample * seconds;
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
  return wav;
}

async function openDocument(page: Page, request: APIRequestContext, baseURL: string, body: string) {
  const response = await request.put(`${baseURL}/api/documents/${encodeURIComponent(DOC_ID)}`, {
    data: { content: `---\ntitle: Lecture\nlanguage: fr\n---\n\n${body}` },
  });
  expect(response.ok()).toBe(true);
  await request.put(`${baseURL}/api/config`, { data: { language: 'fr' } });
  await page.goto(`${baseURL}/?doc=${encodeURIComponent(DOC_ID)}`);
  await expect(page.getByTestId('tts-play')).toBeVisible();
}

async function highlightedText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const highlights = (CSS as unknown as { highlights: Map<string, Set<Range>> }).highlights;
    return [...(highlights.get('tts-sentence') ?? [])].map(range => range.toString()).join('');
  });
}

test('reading omits footnote references and backlinks without shifting sentence highlighting', async ({ page, request, ld }) => {
  const spoken: string[] = [];
  await page.route('**/api/tts', async route => {
    const text = JSON.parse(route.request().postData() || '{}').text;
    spoken.push(text);
    await route.fulfill({
      contentType: 'audio/wav',
      body: silentWav(text.startsWith('Dans notre exemple') ? 0.25 : 20),
    });
  });
  await openDocument(page, request, ld.baseURL,
    'Dans notre exemple nous enrichissons notre **AGENT**[^4] avec trois capacités personnalisées. ' +
    'Suite avec 3 éléments et x<sup>2</sup>.\n\n' +
    '[^4]: Définition utile.\n');
  const reference = page.locator('a[data-ld-fn-ref]');
  await expect(reference).toHaveText('1');
  await page.getByTestId('tts-play').click();
  await expect.poll(() => spoken[0]).toBe(
    'Dans notre exemple nous enrichissons notre AGENT avec trois capacités personnalisées.',
  );
  await expect.poll(() => highlightedText(page)).toBe('Suite avec 3 éléments et x2.');
  expect(spoken).toContain('Suite avec 3 éléments et x2.');
  await expect(reference).toHaveText('1');
  await page.getByTestId('tts-stop').click();

  // Footnote definitions still belong to the reading; only navigation markers are omitted.
  await openDocument(page, request, ld.baseURL,
    'Un lien[^4], puis le même lien[^4].\n\n[^4]: Définition utile.');
  await page.getByTestId('tts-play').click();
  await page.getByTestId('tts-next-section').click();
  await expect.poll(() => spoken).toContain('Définition utile.');
  expect(spoken.some(text => text.includes('↩'))).toBe(false);
  await page.getByTestId('tts-stop').click();
});

test('next section skips to each heading and preserves pause and resume', async ({ page, request, ld }) => {
  await page.route('**/api/tts', route => route.fulfill({ contentType: 'audio/wav', body: silentWav() }));
  await openDocument(page, request, ld.baseURL,
    'Introduction.\n\n## Première section. Complément\n\nUn paragraphe.\n\n### Sous-section\n\nLa suite.');
  await page.getByTestId('tts-play').click();
  const toggle = page.getByTestId('tts-toggle');
  const next = page.getByRole('button', { name: 'Section suivante', exact: true });
  await expect(toggle.locator('.fa-pause')).toBeVisible();
  await next.click();
  await expect.poll(() => highlightedText(page)).toBe('Première section.');
  await expect(toggle.locator('.fa-pause')).toBeVisible();
  await toggle.click();
  await expect(toggle.locator('.fa-play')).toBeVisible();
  await next.click();
  await expect.poll(() => highlightedText(page)).toBe('Sous-section');
  await expect(toggle.locator('.fa-play')).toBeVisible();
  await expect(next).toBeDisabled();
  await toggle.click();
  await expect(toggle.locator('.fa-pause')).toBeVisible();
  await page.getByTestId('tts-stop').click();
  await expect(page.getByTestId('tts-play')).toBeVisible();
  await expect(next).toBeHidden();
});

test('rapid section skips ignore audio that arrives after the jump', async ({ page, request, ld }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const requested: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/tts', async route => {
    const text = JSON.parse(route.request().postData() || '{}').text;
    requested.push(text);
    if (text === 'Introduction.' || text === 'Première section') await gate;
    await route.fulfill({ contentType: 'audio/wav', body: silentWav() });
  });
  await openDocument(page, request, ld.baseURL,
    'Introduction.\n\n## Première section\n\nUn paragraphe.\n\n## Dernière section\n\nLa fin.');
  await page.getByTestId('tts-play').click();
  await expect.poll(() => requested).toContain('Introduction.');
  const next = page.getByTestId('tts-next-section');
  await next.click();
  await expect.poll(() => requested).toContain('Première section');
  await next.click();
  await expect(page.getByTestId('tts-toggle').locator('.fa-pause')).toBeVisible();
  await expect.poll(() => highlightedText(page)).toBe('Dernière section');
  release();
  await expect(next).toBeDisabled();
  await expect(page.getByTestId('tts-error')).toBeHidden();
  expect(errors).toEqual([]);
  await page.getByTestId('tts-stop').click();
});

test('skipping an abandoned failing prefetch does not interrupt the new section', async ({ page, request, ld }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const requested: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/tts', async route => {
    const text = JSON.parse(route.request().postData() || '{}').text;
    requested.push(text);
    if (text === 'Passage ignoré.') {
      await gate;
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"prefetch failed"}' });
    } else {
      await route.fulfill({ contentType: 'audio/wav', body: silentWav() });
    }
  });
  await openDocument(page, request, ld.baseURL,
    'Introduction. Passage ignoré.\n\n## Dernière section\n\nLa fin.');
  await page.getByTestId('tts-play').click();
  await expect.poll(() => requested).toContain('Passage ignoré.');
  await page.getByTestId('tts-next-section').click();
  await expect.poll(() => highlightedText(page)).toBe('Dernière section');
  const failed = page.waitForResponse(response => response.url().endsWith('/api/tts') && response.status() === 500);
  release();
  await failed;
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 50)));
  expect(errors).toEqual([]);
  await expect(page.getByTestId('tts-error')).toBeHidden();
  await expect(page.getByTestId('tts-toggle').locator('.fa-pause')).toBeVisible();
  await page.getByTestId('tts-stop').click();
});
