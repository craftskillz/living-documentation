import { test, expect } from '../helpers/ld-fixture';

test.describe('metadata accuracy gauge (UI)', () => {
  test.use({ fixtureName: 'with-metadata' });

  test('accuracy gauge shows 100% when the source file matches the stored hash', async ({
    page,
    ld,
  }) => {
    await page.goto(ld.baseURL);
    await page.locator('#category-tree').getByText('Intro', { exact: true }).click();
    await expect(page.locator('#accuracy-gauge')).toBeVisible();
    await expect(page.locator('#accuracy-gauge-value')).toHaveText(/100\s*%/);
  });
});

test.describe('metadata modal is read-only on SuperSeeded documents', () => {
  test.use({ fixtureName: 'with-metadata' });

  const SUPERSEEDED_ID = '2026_01_02_10_00_[ADR]_superseded';

  test('opens, shows the banner, hides every mutation control', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(SUPERSEEDED_ID)}`);
    await expect(page.locator('#doc-title')).toHaveText('Superseded');

    await page.locator('#metadata-btn').click();
    const modal = page.locator('#metadata-modal');
    await expect(modal).toBeVisible();

    await expect(page.locator('#metadata-readonly-banner')).toBeVisible();
    await expect(page.locator('#metadata-refresh-btn')).toBeHidden();
    await expect(page.locator('#metadata-add-btn')).toBeHidden();
    await expect(page.locator('#metadata-list .metadata-row-remove').first()).toBeHidden();

    // The list itself is still rendered so the user can inspect the bindings.
    await expect(page.locator('#metadata-list')).toContainText('sample.ts');
  });

  test('controls come back when switching to a non-SuperSeeded document', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(SUPERSEEDED_ID)}`);
    await page.locator('#metadata-btn').click();
    await expect(page.locator('#metadata-refresh-btn')).toBeHidden();
    await page.locator('button:has(.fa-xmark)').first().click();

    await page.locator('#category-tree').getByText('Intro', { exact: true }).click();
    await expect(page.locator('#doc-title')).toHaveText('Intro');
    await page.locator('#metadata-btn').click();
    await expect(page.locator('#metadata-readonly-banner')).toBeHidden();
    await expect(page.locator('#metadata-refresh-btn')).toBeVisible();
    await expect(page.locator('#metadata-add-btn')).toBeVisible();
  });
});
