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
