import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';

test.describe('validate button', () => {
  test.use({ fixtureName: 'with-validate-status' });

  test('hidden on documents whose frontmatter status is not "To be validated"', async ({ page, ld }) => {
    await page.goto(ld.baseURL);
    await page.locator('#category-tree').getByText('Already Accepted', { exact: true }).click();
    await expect(page.locator('#doc-title')).toHaveText('Already Accepted');
    await expect(page.locator('#validate-btn')).toBeHidden();
  });

  test('visible and green on a "To be validated" document', async ({ page, ld }) => {
    await page.goto(ld.baseURL);
    await page.locator('#category-tree').getByText('To Be Validated Pristine', { exact: true }).click();
    const btn = page.locator('#validate-btn');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Validate');
    await expect(btn).toHaveClass(/bg-green-600/);
  });

  test('on 100% reliability: modal omits the low-accuracy warning, confirm flips status', async ({ page, ld }) => {
    const docId = '2026_01_01_10_00_[ADR]_to_be_validated_pristine';
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await expect(page.locator('#validate-btn')).toBeVisible();
    await page.locator('#validate-btn').click();

    await expect(page.locator('#confirm-modal')).toBeVisible();
    await expect(page.locator('#confirm-modal-message')).toContainText('To be validated');
    await expect(page.locator('#confirm-modal-detail')).toBeHidden();

    await page.locator('#confirm-modal-ok').click();

    // The button hides after the doc reload because the new status is Accepted.
    await expect(page.locator('#validate-btn')).toBeHidden();

    // The file on disk reflects the flipped status.
    const fileAfter = fs.readFileSync(docPath, 'utf-8');
    expect(fileAfter).toContain('**status:** Accepted');
    expect(fileAfter).not.toContain('**status:** To be validated');
  });

  test('on <100% reliability: modal warns, confirm flips status and re-baselines hashes', async ({ page, ld }) => {
    const docId = '2026_01_02_10_00_[ADR]_to_be_validated_drifted';
    const docPath = path.join(ld.docsAbs, `${docId}.md`);
    const metaPath = path.join(ld.docsAbs, '.metadata.json');
    const hashBefore = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))[docId][0].hash;
    expect(hashBefore).toBe('0'.repeat(64));

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await expect(page.locator('#validate-btn')).toBeVisible();
    await page.locator('#validate-btn').click();

    await expect(page.locator('#confirm-modal')).toBeVisible();
    const detail = page.locator('#confirm-modal-detail');
    await expect(detail).toBeVisible();
    // The placeholder must be substituted with a percentage value.
    await expect(detail).toContainText(/\d+%/);
    await expect(detail).not.toContainText('{accuracy}');
    // Warning tone styling: amber callout, never red.
    await expect(detail).toHaveClass(/bg-amber-50/);
    await expect(detail).not.toHaveClass(/red/);

    await page.locator('#confirm-modal-ok').click();

    await expect(page.locator('#validate-btn')).toBeHidden();

    const fileAfter = fs.readFileSync(docPath, 'utf-8');
    expect(fileAfter).toContain('**status:** Accepted');

    const hashAfter = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))[docId][0].hash;
    expect(hashAfter).not.toBe(hashBefore);
    expect(hashAfter).toMatch(/^[0-9a-f]{64}$/);
  });

  test('cancel closes the modal without writing anything', async ({ page, ld }) => {
    const docId = '2026_01_01_10_00_[ADR]_to_be_validated_pristine';
    const docPath = path.join(ld.docsAbs, `${docId}.md`);
    const before = fs.readFileSync(docPath, 'utf-8');

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#validate-btn').click();
    await page.locator('#confirm-modal-cancel').click();

    await expect(page.locator('#confirm-modal')).toBeHidden();
    await expect(page.locator('#validate-btn')).toBeVisible();
    expect(fs.readFileSync(docPath, 'utf-8')).toBe(before);
  });
});
