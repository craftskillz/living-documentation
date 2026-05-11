import { test, expect } from '../helpers/ld-fixture';

test('sidebar lists all documents from the minimal fixture', async ({ page, ld }) => {
  await page.goto(ld.baseURL);
  const sidebar = page.locator('#category-tree');
  await expect(sidebar.getByText('Intro')).toBeVisible();
  await expect(sidebar.getByText('Quickstart')).toBeVisible();
  await expect(sidebar.getByText('Advanced')).toBeVisible();
});

test('opening a document renders its heading and body', async ({ page, ld }) => {
  await page.goto(ld.baseURL);
  // Intro is under General, expanded by default per sidebar conventions.
  await page.locator('#category-tree').getByText('Intro', { exact: true }).click();
  await expect(page.locator('#doc-title')).toHaveText(/Intro/i);
  await expect(page.locator('#doc-view')).toContainText('Welcome to the test documentation');
});

test('document header copies the MCP document id', async ({ page, ld }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ld.baseURL });
  const docId = '2026_01_02_10_00_[Guide]_quickstart';
  await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
  await expect(page.locator('#doc-title')).toHaveText('Quickstart');

  const copyButton = page.locator('#copy-doc-id-btn');
  await expect(copyButton).toBeVisible();
  await copyButton.click();

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toBe(docId);
  await expect(copyButton).toHaveAttribute('title', 'MCP document id copied');
});
