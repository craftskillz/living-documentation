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
