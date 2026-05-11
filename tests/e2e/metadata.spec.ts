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
