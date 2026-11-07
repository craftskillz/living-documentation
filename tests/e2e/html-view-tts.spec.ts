import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect } from '../helpers/ld-fixture';

const BODY = 'Première phrase. Deuxième phrase.\n\n## Suite\n\nFin du texte.\n';

function silentWav(seconds: number): Buffer {
  const sampleRate = 24_000;
  const bytesPerSample = 2;
  const dataSize = Math.round(sampleRate * seconds) * bytesPerSample;
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

// The first sentence ends quickly, every other one lasts long enough to observe the highlight.
async function recordSpeech(page: Page): Promise<string[]> {
  const spoken: string[] = [];
  await page.route('**/api/tts', async route => {
    const text = JSON.parse(route.request().postData() || '{}').text;
    spoken.push(text);
    await route.fulfill({ contentType: 'audio/wav', body: silentWav(text === 'Première phrase.' ? 0.25 : 20) });
  });
  return spoken;
}

function writeDocument(ld: { docsAbs: string }, frontmatter: string): string {
  const file = path.join(ld.docsAbs, 'lecture.md');
  fs.writeFileSync(file, `---\ntitle: Lecture\nhtml_template: article\n${frontmatter}---\n\n${BODY}`);
  return file;
}

async function openView(page: Page, baseURL: string) {
  await page.goto(`${baseURL}/html-view?doc=lecture`);
  const frame = page.frameLocator('iframe[data-testid="html-view-frame"]');
  await expect(frame.getByRole('heading', { level: 2, name: 'Suite' })).toBeVisible();
  await expect(page.getByTestId('tts-play')).toBeVisible();
}

// The highlight lives in the frame's own document, not in the application page.
async function frameHighlight(page: Page): Promise<string> {
  return page.evaluate(() => {
    const view = document.querySelector('iframe')!.contentWindow as unknown as {
      CSS: { highlights: Map<string, Set<Range>> };
    };
    return [...(view.CSS.highlights.get('tts-sentence') ?? [])].map(range => range.toString()).join('');
  });
}

test('the HTML page reads its main content only, with the highlight in the page', async ({ page, ld }) => {
  writeDocument(ld, 'language: fr\n');
  const spoken = await recordSpeech(page);
  await openView(page, ld.baseURL);

  await page.getByTestId('tts-play').click();
  await expect.poll(() => frameHighlight(page)).toBe('Deuxième phrase.');
  // Neither the page title in the header nor the table of contents is read.
  expect(spoken[0]).toBe('Première phrase.');

  await page.getByTestId('tts-next-section').click();
  await expect.poll(() => frameHighlight(page)).toBe('Suite');
  await page.getByTestId('tts-stop').click();
  await expect(page.getByTestId('tts-play')).toBeVisible();
  expect(await frameHighlight(page)).toBe('');
});

test('without a document language, the HTML page asks for it, saves it, then reads', async ({ page, ld }) => {
  const file = writeDocument(ld, '');
  const spoken = await recordSpeech(page);
  await openView(page, ld.baseURL);

  await page.getByTestId('tts-play').click();
  await page.getByTestId('tts-language-fr').click();
  await expect.poll(() => spoken[0]).toBe('Première phrase.');
  expect(fs.readFileSync(file, 'utf-8')).toMatch(/^language: fr$/m);
  await page.getByTestId('tts-stop').click();
});

test('regenerating the page stops the reading', async ({ page, ld }) => {
  writeDocument(ld, 'language: fr\n');
  await recordSpeech(page);
  await openView(page, ld.baseURL);

  await page.getByTestId('tts-play').click();
  await expect.poll(() => frameHighlight(page)).toBe('Deuxième phrase.');
  await page.evaluate(() => document.querySelector('iframe')!.contentWindow!.location.reload());
  await expect(page.getByTestId('tts-play')).toBeVisible();
});
