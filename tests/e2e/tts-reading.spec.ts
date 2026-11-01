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

async function selectText(page: Page, text: string) {
  await page.evaluate(wanted => {
    const walker = document.createTreeWalker(document.querySelector('#doc-content') as Element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = (node as Text).data.indexOf(wanted);
      if (at < 0) continue;
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + wanted.length);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }
    throw new Error(`text not found: ${wanted}`);
  }, text);
}

function recordSpokenText(page: Page, spoken: string[], seconds = 20) {
  return page.route('**/api/tts', async route => {
    spoken.push(JSON.parse(route.request().postData() || '{}').text);
    await route.fulfill({ contentType: 'audio/wav', body: silentWav(seconds) });
  });
}

test('a selection starts the reading at its first word, then the document continues', async ({ page, request, ld }) => {
  const spoken: string[] = [];
  await recordSpokenText(page, spoken, 0.25);
  await openDocument(page, request, ld.baseURL,
    'Introduction ignorée.\n\nPremière phrase ignorée. Une seconde phrase utile. Une troisième.\n\n## Titre suivant\n\nLa fin.');
  await selectText(page, 'conde phrase');
  await page.getByTestId('tts-play').click();
  await expect.poll(() => spoken).toEqual(expect.arrayContaining([
    'seconde phrase utile.', 'Une troisième.', 'Titre suivant', 'La fin.',
  ]));
  expect(spoken[0]).toBe('seconde phrase utile.');
  expect(spoken.join(' ')).not.toContain('ignorée');
});

test('the highlight and next section follow a reading started from a selection', async ({ page, request, ld }) => {
  const spoken: string[] = [];
  await recordSpokenText(page, spoken);
  await openDocument(page, request, ld.baseURL,
    'Introduction.\n\nUne phrase avec un **mot**[^1] choisi ici.\n\n## Titre suivant\n\nLa fin.\n\n[^1]: Note.');
  await selectText(page, 'choisi');
  await page.getByTestId('tts-play').click();
  await expect.poll(() => highlightedText(page)).toBe('choisi ici.');
  expect(spoken[0]).toBe('choisi ici.');
  await page.getByTestId('tts-next-section').click();
  await expect.poll(() => highlightedText(page)).toBe('Titre suivant');
  await page.getByTestId('tts-stop').click();
});

test('a selection starting in an announced widget or a skipped marker starts at the next readable text', async ({ page, request, ld }) => {
  const spoken: string[] = [];
  await recordSpokenText(page, spoken);
  await openDocument(page, request, ld.baseURL,
    'Introduction.\n\n```js\nconst choisi = 1;\n```\n\nAprès le code.');
  await selectText(page, 'choisi');
  await page.getByTestId('tts-play').click();
  await expect.poll(() => spoken[0]).toBe('Bloc de code.');
  await page.getByTestId('tts-stop').click();

  spoken.length = 0;
  await openDocument(page, request, ld.baseURL, 'Avant[^1] la suite.\n\nFin.\n\n[^1]: Note.');
  await selectText(page, '1');
  await page.getByTestId('tts-play').click();
  await expect.poll(() => spoken[0]).toBe('la suite.');
  await page.getByTestId('tts-stop').click();
});

test('without a selection in the document, the reading starts at the beginning', async ({ page, request, ld }) => {
  const spoken: string[] = [];
  await recordSpokenText(page, spoken);
  await openDocument(page, request, ld.baseURL, 'Le début.\n\nLa suite.');
  await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('[data-testid="doc-title"]') as Element);
    window.getSelection()?.addRange(range);
  });
  await page.getByTestId('tts-play').click();
  await expect.poll(() => spoken[0]).toBe('Le début.');
  await page.getByTestId('tts-stop').click();
});

test('a selection made before the language prompt still sets the reading start', async ({ page, request, ld }) => {
  const spoken: string[] = [];
  await recordSpokenText(page, spoken);
  const response = await request.put(`${ld.baseURL}/api/documents/${encodeURIComponent(DOC_ID)}`, {
    data: { content: '---\ntitle: Lecture\n---\n\nLe début.\n\nUn passage choisi.' },
  });
  expect(response.ok()).toBe(true);
  await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(DOC_ID)}`);
  await expect(page.getByTestId('tts-play')).toBeVisible();
  await selectText(page, 'passage');
  await page.getByTestId('tts-play').click();
  await page.getByTestId('tts-language-fr').click();
  await expect.poll(() => spoken[0]).toBe('passage choisi.');
  await expect.poll(() => highlightedText(page)).toBe('passage choisi.');
  await page.getByTestId('tts-stop').click();
});
