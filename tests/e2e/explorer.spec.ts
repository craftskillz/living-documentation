import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

function writeDoc(docsAbs: string, rel: string): void {
  const abs = path.join(docsAbs, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `---\ntype: Concept\ntitle: ${path.basename(rel, '.md')}\n---\n\nBody of ${rel}\n`);
}

test('explorer shows folders in manifest order, dot folders included, and opens a nested document', async ({ page, ld }) => {
  writeDoc(ld.docsAbs, 'alpha/b.md');
  writeDoc(ld.docsAbs, 'zeta/a.md');
  writeDoc(ld.docsAbs, '.scratch/draft.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'liv-doc-main.md'), '---\norder:\n  - zeta\n---\n');

  await page.goto(ld.baseURL);
  const tree = page.getByTestId('category-tree');
  await expect(tree.locator('span[title="zeta"]')).toBeVisible();

  const folderNames = await tree.locator(':scope > div > button span[title]').evaluateAll((els) =>
    els.map((el) => el.getAttribute('title')),
  );
  expect(folderNames).toEqual(['zeta', '.scratch', 'alpha']);

  await tree.locator('span[title="zeta"]').click();
  await tree.getByText('A', { exact: true }).click();
  await expect(page.locator('article')).toContainText('Body of zeta/a.md');
});

test('hide an entry from its context menu, reveal it greyed, then show it again', async ({ page, ld }) => {
  writeDoc(ld.docsAbs, 'keep.md');
  writeDoc(ld.docsAbs, 'secret.md');
  const manifest = path.join(ld.docsAbs, 'liv-doc-main.md');

  await page.goto(ld.baseURL);
  const tree = page.getByTestId('category-tree');
  const secret = tree.getByText('Secret', { exact: true });
  await secret.click({ button: 'right' });
  await page.getByTestId('tree-menu-toggle-hidden').click();

  await expect(secret).toHaveCount(0);
  await expect(tree.getByText('Keep', { exact: true })).toBeVisible();
  expect(fs.readFileSync(manifest, 'utf-8')).toContain('hidden:\n  - secret.md\n');

  await page.getByTestId('toggle-show-hidden').click();
  await expect(tree.locator('[data-hidden="true"]')).toContainText('Secret');

  await page.reload();
  await expect(tree.locator('[data-hidden="true"]')).toContainText('Secret');
  await tree.getByText('Secret', { exact: true }).click({ button: 'right' });
  await page.getByTestId('tree-menu-toggle-hidden').click();
  await expect(tree.locator('[data-hidden="true"]')).toHaveCount(0);
  expect(fs.readFileSync(manifest, 'utf-8')).toContain('hidden: []');
});
