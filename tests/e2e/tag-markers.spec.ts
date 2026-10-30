import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect, type LDContext } from '../helpers/ld-fixture';

const ID = '2026_01_01_10_00_[General]_intro';

// Shift + right-click on the first char of a unique substring of #doc-content.
async function shiftRightClickOn(page: Page, needle: string) {
  const point = await page.evaluate((text) => {
    const root = document.querySelector('#doc-content');
    if (!root) throw new Error('no #doc-content');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = (node.textContent ?? '').indexOf(text);
      if (at < 0) continue;
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + 1);
      const rect = range.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    throw new Error(`text not found: ${text}`);
  }, needle);
  await page.keyboard.down('Shift');
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await page.keyboard.up('Shift');
}

async function seed(request: APIRequestContext, ld: LDContext, content: string) {
  const res = await request.put(`${ld.baseURL}/api/documents/${encodeURIComponent(ID)}`, { data: { content } });
  expect(res.ok()).toBe(true);
  // The server may add front matter on save: return what is actually stored.
  const stored = await request.get(`${ld.baseURL}/api/documents/${encodeURIComponent(ID)}`);
  return (await stored.json()).content as string;
}

async function readContent(request: APIRequestContext, ld: LDContext): Promise<string> {
  const res = await request.get(`${ld.baseURL}/api/documents/${encodeURIComponent(ID)}`);
  return (await res.json()).content;
}

const open = (page: Page, ld: LDContext) => page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(ID)}`);

test('a lone tag renders a marker with a tooltip', async ({ page, request, ld }) => {
  await seed(request, ld, '# Tags\n\n<add-footnote>\n\nSome text.\n');
  await open(page, ld);
  const marker = page.locator('.ld-tag-marker');
  await expect(marker).toHaveText('b');
  await expect(marker).toHaveAttribute('title', '<add-footnote>');
});

test('shift + right-click inserts the typed tag before the clicked char', async ({ page, request, ld }) => {
  await seed(request, ld, '# Tags\n\nHello unique-zebra world today.\n');
  await open(page, ld);
  await expect(page.locator('#doc-content')).toContainText('unique-zebra');
  await shiftRightClickOn(page, 'world');
  await expect(page.getByTestId('tag-insert-popup')).toBeVisible();
  await page.getByTestId('tag-insert-input').fill('rewrite-section');
  await page.keyboard.press('Enter');
  await expect.poll(() => readContent(request, ld)).toContain('<rewrite-section>world');
  await page.reload();
  await expect(page.locator('.ld-tag-marker')).toHaveAttribute('data-tag', 'rewrite-section');
});

test('the popup suggests the configured tag names', async ({ page, request, ld }) => {
  await request.put(`${ld.baseURL}/api/config`, { data: { tagSuggestions: ['add-footnote'] } });
  await seed(request, ld, '# Tags\n\nHello unique-zebra world today.\n');
  await open(page, ld);
  await expect(page.locator('#doc-content')).toContainText('unique-zebra');
  await shiftRightClickOn(page, 'world');
  await expect(page.getByTestId('tag-insert-popup')).toBeVisible();
  await expect(page.locator('datalist option')).toHaveAttribute('value', 'add-footnote');
});

test('shift + right-click in a table is refused and nothing is written', async ({ page, request, ld }) => {
  const content = '# Tags\n\n| Col A | Col B |\n|---|---|\n| cellvalue | other |\n';
  const stored = await seed(request, ld, content);
  await open(page, ld);
  await expect(page.locator('#doc-content td').first()).toBeVisible();
  await shiftRightClickOn(page, 'cellvalue');
  await expect(page.locator('#workspaceToastStack')).toContainText('table, code or diagram');
  await expect(page.getByTestId('tag-insert-popup')).toHaveCount(0);
  expect(await readContent(request, ld)).toBe(stored);
});

test('shift + right-click on an ambiguous passage is refused', async ({ page, request, ld }) => {
  const content = '# Tags\n\nRepeated sentence here.\n\nRepeated sentence here.\n';
  const stored = await seed(request, ld, content);
  await open(page, ld);
  await expect(page.locator('#doc-content p').first()).toBeVisible();
  await shiftRightClickOn(page, 'sentence');
  await expect(page.locator('#workspaceToastStack')).toContainText('several times');
  await expect(page.getByTestId('tag-insert-popup')).toHaveCount(0);
  expect(await readContent(request, ld)).toBe(stored);
});

test('a plain right-click keeps opening the snippet menu', async ({ page, request, ld }) => {
  const content = '# Tags\n\n| Col A | Col B |\n|---|---|\n| cellvalue | other |\n';
  await seed(request, ld, content);
  await open(page, ld);
  await expect(page.locator('#doc-content td').first()).toBeVisible();
  await page.locator('#doc-content td').first().click({ button: 'right' });
  await expect(page.locator('#inline-snippet-popup')).toBeVisible();
  await expect(page.getByTestId('tag-insert-popup')).toHaveCount(0);
});
