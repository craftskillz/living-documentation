import fs from 'node:fs';
import path from 'node:path';
import type { FrameLocator, Page } from '@playwright/test';
import { test, expect } from '../helpers/ld-fixture';

const FILLER = 'Paragraphe de remplissage.\n\n'.repeat(60);
const SOURCE = `---\ntype: Document\ntitle: Fiche\nhtml_template: article\n---\n\n# Grand titre\n\nIntroduction\n\n${FILLER}## Cible\n\nTexte **modifiable** ici\nsur deux lignes.\n\nPrix \\*barré\\* ici.\n\nVoir [Autre](?doc=autre) ici.\n\n- Liste\n\n##### Petit\n\n### Sous-titre\n\n## Suivante\n\nFin.\n`;

function setup(ld: { docsAbs: string }): string {
  const file = path.join(ld.docsAbs, 'fiche.md');
  fs.writeFileSync(file, SOURCE);
  fs.writeFileSync(path.join(ld.docsAbs, 'autre.md'), '---\ntitle: Autre\n---\n\n# Autre\n');
  return file;
}

async function openView(page: Page, baseURL: string) {
  // Its toast would cover the lower right of the page, where the tests click.
  await page.request.put(`${baseURL}/api/config`, { data: { gitIntegration: { mode: 'disabled' } } });
  await page.goto(`${baseURL}/html-view?doc=fiche`);
  const frame = page.frameLocator('iframe[data-testid="html-view-frame"]');
  await expect(frame.getByRole('heading', { level: 2, name: 'Cible' })).toBeVisible();
  return frame;
}

// A heading is as wide as the page: its centre is past the end of its text.
const ON_FIRST_WORD = { x: 5, y: 5 };
const editing = (frame: FrameLocator) => frame.locator('[contenteditable]');
const sourceField = (frame: FrameLocator) => frame.locator('textarea');
const popup = (page: Page) => page.locator('#section-editor');
const frameScroll = (page: Page) => page.evaluate(() => document.querySelector('iframe')!.contentWindow!.scrollY);

test('double click edits a paragraph in place and a click elsewhere saves only its lines', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const word = frame.locator('strong', { hasText: 'modifiable' });
  await word.scrollIntoViewIfNeeded();
  const scroll = await frameScroll(page);
  expect(scroll).toBeGreaterThan(0);

  await word.dblclick();
  await expect(editing(frame)).toHaveCount(1);
  await expect(popup(page)).toHaveCount(0);
  await page.keyboard.type('corrigé');
  await frame.getByRole('heading', { level: 2, name: 'Cible' }).click();

  await expect(frame.locator('strong', { hasText: 'corrigé' })).toBeVisible();
  await expect(editing(frame)).toHaveCount(0);
  expect(fs.readFileSync(file, 'utf-8')).toBe(SOURCE.replace('modifiable', 'corrigé'));
  expect(Math.abs(await frameScroll(page) - scroll)).toBeLessThan(100);
});

test('Cmd+Enter saves a heading, and the table of contents follows', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const heading = frame.getByRole('heading', { level: 2, name: 'Suivante' });
  await heading.scrollIntoViewIfNeeded();
  await heading.dblclick({ position: ON_FIRST_WORD });
  await page.keyboard.type('Renommée');
  await page.keyboard.press('ControlOrMeta+Enter');

  await expect(editing(frame)).toHaveCount(0);
  await expect(frame.getByRole('heading', { level: 2, name: 'Renommée' })).toBeVisible();
  await expect(frame.getByRole('link', { name: 'Renommée' })).toHaveCount(1);
  expect(fs.readFileSync(file, 'utf-8')).toBe(SOURCE.replace('## Suivante', '## Renommée'));
});

test('a level 3 heading is editable in place', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const heading = frame.getByRole('heading', { level: 3, name: 'Sous-titre' });
  await heading.scrollIntoViewIfNeeded();
  await heading.dblclick();
  await expect(editing(frame)).toHaveCount(1);
  await page.keyboard.press('End');
  await page.keyboard.type(' bis');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(editing(frame)).toHaveCount(0);
  await expect(frame.getByRole('heading', { level: 3, name: 'Sous-titre bis' })).toBeVisible();
  expect(fs.readFileSync(file, 'utf-8')).toBe(SOURCE.replace('### Sous-titre', '### Sous-titre bis'));
});

