import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

test('the first click offers the library, then the HTML opens in a new window', async ({ page, request, ld }) => {
  await request.put(`${ld.baseURL}/api/config`, { data: { gitIntegration: { mode: 'disabled' } } });
  const file = path.join(ld.docsAbs, 'fiche.md');
  fs.writeFileSync(file, '---\ntitle: Fiche\n---\n\n# Grand titre\n\n## Première\n\nTexte\n');
  await page.goto(`${ld.baseURL}/?doc=fiche`);

  await expect(page.getByTestId('html-view-btn')).toHaveCount(0);
  await page.getByTestId('html-generate-btn').click();
  await page.getByTestId('html-template-interview-sheet').click();
  await expect(page.getByTestId('html-template-picker')).toHaveCount(0);
  await expect(page.getByTestId('html-generate-btn')).toHaveCount(0);
  expect(fs.readFileSync(file, 'utf-8')).toContain('html_template: interview-sheet');

  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByTestId('html-view-btn').click()]);
  const rendered = popup.frameLocator('iframe[data-testid="html-view-frame"]');
  await expect(rendered.getByRole('heading', { level: 1, name: 'Grand titre' })).toBeVisible();
  await expect(rendered.locator('section#premiere')).toContainText('Texte');

  // The choice is remembered and can still be changed.
  await page.reload();
  await expect(page.getByTestId('html-view-btn')).toBeVisible();
  await page.getByTestId('html-change-template-btn').click();
  await expect(page.getByTestId('html-template-picker')).toBeVisible();
});

test('a template missing from the library falls back to the choice', async ({ page, request, ld }) => {
  await request.put(`${ld.baseURL}/api/config`, { data: { gitIntegration: { mode: 'disabled' } } });
  fs.writeFileSync(path.join(ld.docsAbs, 'ancien.md'), '---\ntitle: Ancien\nhtml_template: removed\n---\n\n# Ancien\n');
  await page.goto(`${ld.baseURL}/?doc=ancien`);
  await expect(page.getByTestId('html-generate-btn')).toBeVisible();
});
