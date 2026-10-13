import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

// US4b: the filename is only an identifier — no category, no pattern, no sort setting in the UI.

test('new document dialog has no category and previews the slug filename', async ({ page, ld }) => {
  await page.goto(ld.baseURL);
  await page.getByTitle('New document', { exact: true }).click();

  await expect(page.locator('#new-doc-category')).toHaveCount(0);
  await page.locator('#new-doc-title').fill('Mon Guide Été');
  await expect(page.getByTestId('new-doc-filename-preview')).toHaveText('mon-guide-ete.md');

  const response = page.waitForResponse((r) => r.url().endsWith('/api/documents') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const posted = (await response).request().postDataJSON();
  expect(posted).not.toHaveProperty('category');
  expect(fs.existsSync(path.join(ld.docsAbs, 'mon-guide-ete.md'))).toBe(true);
});

test('admin no longer exposes the filename pattern, sidebar sort or category expansion', async ({ page, ld }) => {
  await page.goto(`${ld.baseURL}/admin`);
  await expect(page.getByLabel(/rounded/i)).toBeVisible();

  await expect(page.locator('#field-pattern')).toHaveCount(0);
  await expect(page.locator('#field-sidebar-sort')).toHaveCount(0);
  await expect(page.getByText(/category expansion/i)).toHaveCount(0);

  const response = page.waitForResponse((r) => r.url().endsWith('/api/config') && r.request().method() === 'PUT');
  await page.getByRole('button', { name: /enregistrer|save/i }).click();
  const payload = (await response).request().postDataJSON();
  for (const key of ['filenamePattern', 'sidebarSort', 'exclusiveCategoryExpansion']) {
    expect(payload).not.toHaveProperty(key);
  }
});
