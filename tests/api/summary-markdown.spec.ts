import { test, expect } from '../helpers/ld-fixture';

test('document API renders summary Markdown and the heading remains clickable', async ({ request, page, ld }) => {
  const id = encodeURIComponent('2026_01_01_10_00_[General]_intro');
  const content = '<details>\n<summary># Slide **0** > 30</summary>\n\nHidden **body**.\n\n</details>\n\n```html\n<summary># Example</summary>\n```';
  const save = await request.put(`${ld.baseURL}/api/documents/${id}`, { data: { content } });
  expect(save.ok()).toBe(true);
  const response = await request.get(`${ld.baseURL}/api/documents/${id}`);
  expect(response.ok()).toBe(true);
  const doc = await response.json();
  expect(doc.content).toContain(content);
  await page.setContent(doc.html);
  await expect(page.locator('summary h1')).toHaveText('Slide 0 > 30');
  await expect(page.locator('summary strong')).toHaveText('0');
  await expect(page.locator('details p')).toBeHidden();
  await page.locator('summary h1').click();
  await expect(page.locator('details p')).toBeVisible();
  await page.locator('summary h1').click();
  await expect(page.locator('details p')).toBeHidden();
  await expect(page.locator('pre code')).toHaveText('<summary># Example</summary>\n');
});
