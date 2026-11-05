import fs from 'node:fs';
import path from 'node:path';
import type { FrameLocator, Page } from '@playwright/test';
import { test, expect } from '../helpers/ld-fixture';

const FILLER = 'Paragraphe de remplissage.\n\n'.repeat(60);
const SOURCE = `---\ntype: Document\ntitle: Fiche\nhtml_template: article\n---\n\n# Grand titre\n\nIntroduction\n\n${FILLER}## Cible\n\nTexte **modifiable** ici\nsur deux lignes.\n\nPrix \\*barré\\* ici.\n\nVoir [Autre](?doc=autre) ici.\n\n- Liste\n\n### Sous-titre\n\n## Suivante\n\nFin.\n`;

function setup(ld: { docsAbs: string }): string {
  const file = path.join(ld.docsAbs, 'fiche.md');
  fs.writeFileSync(file, SOURCE);
  fs.writeFileSync(path.join(ld.docsAbs, 'autre.md'), '---\ntitle: Autre\n---\n\n# Autre\n');
  return file;
}

async function openView(page: Page, baseURL: string) {
  await page.goto(`${baseURL}/html-view?doc=fiche`);
  const frame = page.frameLocator('iframe[data-testid="html-view-frame"]');
  await expect(frame.getByRole('heading', { level: 2, name: 'Cible' })).toBeVisible();
  return frame;
}

// A heading is as wide as the page: its centre is past the end of its text.
const ON_FIRST_WORD = { x: 5, y: 5 };
const editing = (frame: FrameLocator) => frame.locator('[contenteditable]');
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

test('Enter does nothing and Escape restores the block without writing', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const word = frame.locator('strong', { hasText: 'modifiable' });
  await word.scrollIntoViewIfNeeded();
  await word.dblclick();
  await page.keyboard.type('perdu');
  await page.keyboard.press('Enter');
  await expect(editing(frame)).toHaveCount(1);
  await expect(editing(frame).locator('br, p, div')).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(editing(frame)).toHaveCount(0);
  await expect(frame.locator('strong', { hasText: 'modifiable' })).toBeVisible();
  await frame.getByRole('heading', { level: 2, name: 'Cible' }).click();
  await page.waitForTimeout(200);
  expect(fs.readFileSync(file, 'utf-8')).toBe(SOURCE);
});

test('leaving a block unchanged or emptied writes nothing', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const writes: string[] = [];
  page.on('request', (request) => { if (request.method() === 'PUT') writes.push(request.url()); });
  const word = frame.locator('strong', { hasText: 'modifiable' });
  await word.scrollIntoViewIfNeeded();

  await word.dblclick();
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(editing(frame)).toHaveCount(0);

  await frame.getByRole('heading', { level: 3, name: 'Sous-titre' }).dblclick();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Delete');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(editing(frame)).toHaveCount(0);
  await expect(frame.getByRole('heading', { level: 3, name: 'Sous-titre' })).toBeVisible();

  expect(writes).toEqual([]);
  expect(fs.readFileSync(file, 'utf-8')).toBe(SOURCE);
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

test('double click on another kind of block changes nothing', async ({ page, ld }) => {
  setup(ld);
  const frame = await openView(page, ld.baseURL);
  const item = frame.getByRole('listitem').filter({ hasText: 'Liste' });
  await item.scrollIntoViewIfNeeded();
  await item.dblclick();
  await expect(editing(frame)).toHaveCount(0);
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