test('Enter saves like a click elsewhere', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const word = frame.locator('strong', { hasText: 'modifiable' });
  await word.scrollIntoViewIfNeeded();
  await word.dblclick();
  await page.keyboard.type('corrigé');
  await page.keyboard.press('Enter');
  await expect(editing(frame)).toHaveCount(0);
  await expect(frame.locator('strong', { hasText: 'corrigé' })).toBeVisible();
  expect(fs.readFileSync(file, 'utf-8')).toBe(SOURCE.replace('modifiable', 'corrigé'));
});

test('Shift+Enter adds a visible line break in a paragraph', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const paragraph = frame.getByText('Fin.');
  await paragraph.scrollIntoViewIfNeeded();
  await paragraph.dblclick({ position: ON_FIRST_WORD });
  // Past the selected word and the full stop. End does not move the caret on macOS.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('Suite');
  await expect(editing(frame)).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(editing(frame)).toHaveCount(0);
  await expect(frame.locator('p', { hasText: 'Suite' }).locator('br')).toHaveCount(1);
  expect(fs.readFileSync(file, 'utf-8')).toBe(SOURCE.replace('Fin.', 'Fin.  \nSuite'));
});

test('Shift+Enter does nothing in a heading', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const heading = frame.getByRole('heading', { level: 3, name: 'Sous-titre' });
  await heading.scrollIntoViewIfNeeded();
  await heading.dblclick({ position: ON_FIRST_WORD });
  await page.keyboard.press('Shift+Enter');
  await expect(editing(frame)).toHaveCount(1);
  await expect(editing(frame).locator('br')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(editing(frame)).toHaveCount(0);
  expect(fs.readFileSync(file, 'utf-8')).toBe(SOURCE);
});

test('Escape restores the block without writing', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const word = frame.locator('strong', { hasText: 'modifiable' });
  await word.scrollIntoViewIfNeeded();
  await word.dblclick();
  await page.keyboard.type('perdu');
  await page.keyboard.press('Escape');
  await expect(editing(frame)).toHaveCount(0);
  await expect(frame.locator('strong', { hasText: 'modifiable' })).toBeVisible();
  await frame.getByRole('heading', { level: 2, name: 'Cible' }).click();
  await page.waitForTimeout(200);
  expect(fs.readFileSync(file, 'utf-8')).toBe(SOURCE);
});

test('leaving a block unchanged writes nothing', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const writes: string[] = [];
  page.on('request', (request) => { if (request.method() === 'PUT') writes.push(request.url()); });
  const word = frame.locator('strong', { hasText: 'modifiable' });
  await word.scrollIntoViewIfNeeded();
  await word.dblclick();
  await page.keyboard.press('Enter');
  await expect(editing(frame)).toHaveCount(0);
  expect(writes).toEqual([]);
  expect(fs.readFileSync(file, 'utf-8')).toBe(SOURCE);
});

test('emptying a paragraph removes it from the file', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const word = frame.locator('strong', { hasText: 'modifiable' });
  await word.scrollIntoViewIfNeeded();
  await word.dblclick();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Delete');
  await page.keyboard.press('Enter');
  await expect(editing(frame)).toHaveCount(0);
  await expect(frame.getByText('sur deux lignes.')).toHaveCount(0);
  expect(fs.readFileSync(file, 'utf-8')).toBe(SOURCE.replace('Texte **modifiable** ici\nsur deux lignes.\n\n', ''));
});

test('emptying a heading removes the heading and keeps what follows it', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const heading = frame.getByRole('heading', { level: 2, name: 'Suivante' });
  await heading.scrollIntoViewIfNeeded();
  await heading.dblclick({ position: ON_FIRST_WORD });
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Delete');
  await page.keyboard.press('Enter');
  await expect(editing(frame)).toHaveCount(0);
  await expect(frame.getByRole('heading', { level: 2, name: 'Suivante' })).toHaveCount(0);
  await expect(frame.getByText('Fin.')).toBeVisible();
  expect(fs.readFileSync(file, 'utf-8')).toBe(SOURCE.replace('## Suivante\n\n', ''));
});

test('a block that does not convert back to its lines opens the Markdown popup without writing', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const paragraph = frame.getByText('Prix *barré* ici.');
  await paragraph.scrollIntoViewIfNeeded();
  await paragraph.dblclick();
  await expect(popup(page)).toBeVisible();
  await expect(editing(frame)).toHaveCount(0);
  await expect(page.locator('#section-markdown')).toHaveValue(/^## Cible/);
  expect(fs.readFileSync(file, 'utf-8')).toBe(SOURCE);
});

test('double click on a block without an editing mode changes nothing', async ({ page, ld }) => {
  setup(ld);
  const frame = await openView(page, ld.baseURL);
  const small = frame.getByRole('heading', { level: 5, name: 'Petit' });
  await small.scrollIntoViewIfNeeded();
  await small.dblclick();
  await expect(editing(frame)).toHaveCount(0);
  await expect(sourceField(frame)).toHaveCount(0);
  await expect(popup(page)).toHaveCount(0);
});

