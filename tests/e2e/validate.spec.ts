import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';

test.describe('validate button', () => {
  test.use({ fixtureName: 'with-validate-status' });

  test('hidden on documents whose frontmatter status is not "To be validated"', async ({ page, ld }) => {
    const docId = '2026_01_03_10_00_[ADR]_already_accepted';
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await expect(page.getByTestId('doc-title')).toHaveText('Already Accepted');
    await expect(page.getByTestId('validate-btn')).toBeHidden();
  });

  test('documents with YAML-style status or no frontmatter load without showing validate action unless pending', async ({ page, ld }) => {
    const yamlAcceptedDocId = '2026_01_05_10_00_[ADR]_yaml_accepted';
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(yamlAcceptedDocId)}`);
    await expect(page.getByTestId('doc-title')).toHaveText('Yaml Accepted');
    await expect(page.getByTestId('doc-content')).not.toContainText('Cannot read properties');
    await expect(page.getByTestId('validate-btn')).toBeHidden();

    const plainDocId = '2026_01_06_10_00_[General]_plain_document';
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(plainDocId)}`);
    await expect(page.getByTestId('doc-title')).toHaveText('Plain Document');
    await expect(page.getByTestId('doc-content')).not.toContainText('Cannot read properties');
    await expect(page.getByTestId('validate-btn')).toBeHidden();
  });

  test('visible and green on a "To be validated" document', async ({ page, ld }) => {
    const docId = '2026_01_01_10_00_[ADR]_to_be_validated_pristine';
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    const btn = page.getByTestId('validate-btn');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Validate');
    await expect(btn).toHaveClass(/bg-green-600/);
  });

  test('on 100% reliability: modal omits the low-accuracy warning, confirm flips status', async ({ page, ld }) => {
    const docId = '2026_01_01_10_00_[ADR]_to_be_validated_pristine';
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await expect(page.getByTestId('validate-btn')).toBeVisible();
    await page.getByTestId('validate-btn').click();

    await expect(page.getByTestId('confirm-modal')).toBeVisible();
    await expect(page.getByTestId('confirm-modal-message')).toContainText('To be validated');
    await expect(page.getByTestId('confirm-modal-detail')).toBeHidden();

    await page.getByTestId('confirm-modal-ok').click();

    // The button hides after the doc reload because the new status is Accepted.
    await expect(page.getByTestId('validate-btn')).toBeHidden();

    // The file on disk reflects the flipped status.
    const fileAfter = fs.readFileSync(docPath, 'utf-8');
    expect(fileAfter).toContain('**status:** Accepted');
    expect(fileAfter).not.toContain('**status:** To be validated');
  });

  test('on YAML-style "To be validated" frontmatter: confirm flips status in place', async ({ page, ld }) => {
    const docId = '2026_01_04_10_00_[ADR]_yaml_to_be_validated';
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await expect(page.getByTestId('validate-btn')).toBeVisible();
    await page.getByTestId('validate-btn').click();
    await page.getByTestId('confirm-modal-ok').click();

    await expect(page.getByTestId('validate-btn')).toBeHidden();

    const fileAfter = fs.readFileSync(docPath, 'utf-8');
    expect(fileAfter).toContain('status: Accepted');
    expect(fileAfter).not.toContain('status: To be validated');
  });

  test('on <100% reliability: modal warns, confirm flips status and re-baselines hashes', async ({ page, ld }) => {
    const docId = '2026_01_02_10_00_[ADR]_to_be_validated_drifted';
    const docPath = path.join(ld.docsAbs, `${docId}.md`);
    const metaPath = path.join(ld.docsAbs, '.metadata.json');
    const hashBefore = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))[docId][0].hash;
    expect(hashBefore).toBe('0'.repeat(64));

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await expect(page.getByTestId('validate-btn')).toBeVisible();
    await page.getByTestId('validate-btn').click();

    await expect(page.getByTestId('confirm-modal')).toBeVisible();
    const detail = page.getByTestId('confirm-modal-detail');
    await expect(detail).toBeVisible();
    // The placeholder must be substituted with a percentage value.
    await expect(detail).toContainText(/\d+%/);
    await expect(detail).not.toContainText('{accuracy}');
    // Warning tone styling: amber callout, never red.
    await expect(detail).toHaveClass(/bg-amber-50/);
    await expect(detail).not.toHaveClass(/red/);

    await page.getByTestId('confirm-modal-ok').click();

    await expect(page.getByTestId('validate-btn')).toBeHidden();

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
    await page.getByTestId('validate-btn').click();
    await page.getByTestId('confirm-modal-cancel').click();

    await expect(page.getByTestId('confirm-modal')).toBeHidden();
    await expect(page.getByTestId('validate-btn')).toBeVisible();
    expect(fs.readFileSync(docPath, 'utf-8')).toBe(before);
  });
});
