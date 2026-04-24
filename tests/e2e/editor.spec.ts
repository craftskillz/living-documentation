import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';

test('edit, save, and verify the markdown is persisted on disk', async ({ page, ld }) => {
  await page.goto(ld.baseURL);
  await page.locator('#category-tree').getByText('Intro', { exact: true }).click();
  await page.locator('#view-actions button', { hasText: 'Edit' }).click();
  const editor = page.locator('#doc-editor');
  await expect(editor).toBeVisible();
  await editor.fill('# Edited title\n\nBrand new body.');
  await page.locator('#edit-actions button', { hasText: 'Save' }).click();
  // #doc-title is set from the filename and doesn't change on content edit — verify the rendered body instead.
  await expect(page.locator('#doc-view')).toContainText('Brand new body');

  const onDisk = fs.readFileSync(
    path.join(ld.docsAbs, '2026_01_01_10_00_[General]_intro.md'),
    'utf-8',
  );
  expect(onDisk).toContain('# Edited title');
  expect(onDisk).toContain('Brand new body');
});

test('cancel edit reverts without writing to disk', async ({ page, ld }) => {
  const docPath = path.join(ld.docsAbs, '2026_01_01_10_00_[General]_intro.md');
  const before = fs.readFileSync(docPath, 'utf-8');

  await page.goto(ld.baseURL);
  await page.locator('#category-tree').getByText('Intro', { exact: true }).click();
  await page.locator('#view-actions button', { hasText: 'Edit' }).click();
  await page.locator('#doc-editor').fill('Completely different content');
  await page.locator('#edit-actions button', { hasText: 'Cancel' }).click();

  const after = fs.readFileSync(docPath, 'utf-8');
  expect(after).toBe(before);
});