test('pasted text stays on one line and without formatting', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const word = frame.locator('strong', { hasText: 'modifiable' });
  await word.scrollIntoViewIfNeeded();
  await word.dblclick();
  await page.evaluate(() => {
    const frameDocument = document.querySelector('iframe')!.contentDocument!;
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'collé\n\nsur deux');
    clipboardData.setData('text/html', '<h1>collé</h1>');
    frameDocument.activeElement!.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
  });
  await expect(editing(frame)).toContainText('collé sur deux');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(editing(frame)).toHaveCount(0);
  await expect(editing(frame)).toHaveCount(0);
  await expect(frame.locator('strong', { hasText: 'collé sur deux' })).toBeVisible();
  expect(fs.readFileSync(file, 'utf-8')).toBe(SOURCE.replace('modifiable', 'collé sur deux'));
});

test('during an edit, a click on a link does not open it and a right click does not open the popup', async ({ page, ld }) => {
  setup(ld);
  const frame = await openView(page, ld.baseURL);
  const paragraph = frame.getByText('ici.').filter({ has: frame.getByRole('link', { name: 'Autre' }) });
  await paragraph.scrollIntoViewIfNeeded();
  const box = (await paragraph.boundingBox())!;
  await page.mouse.dblclick(box.x + box.width - 2, box.y + box.height / 2);
  await expect(editing(frame)).toHaveCount(1);

  await frame.getByRole('link', { name: 'Autre' }).click();
  await expect(page).toHaveURL(/\/html-view\?doc=fiche$/);
  await frame.getByRole('link', { name: 'Autre' }).click({ button: 'right' });
  await expect(popup(page)).toHaveCount(0);
});

test('a document changed elsewhere is not overwritten: the error shows and the edit stays open', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const word = frame.locator('strong', { hasText: 'modifiable' });
  await word.scrollIntoViewIfNeeded();
  const external = SOURCE.replace('Fin.', 'Fin externe.');
  fs.writeFileSync(file, external);

  await word.dblclick();
  await page.keyboard.type('corrigé');
  await page.keyboard.press('ControlOrMeta+Enter');

  await expect(page.getByTestId('html-view-save-error')).toBeVisible();
  await expect(editing(frame)).toHaveCount(1);
  expect(fs.readFileSync(file, 'utf-8')).toBe(external);
});

test('an edit that no longer converts keeps the typed text and writes nothing', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const word = frame.locator('strong', { hasText: 'modifiable' });
  await word.scrollIntoViewIfNeeded();
  await word.dblclick();
  await page.keyboard.type('gardé');
  await page.evaluate(() => {
    document.querySelector('iframe')!.contentDocument!.querySelector('[contenteditable]')!.append(document.createElement('u'));
  });
  await page.keyboard.press('ControlOrMeta+Enter');

  await expect(page.getByTestId('html-view-save-error')).toBeVisible();
  await expect(editing(frame)).toContainText('gardé');
  await expect(popup(page)).toHaveCount(0);
  expect(fs.readFileSync(file, 'utf-8')).toBe(SOURCE);
});

const BLOCKS = {
  code: '```js\nconst a = 1;\n```',
  list: '- Un\n- Deux\n  - Imbriqué',
  quote: '<!-- quote-type: info -->\n<!-- quote-title: Titre -->\n> Citation\n> suite',
  table: '| A | B |\n|---|---|\n| 1 | 2 |',
};
const BLOCKS_SOURCE = `---\ntype: Document\ntitle: Blocs\nhtml_template: article\n---\n\n# Blocs\n\n## Cible\n\n${BLOCKS.code}\n\n${BLOCKS.list}\n\n${BLOCKS.quote}\n\n${BLOCKS.table}\n\nNote[^1].\n\n[^1]: Le texte.\n`;

async function openBlocks(page: Page, ld: { docsAbs: string; baseURL: string }) {
  const file = path.join(ld.docsAbs, 'fiche.md');
  fs.writeFileSync(file, BLOCKS_SOURCE);
  return { file, frame: await openView(page, ld.baseURL) };
}

const SOURCE_BLOCKS = [
  { name: 'code', selector: 'pre', source: BLOCKS.code, edited: '```js\nconst a = 2;\nconst b = 3;\n```', rendered: 'const b = 3;' },
  { name: 'list', selector: 'ul', source: BLOCKS.list, edited: '- Un\n- Trois', rendered: 'Trois' },
  { name: 'table', selector: 'table', source: BLOCKS.table, edited: '| A | B |\n|---|---|\n| 1 | 9 |', rendered: '9' },
];

