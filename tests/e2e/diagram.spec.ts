import fs from 'node:fs';
import path from 'node:path';
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

  test('PNG from a document diagram link overwrites its image and the document shows the new version', async ({ page, ld }) => {
    const docFile = path.join(ld.docsAbs, '2026_01_01_10_00_[General]_overview.md');
    const imagesDir = path.join(ld.docsAbs, 'images');
    const imagePath = path.join(imagesDir, 'arch_diagram.png');
    fs.appendFileSync(docFile, '\n[![Arch](./images/arch_diagram.png)](/diagram?id=diag-1)\n');
    fs.mkdirSync(imagesDir, { recursive: true });
    fs.writeFileSync(imagePath, Buffer.from('placeholder'));

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent('2026_01_01_10_00_[General]_overview')}`);
    const link = page.locator('a[href^="/diagram"]').filter({ has: page.locator('img[alt="Arch"]') });
    await expect(link).toHaveAttribute('href', '/diagram?id=diag-1&img=arch_diagram.png');

    await link.locator('img').click();
    await expect(page).toHaveURL(/\/diagram\?id=diag-1&img=arch_diagram\.png$/);
    await expect(page.locator('#diagramTitle')).toHaveValue('Sample Diagram');
    await page.locator('#vis-canvas canvas, canvas').first().click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.locator('#btnCopyPng').click();
    await expect(page.locator('#toastContainer')).not.toBeEmpty();
    await expect.poll(() => fs.readFileSync(imagePath).subarray(1, 4).toString()).toBe('PNG');

    await page.goBack();
    const img = page.locator('img[alt="Arch"]');
    await expect(img).toHaveAttribute('src', /^\/images\/arch_diagram\.png\?v=\d+$/);
    await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(1);
  });
});
