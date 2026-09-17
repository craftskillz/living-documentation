import { test, expect } from "../helpers/ld-fixture";

test("admin can hide optional header menus and restore them after reload", async ({ page, ld }) => {
  await page.goto(`${ld.baseURL}/admin`);
  const contextToggle = page.getByRole("checkbox", { name: "AI Context", exact: true });
  await expect(contextToggle).toBeChecked();
  await contextToggle.uncheck();
  await page.getByRole("checkbox", { name: "Survival Kit", exact: true }).uncheck();
  await page.locator('button[type="submit"]').click();
  const header = page.locator("header.topbar");
  await expect(header.locator('a[href="/context"]')).toHaveCount(0);
  await expect(header.locator('a[href="/survival-kit"]')).toHaveCount(0);
  for (const href of ["/admin", "/", "/diagram", "/files"]) {
    await expect(header.locator(`a[href="${href}"]`)).toBeVisible();
  }
  await page.reload();
  await expect(contextToggle).not.toBeChecked();
  await expect(header.locator('a[href="/context"]')).toHaveCount(0);
  await contextToggle.check();
  await page.locator('button[type="submit"]').click();
  await expect(header.locator('a[href="/context"]')).toBeVisible();
});

test("admin can hide the word cloud button", async ({ page, ld }) => {
  const wordCloudButton = page.locator('header.topbar button[aria-label="☁ Word Cloud"]');
  await page.goto(ld.baseURL);
  await expect(wordCloudButton).toBeVisible();
  await page.goto(`${ld.baseURL}/admin`);
  const toggle = page.getByRole("checkbox", { name: "Word Cloud", exact: true });
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
  await page.goto(ld.baseURL);
  await expect(page.locator("header.topbar")).toBeVisible();
  await expect(wordCloudButton).toHaveCount(0);
  await page.goto(`${ld.baseURL}/survival-kit`);
  await expect(page.locator("header.topbar")).toBeVisible();
  await expect(wordCloudButton).toHaveCount(0);
});
