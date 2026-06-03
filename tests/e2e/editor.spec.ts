import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';

test('edit, save, and verify the markdown is persisted on disk', async ({ page, ld }) => {
  await page.goto(ld.baseURL);
  await page.getByTestId('category-tree').getByText('Intro', { exact: true }).click();
  await page.getByTestId('view-actions').getByRole('button', { name: /Edit/ }).click();
  const editor = page.getByTestId('doc-editor');
  await expect(editor).toBeVisible();
  await editor.fill('# Edited title\n\nBrand new body.');
  await page.getByTestId('edit-actions').getByRole('button', { name: /Save/ }).click();
  // doc-title is set from the filename and doesn't change on content edit — verify the rendered body instead.
  await expect(page.getByTestId('doc-view')).toContainText('Brand new body');

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
  await page.getByTestId('category-tree').getByText('Intro', { exact: true }).click();
  await page.getByTestId('view-actions').getByRole('button', { name: /Edit/ }).click();
  await page.getByTestId('doc-editor').fill('Completely different content');
  await page.getByTestId('edit-actions').getByRole('button', { name: /Cancel/ }).click();

  const after = fs.readFileSync(docPath, 'utf-8');
  expect(after).toBe(before);
});