for (const { name, selector, source, edited, rendered } of SOURCE_BLOCKS) {
  test(`double click shows the Markdown of a ${name} block, and Enter saves only its lines`, async ({ page, ld }) => {
    const { file, frame } = await openBlocks(page, ld);
    const block = frame.locator(selector).first();
    await block.dblclick();
    await expect(sourceField(frame)).toHaveValue(source);
    await expect(sourceField(frame)).toBeFocused();
    await expect(block).toBeHidden();
    await expect(popup(page)).toHaveCount(0);

    await sourceField(frame).fill(edited);
    await page.keyboard.press('Enter');

    await expect(sourceField(frame)).toHaveCount(0);
    await expect(frame.locator(selector).first()).toContainText(rendered);
    expect(fs.readFileSync(file, 'utf-8')).toBe(BLOCKS_SOURCE.replace(source, edited));
  });
}

test('a quote shows its Markdown without its annotations, which stay in the file', async ({ page, ld }) => {
  const { file, frame } = await openBlocks(page, ld);
  await frame.locator('blockquote').dblclick();
  await expect(sourceField(frame)).toHaveValue('> Citation\n> suite');
  await sourceField(frame).fill('> Corrigée');
  await frame.getByRole('heading', { level: 2, name: 'Cible' }).click();

  await expect(sourceField(frame)).toHaveCount(0);
  await expect(frame.locator('blockquote.ld-callout-info')).toContainText('Corrigée');
  expect(fs.readFileSync(file, 'utf-8')).toBe(BLOCKS_SOURCE.replace('> Citation\n> suite', '> Corrigée'));
});

test('in the Markdown field, Shift+Enter adds a line and Tab indents without leaving it', async ({ page, ld }) => {
  const { frame } = await openBlocks(page, ld);
  await frame.locator('ul').first().dblclick();
  // After "- Un". End does not move the caret on macOS.
  for (const _ of '- Un') await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.type('x');
  await expect(sourceField(frame)).toBeFocused();
  await expect(sourceField(frame)).toHaveValue('- Un\n  x\n- Deux\n  - Imbriqué');
});

test('Escape or an unchanged field restore the block without writing', async ({ page, ld }) => {
  const { file, frame } = await openBlocks(page, ld);
  const writes: string[] = [];
  page.on('request', (request) => { if (request.method() === 'PUT') writes.push(request.url()); });
  const list = frame.locator('ul').first();

  await list.dblclick();
  await sourceField(frame).fill('- Perdu');
  await page.keyboard.press('Escape');
  await expect(sourceField(frame)).toHaveCount(0);
  await expect(list).toBeVisible();

  await list.dblclick();
  await page.keyboard.press('Enter');
  await expect(sourceField(frame)).toHaveCount(0);
  await expect(list).toBeVisible();

  expect(writes).toEqual([]);
  expect(fs.readFileSync(file, 'utf-8')).toBe(BLOCKS_SOURCE);
});

test('emptying the Markdown field removes the block from the file', async ({ page, ld }) => {
  const { file, frame } = await openBlocks(page, ld);
  await frame.locator('table').dblclick();
  await sourceField(frame).fill('  \n');
  await page.keyboard.press('Enter');
  await expect(sourceField(frame)).toHaveCount(0);
  await expect(frame.locator('table')).toHaveCount(0);
  expect(fs.readFileSync(file, 'utf-8')).toBe(BLOCKS_SOURCE.replace(`${BLOCKS.table}\n\n`, ''));
});

test('the Markdown field keeps the text when the document changed elsewhere', async ({ page, ld }) => {
  const { file, frame } = await openBlocks(page, ld);
  const external = BLOCKS_SOURCE.replace('Note[^1]', 'Note externe[^1]');
  fs.writeFileSync(file, external);
  await frame.locator('ul').first().dblclick();
  await sourceField(frame).fill('- Gardé');
  await page.keyboard.press('ControlOrMeta+Enter');

  await expect(page.getByTestId('html-view-save-error')).toBeVisible();
  await expect(sourceField(frame)).toHaveValue('- Gardé');
  expect(fs.readFileSync(file, 'utf-8')).toBe(external);
});

test('a footnote at the end of the page opens no field', async ({ page, ld }) => {
  const { frame } = await openBlocks(page, ld);
  await frame.getByText('Le texte.').dblclick();
  await expect(sourceField(frame)).toHaveCount(0);
  await expect(editing(frame)).toHaveCount(0);
});
