import { test, expect } from '../helpers/ld-fixture';

test.describe('Admin page — image style settings', () => {
  test('image style checkboxes are visible and unchecked by default on a fresh config', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/admin`);

    const rounded = page.getByLabel(/rounded/i);
    const centered = page.getByLabel(/cent/i);
    const border = page.getByLabel(/border/i);

    await expect(rounded).toBeVisible();
    await expect(centered).toBeVisible();
    await expect(border).toBeVisible();

    // Fresh fixture has no .living-doc.json — defaults are true (migration backfills them)
    await expect(rounded).toBeChecked();
    await expect(centered).toBeChecked();
    await expect(border).toBeChecked();
  });

  test('toggling and saving image style checkboxes persists to .living-doc.json', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/admin`);

    const rounded = page.getByLabel(/rounded/i);
    const centered = page.getByLabel(/cent/i);
    const border = page.getByLabel(/border/i);

    // Uncheck all three
    await rounded.uncheck();
    await centered.uncheck();
    await border.uncheck();

    await page.getByRole('button', { name: /enregistrer|save/i }).click();

    // Reload and verify persistence
    await page.reload();
    await expect(rounded).not.toBeChecked();
    await expect(centered).not.toBeChecked();
    await expect(border).not.toBeChecked();

    // Re-check all three and save
    await rounded.check();
    await centered.check();
    await border.check();
    await page.getByRole('button', { name: /enregistrer|save/i }).click();

    await page.reload();
    await expect(rounded).toBeChecked();
    await expect(centered).toBeChecked();
    await expect(border).toBeChecked();
  });

  test('image style classes are applied on doc-content when options are enabled', async ({ page, ld }) => {
    // Enable all three via API
    await fetch(`${ld.baseURL}/api/config`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageRoundedCorners: true, imageCentered: true, imageBorder: true }),
    });

    await page.goto(ld.baseURL);
    await page.getByTestId('category-tree').getByText('Intro', { exact: true }).click();

    const content = page.getByTestId('doc-content');
    await expect(content).toHaveClass(/\[&_img\]:rounded-xl/);
    await expect(content).toHaveClass(/\[&_img\]:mx-auto/);
    await expect(content).toHaveClass(/\[&_img\]:\[box-shadow/);
  });

  test('image style classes are absent on doc-content when options are disabled', async ({ page, ld }) => {
    await fetch(`${ld.baseURL}/api/config`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageRoundedCorners: false, imageCentered: false, imageBorder: false }),
    });

    await page.goto(ld.baseURL);
    await page.getByTestId('category-tree').getByText('Intro', { exact: true }).click();

    const content = page.getByTestId('doc-content');
    await expect(content).not.toHaveClass(/\[&_img\]:rounded-xl/);
    await expect(content).not.toHaveClass(/\[&_img\]:mx-auto/);
    await expect(content).not.toHaveClass(/\[&_img\]:\[box-shadow/);
  });
});
