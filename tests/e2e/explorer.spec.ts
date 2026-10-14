import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

function writeDoc(docsAbs: string, rel: string): void {
  const abs = path.join(docsAbs, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const name = path.basename(rel, '.md');
  const title = name.charAt(0).toUpperCase() + name.slice(1);
  fs.writeFileSync(abs, `---\ntype: Concept\ntitle: ${title}\n---\n\nBody of ${rel}\n`);
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

test('show hidden entries reveals reserved files first, greyed, opened read-only without actions', async ({ page, ld }) => {
  writeDoc(ld.docsAbs, 'keep.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'liv-doc-main.md'), '---\norder:\n  - keep.md\nhidden: []\n---\n');

  await page.goto(ld.baseURL);
  const tree = page.getByTestId('category-tree');
  await expect(tree.getByText('Keep', { exact: true })).toBeVisible();
  await expect(tree.locator('[data-reserved="true"]')).toHaveCount(0);

  await page.getByTestId('toggle-show-hidden').click();
  const reserved = tree.locator(':scope > [data-reserved="true"]');
  await expect(reserved).toHaveText(['index.md', 'log.md', 'liv-doc-main.md']);
  expect(await tree.locator(':scope > button').first().getAttribute('data-reserved')).toBe('true');

  const manifest = reserved.filter({ hasText: 'liv-doc-main.md' });
  await expect(manifest).not.toHaveAttribute('draggable', 'true');
  await manifest.click({ button: 'right' });
  await expect(page.getByTestId('tree-menu-toggle-hidden')).toHaveCount(0);

  await manifest.click();
  await expect(page.locator('article code.language-yaml')).toContainText('keep.md');
  await expect(page.getByTestId('read-only-badge')).toBeVisible();
  await expect(page.getByTestId('edit-doc-btn')).toHaveCount(0);
  await expect(page.getByTestId('delete-doc-btn')).toHaveCount(0);
});

test('a linked instruction file is listed like a document, without drag or context menu', async ({ page, ld }) => {
  fs.writeFileSync(path.join(ld.parent, 'CLAUDE.md'), '---\ntitle: Claude entry point\n---\n\nRead me first.\n');
  fs.mkdirSync(path.join(ld.docsAbs, 'AI'), { recursive: true });
  fs.symlinkSync('../../CLAUDE.md', path.join(ld.docsAbs, 'AI', 'CLAUDE.md'));

  await page.goto(ld.baseURL);
  const tree = page.getByTestId('category-tree');
  await tree.locator('span[title="AI"]').click();
  const linked = tree.locator('[data-linked="true"]');
  await expect(linked).toContainText('Claude entry point');
  await expect(linked).not.toHaveAttribute('draggable', 'true');
  await linked.click({ button: 'right' });
  await expect(page.getByTestId('tree-menu-toggle-hidden')).toHaveCount(0);

  await linked.click();
  await expect(page.locator('article')).toContainText('Read me first.');
});

test('drag an entry above another to reorder its folder', async ({ page, ld }) => {
  for (const name of ['a', 'b', 'c']) writeDoc(ld.docsAbs, `${name}.md`);
  fs.writeFileSync(path.join(ld.docsAbs, 'liv-doc-main.md'), '---\norder:\n  - a.md\n  - b.md\n  - c.md\n---\n');

  await page.goto(ld.baseURL);
  const tree = page.getByTestId('category-tree');
  await tree.getByText('C', { exact: true }).dragTo(tree.getByText('A', { exact: true }), {
    targetPosition: { x: 10, y: 1 },
  });

  await expect(tree.locator(':scope > .doc-item').first()).toHaveText(/C/);
  const order = await tree.locator(':scope > .doc-item > div > span.truncate').allTextContents();
  expect(order.slice(0, 3)).toEqual(['C', 'A', 'B']);
  expect(fs.readFileSync(path.join(ld.docsAbs, 'liv-doc-main.md'), 'utf-8')).toContain('order:\n  - c.md\n  - a.md\n  - b.md\n');
});

test('drag the open document into a closed folder that opens on hover; the document stays open', async ({ page, ld }) => {
  writeDoc(ld.docsAbs, 'note.md');
  writeDoc(ld.docsAbs, 'archive/old.md');

  await page.goto(ld.baseURL);
  const tree = page.getByTestId('category-tree');
  await tree.getByText('Note', { exact: true }).click();
  await expect(page.locator('article')).toContainText('Body of note.md');

  const archive = tree.locator('span[title="archive"]');
  await tree.getByText('Note', { exact: true }).hover();
  await page.mouse.down();
  await archive.hover();
  await archive.hover({ position: { x: 5, y: 5 } });
  await expect(tree.locator('[data-drop="inside"]')).toHaveCount(1);
  await expect(tree.getByText('Old', { exact: true })).toBeVisible();
  await archive.hover();
  await page.mouse.up();

  await expect(page).toHaveURL(/doc=archive%252Fnote/);
  expect(fs.existsSync(path.join(ld.docsAbs, 'archive/note.md'))).toBe(true);
  await expect(page.locator('article')).toContainText('Body of note.md');
  await expect(tree.locator('.doc-item.active')).toContainText('Note');
});

test('dropping a folder into its own descendant is refused with a toast', async ({ page, ld }) => {
  writeDoc(ld.docsAbs, 'parent/child/leaf.md');

  await page.goto(ld.baseURL);
  const tree = page.getByTestId('category-tree');
  await tree.locator('span[title="parent"]').click();
  await tree.locator('span[title="parent"]').dragTo(tree.locator('span[title="child"]'));

  await expect(page.locator('#workspaceToastStack')).toContainText('Could not move');
  expect(fs.existsSync(path.join(ld.docsAbs, 'parent/child/leaf.md'))).toBe(true);
  await expect(tree.locator('span[title="child"]')).toBeVisible();
});

test('rename the open document from its context menu: the URL follows and incoming links are rewritten', async ({ page, ld }) => {
  writeDoc(ld.docsAbs, 'note.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'other.md'), '---\ntype: Concept\ntitle: Other\n---\n\nSee [note](./note.md#top).\n');

  await page.goto(ld.baseURL);
  const tree = page.getByTestId('category-tree');
  await tree.getByText('Note', { exact: true }).click();
  await expect(page.locator('article')).toContainText('Body of note.md');

  await tree.getByText('Note', { exact: true }).click({ button: 'right' });
  await page.getByTestId('tree-menu-rename').click();
  const input = page.getByTestId('rename-entry-input');
  await expect(input).toHaveValue('note');
  await input.fill('memo');
  await input.press('Enter');

  await expect(page).toHaveURL(/doc=memo(&|$|#)/);
  await expect(page.locator('article')).toContainText('Body of note.md');
  expect(fs.existsSync(path.join(ld.docsAbs, 'memo.md'))).toBe(true);
  expect(fs.readFileSync(path.join(ld.docsAbs, 'other.md'), 'utf-8')).toContain('[note](./memo.md#top)');
  await expect(tree.locator('.doc-item.active')).toContainText('Note');
});

test('rename a folder; a taken name is refused in the dialog without touching the disk', async ({ page, ld }) => {
  writeDoc(ld.docsAbs, 'drafts/a.md');
  writeDoc(ld.docsAbs, 'archive/b.md');

  await page.goto(ld.baseURL);
  const tree = page.getByTestId('category-tree');
  await tree.locator('span[title="drafts"]').click({ button: 'right' });
  await page.getByTestId('tree-menu-rename').click();
  const input = page.getByTestId('rename-entry-input');
  await expect(input).toHaveValue('drafts');
  await input.fill('archive');
  await page.getByTestId('rename-entry-submit').click();
  await expect(page.getByTestId('rename-entry-error')).toContainText('already');
  expect(fs.existsSync(path.join(ld.docsAbs, 'drafts/a.md'))).toBe(true);

  await input.fill('notes');
  await page.getByTestId('rename-entry-submit').click();
  await expect(input).toHaveCount(0);
  await expect(tree.locator('span[title="notes"]')).toBeVisible();
  expect(fs.existsSync(path.join(ld.docsAbs, 'notes/a.md'))).toBe(true);
});

test('rename is not offered on hidden entries nor on the reserved root folders', async ({ page, ld }) => {
  writeDoc(ld.docsAbs, 'secret.md');
  writeDoc(ld.docsAbs, 'images/readme.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'liv-doc-main.md'), '---\nhidden:\n  - secret.md\n---\n');

  await page.goto(ld.baseURL);
  const tree = page.getByTestId('category-tree');
  await tree.locator('span[title="images"]').click({ button: 'right' });
  await expect(page.getByTestId('tree-menu-toggle-hidden')).toBeVisible();
  await expect(page.getByTestId('tree-menu-rename')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.mouse.click(1, 1);

  await page.getByTestId('toggle-show-hidden').click();
  await tree.getByText('Secret', { exact: true }).click({ button: 'right' });
  await expect(page.getByTestId('tree-menu-toggle-hidden')).toBeVisible();
  await expect(page.getByTestId('tree-menu-rename')).toHaveCount(0);
});

test('delete a folder from its context menu after confirming: the open document inside it closes', async ({ page, ld }) => {
  writeDoc(ld.docsAbs, 'drafts/a.md');
  writeDoc(ld.docsAbs, 'drafts/sub/b.md');

  await page.goto(ld.baseURL);
  const tree = page.getByTestId('category-tree');
  await tree.locator('span[title="drafts"]').click();
  await tree.getByText('A', { exact: true }).click();
  await expect(page).toHaveURL(/doc=drafts%(25)?2Fa/);

  await tree.locator('span[title="drafts"]').click({ button: 'right' });
  await page.getByTestId('tree-menu-delete').click();
  await expect(page.getByTestId('delete-folder-count')).toContainText('2 documents');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByTestId('delete-folder-dialog')).toHaveCount(0);
  expect(fs.existsSync(path.join(ld.docsAbs, 'drafts/a.md'))).toBe(true);

  await tree.locator('span[title="drafts"]').click({ button: 'right' });
  await page.getByTestId('tree-menu-delete').click();
  await page.getByTestId('delete-folder-submit').click();

  await expect(page.getByTestId('delete-folder-dialog')).toHaveCount(0);
  await expect(tree.locator('span[title="drafts"]')).toHaveCount(0);
  await expect(page).not.toHaveURL(/doc=/);
  expect(fs.existsSync(path.join(ld.docsAbs, 'drafts'))).toBe(false);
});

test('delete is offered on folders only, never on documents nor on the reserved root folders', async ({ page, ld }) => {
  writeDoc(ld.docsAbs, 'note.md');
  writeDoc(ld.docsAbs, 'images/readme.md');

  await page.goto(ld.baseURL);
  const tree = page.getByTestId('category-tree');
  await tree.locator('span[title="images"]').click({ button: 'right' });
  await expect(page.getByTestId('tree-menu-toggle-hidden')).toBeVisible();
  await expect(page.getByTestId('tree-menu-delete')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.mouse.click(1, 1);

  await tree.getByText('Note', { exact: true }).click({ button: 'right' });
  await expect(page.getByTestId('tree-menu-rename')).toBeVisible();
  await expect(page.getByTestId('tree-menu-delete')).toHaveCount(0);
});

test('deleting a favorite document drops it from the favorites menu', async ({ page, ld }) => {
  writeDoc(ld.docsAbs, 'drafts/a.md');
  const configFile = path.join(ld.docsAbs, '.living-doc.json');
  const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  fs.writeFileSync(configFile, JSON.stringify({ ...config, favorites: [{ id: encodeURIComponent('drafts/a'), title: 'A' }] }));

  // The top favorite opens by default.
  await page.goto(ld.baseURL);
  await expect(page.getByTestId('doc-title')).toHaveText('A');
  await page.getByTestId('delete-doc-btn').click();
  await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
  await expect.poll(() => fs.existsSync(path.join(ld.docsAbs, 'drafts/a.md'))).toBe(false);

  await page.getByRole('button', { name: 'Favorites' }).click();
  await expect(page.locator('.favorites-empty')).toBeVisible();
});
