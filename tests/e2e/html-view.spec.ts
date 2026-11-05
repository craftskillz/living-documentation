import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect } from '../helpers/ld-fixture';

const FILLER = 'Paragraphe de remplissage.\n\n'.repeat(60);
const SOURCE = `---\ntitle: Fiche\nhtml_template: article\n---\n\n# Grand titre\n\nIntroduction\n\n${FILLER}## Cible\n\nTexte **modifiable** ici.\n\n[Autre](?doc=autre)\n\n<a href="javascript:parent.document.title='lien-execute'">Piege</a>\n\n<script>parent.document.title = 'script-execute';</script>\n\n## Suivante\n\nFin.\n`;

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

const editor = (page: Page) => page.locator('#section-markdown');

test('Voir en HTML opens the application page with the render in a script-free frame', async ({ page, request, ld }) => {
  await request.put(`${ld.baseURL}/api/config`, { data: { gitIntegration: { mode: 'disabled' } } });
  setup(ld);
  await page.goto(`${ld.baseURL}/?doc=fiche`);
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByTestId('html-view-btn').click()]);
  await expect(popup).toHaveURL(/\/html-view\?doc=fiche$/);
  const iframe = popup.getByTestId('html-view-frame');
  await expect(iframe).toHaveAttribute('sandbox', 'allow-same-origin');
  await expect(popup.frameLocator('iframe[data-testid="html-view-frame"]').getByRole('heading', { level: 2, name: 'Cible' })).toBeVisible();
  await expect(popup).not.toHaveTitle('script-execute');
  await expect(popup.getByTestId('html-view-print')).toHaveAttribute('href', '/api/html-templates/render?doc=fiche');
});

test('right click on a block edits its section, then the page is regenerated at the same position', async ({ page, ld }) => {
  const file = setup(ld);
  const frame = await openView(page, ld.baseURL);
  const word = frame.locator('strong', { hasText: 'modifiable' });
  await word.scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => document.querySelector('iframe')!.contentWindow!.scrollY);
  expect(scroll).toBeGreaterThan(0);

  await word.click({ button: 'right' });
  await expect(editor(page)).toHaveValue(/^## Cible\n\nTexte \*\*modifiable\*\* ici\./);
  await editor(page).fill('## Cible\n\nTexte **corrigé** ici.\n\n');
  await page.locator('#section-editor .section-save').click();
  await expect(page.locator('#section-editor')).toHaveCount(0);

  await expect(frame.locator('strong', { hasText: 'corrigé' })).toBeVisible();
  expect(fs.readFileSync(file, 'utf-8')).toContain('Texte **corrigé** ici.');
  expect(fs.readFileSync(file, 'utf-8')).toContain('## Suivante');
  const after = await page.evaluate(() => document.querySelector('iframe')!.contentWindow!.scrollY);
  expect(Math.abs(after - scroll)).toBeLessThan(100);

  // The next edit starts from the saved content, not from the page's first load.
  await frame.locator('strong', { hasText: 'corrigé' }).click({ button: 'right' });
  await expect(editor(page)).toHaveValue(/corrigé/);
});

test('with selected text, right click leaves the browser menu', async ({ page, ld }) => {
  setup(ld);
  const frame = await openView(page, ld.baseURL);
  const word = frame.locator('strong', { hasText: 'modifiable' });
  await word.scrollIntoViewIfNeeded();
  await word.selectText();
  await word.click({ button: 'right' });
  await expect(page.locator('#section-editor')).toHaveCount(0);
});

test('right click outside any block, on the title, leaves the browser menu', async ({ page, ld }) => {
  setup(ld);
  const frame = await openView(page, ld.baseURL);
  await frame.getByRole('heading', { level: 1, name: 'Grand titre' }).click({ button: 'right' });
  await expect(page.locator('#section-editor')).toHaveCount(0);
});

test('a link to another document opens it in the application', async ({ page, ld }) => {
  setup(ld);
  const frame = await openView(page, ld.baseURL);
  const link = frame.getByRole('link', { name: 'Autre', exact: true });
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect(page).toHaveURL(/\/\?doc=autre$/);
  await expect(page.locator('#doc-content h1')).toHaveText('Autre');
});

test('a javascript: link in a document does not run in the application', async ({ page, ld }) => {
  setup(ld);
  const frame = await openView(page, ld.baseURL);
  const link = frame.getByRole('link', { name: 'Piege' });
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect(page).not.toHaveTitle('lien-execute');
  await expect(page).toHaveURL(/\/html-view\?doc=fiche$/);
});
