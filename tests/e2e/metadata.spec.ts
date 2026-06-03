import { test, expect } from '../helpers/ld-fixture';

test.describe('metadata accuracy gauge (UI)', () => {
  test.use({ fixtureName: 'with-metadata' });

  test('accuracy gauge shows 100% when the source file matches the stored hash', async ({
    page,
    ld,
  }) => {
    await page.goto(ld.baseURL);
    await page.getByTestId('category-tree').getByText('Intro', { exact: true }).click();
    await expect(page.getByTestId('accuracy-gauge')).toBeVisible();
    await expect(page.getByTestId('accuracy-gauge-value')).toHaveText(/100\s*%/);
  });
});

test.describe('metadata modal is read-only on SuperSeeded documents', () => {
  test.use({ fixtureName: 'with-metadata' });

  const SUPERSEEDED_ID = '2026_01_02_10_00_[ADR]_superseded';

  test('opens, shows the banner, hides every mutation control', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(SUPERSEEDED_ID)}`);
    await expect(page.getByTestId('doc-title')).toHaveText('Superseded');

    await page.getByTestId('metadata-btn').click();
    const modal = page.getByTestId('metadata-modal');
    await expect(modal).toBeVisible();

    await expect(page.getByTestId('metadata-readonly-banner')).toBeVisible();
    await expect(page.getByTestId('metadata-refresh-btn')).toBeHidden();
    await expect(page.getByTestId('metadata-add-btn')).toBeHidden();
    await expect(page.getByTestId('metadata-list').locator('.metadata-row-remove').first()).toBeHidden();

    // The list itself is still rendered so the user can inspect the bindings.
    await expect(page.getByTestId('metadata-list')).toContainText('sample.ts');
  });

  test('controls come back when switching to a non-SuperSeeded document', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(SUPERSEEDED_ID)}`);
    await page.getByTestId('metadata-btn').click();
    await expect(page.getByTestId('metadata-refresh-btn')).toBeHidden();
    await page.locator('button:has(.fa-xmark)').first().click();

    await page.getByTestId('category-tree').getByText('Intro', { exact: true }).click();
    await expect(page.getByTestId('doc-title')).toHaveText('Intro');
    await page.getByTestId('metadata-btn').click();
    await expect(page.getByTestId('metadata-readonly-banner')).toBeHidden();
    await expect(page.getByTestId('metadata-refresh-btn')).toBeVisible();
    await expect(page.getByTestId('metadata-add-btn')).toBeVisible();
  });
});
