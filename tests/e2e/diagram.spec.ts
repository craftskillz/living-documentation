import { test, expect } from '../helpers/ld-fixture';

test.describe('diagram editor', () => {
  test.use({ fixtureName: 'with-diagrams' });

  test('top bar copies the MCP diagram id', async ({ page, ld }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ld.baseURL });
    await page.goto(`${ld.baseURL}/diagram?id=diag-1`);
    await expect(page.locator('#diagramTitle')).toHaveValue('Sample Diagram');

    const copyButton = page.locator('#btnCopyDiagramId');
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe('diag-1');
    await expect(copyButton).toHaveAttribute('title', 'MCP diagram id copied');
    await expect(page.locator('#toastContainer')).toContainText('Diagram id copied to clipboard');
  });
});
