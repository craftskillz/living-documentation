import { test, expect } from '../helpers/ld-fixture';

test.describe('metadata accuracy gauge', () => {
  test.use({ fixtureName: 'with-metadata' });

  test('accuracy is 100% when source file matches the stored hash', async ({
    page,
    ld,
  }) => {
    await page.goto(ld.baseURL);
    await page.locator('#category-tree').getByText('Intro', { exact: true }).click();
    await expect(page.locator('#accuracy-gauge')).toBeVisible();
    await expect(page.locator('#accuracy-gauge-value')).toHaveText(/100\s*%/);
  });

  test('GET /api/metadata/:docId returns the attached entry', async ({
    request,
    ld,
  }) => {
    const docId = '2026_01_01_10_00_%5BGeneral%5D_intro';
    const res = await request.get(`${ld.baseURL}/api/metadata/${docId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].status).toBe('unchanged');
    expect(body.accuracy).toBe(1);
  });
});
