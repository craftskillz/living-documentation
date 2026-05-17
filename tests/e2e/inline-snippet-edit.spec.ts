import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';

test.describe('inline snippet editing from viewer', () => {
  test.use({ fixtureName: 'with-inline-snippets' });

  const docId = '2026_01_01_10_00_[General]_inline_snippets';

  test('right-click on colored text opens snippet editor and saves to markdown', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content span[style*="color"]').click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await page.locator('#inline-snippet-popup button').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-modal-title')).toHaveText('Edit inline snippet');
    await expect(page.locator('#snippet-type')).toHaveValue('colored-text');
    await expect(page.locator('#snippet-type')).toBeDisabled();
    await expect(page.locator('#snippet-preview-wrap')).toBeHidden();
    await expect(page.locator('#snip-colored-text-content')).toHaveValue('old inline text');

    await page.locator('#snip-colored-text-content').fill('new inline text');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content span[style*="color"]')).toContainText('new inline text');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('<span style="color:#3b82f6;">new inline text</span>');
    expect(onDisk).not.toContain('old inline text');
  });

  test('right-click on colored section opens snippet editor and saves block content', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content div[style*="border-left"]').click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await page.locator('#inline-snippet-popup button').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('colored-section');
    await expect(page.locator('#snippet-preview-wrap')).toBeHidden();
    await expect(page.locator('#snip-colored-content')).toHaveValue('Old section body');

    await page.locator('#snip-colored-content').fill('New section body');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content div[style*="border-left"]')).toContainText('New section body');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('New section body');
    expect(onDisk).not.toContain('Old section body');
  });

  test('right-click on table captures header, data rows, and empty cells', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content table').click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await page.locator('#inline-snippet-popup button').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('table');
    await expect(page.locator('#snippet-preview-wrap')).toBeHidden();
    const cardWidth = await page.locator('#snippet-modal-card').evaluate((el) => {
      return el.getBoundingClientRect().width;
    });
    expect(cardWidth).toBeGreaterThan(800);
    await expect(page.locator('#snip-table-rows')).toHaveText('5');
    await expect(page.locator('#snip-table-cols')).toHaveText('3');

    const cells = page.locator('#snip-table-grid input');
    await expect(cells).toHaveCount(15);
    await expect(cells.nth(0)).toHaveValue('En-tête 1');
    await expect(cells.nth(3)).toHaveValue('a');
    await expect(cells.nth(6)).toHaveValue('d');
    await expect(cells.nth(9)).toHaveValue('s');
    await expect(cells.nth(10)).toHaveValue('');
    await expect(cells.nth(12)).toHaveValue('');
    await expect(cells.nth(13)).toHaveValue('s');

    await cells.nth(14).fill('updated');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content table')).toContainText('updated');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('|           | s         | updated   |');
    expect(onDisk).not.toContain('|           | s         |           |');
  });

  test('right-click on code block captures language and editable code content', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content pre').first().click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await page.locator('#inline-snippet-popup button').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('code-block');
    await expect(page.locator('#snippet-preview-wrap')).toBeHidden();
    await expect(page.locator('#snip-code-lang')).toHaveValue('javascript');
    await expect(page.locator('#snip-code-content')).toHaveValue('console.log("Hello World!");');

    await page.locator('#snip-code-content').fill('console.log("Updated!");');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content pre').first()).toContainText('Updated!');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('```javascript\nconsole.log("Updated!");\n```');
    expect(onDisk).not.toContain('console.log("Hello World!");');
  });

  test('right-click on code block without language keeps language empty and does not consume first content line', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content pre').nth(2).click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await page.locator('#inline-snippet-popup button').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('code-block');
    await expect(page.locator('#snip-code-lang')).toHaveValue('');
    await expect(page.locator('#snip-code-content')).toHaveValue(
      'fields @timestamp, msg, err.message, err.stack\n| filter level >= 50\n| sort @timestamp desc\n| limit 100',
    );

    await page
      .locator('#snip-code-content')
      .fill('fields @timestamp\n| limit 10');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('```\nfields @timestamp\n| limit 10\n```');
    expect(onDisk).not.toContain('| sort @timestamp desc');
  });

  test('right-click on indented code block inside a list captures language, strips indent, and preserves it on save', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content pre').nth(1).click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await page.locator('#inline-snippet-popup button').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('code-block');
    await expect(page.locator('#snip-code-lang')).toHaveValue('yaml');
    await expect(page.locator('#snip-code-content')).toHaveValue('/aws/amplify/<app-id>');

    await page.locator('#snip-code-content').fill('/aws/amplify/edited-id');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content pre').nth(1)).toContainText('edited-id');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('   ```yaml\n   /aws/amplify/edited-id\n   ```');
    expect(onDisk).not.toContain('/aws/amplify/<app-id>');
  });

  test('right-click on blockquote captures editable quote content', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content blockquote').click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await page.locator('#inline-snippet-popup button').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('blockquote');
    await expect(page.locator('#snippet-preview-wrap')).toBeHidden();
    await expect(page.locator('#snip-blockquote-content')).toHaveValue(
      'Existing quote\n\n— Existing author',
    );

    await page
      .locator('#snip-blockquote-content')
      .fill('Updated quote\n\n— Updated author');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content blockquote')).toContainText('Updated quote');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('> Updated quote\n>\n> — Updated author');
    expect(onDisk).not.toContain('Existing quote');
  });

  test('right-click on unordered list captures editable item content', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content ul').first().click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await page.locator('#inline-snippet-popup button').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('unordered-list');
    await expect(page.locator('#snippet-preview-wrap')).toBeHidden();
    await expect(page.locator('#snip-unordered-list-content')).toHaveValue(
      'First bullet\nSecond bullet\n  Nested bullet',
    );

    await page
      .locator('#snip-unordered-list-content')
      .fill('Updated first\nUpdated second\n  Updated nested');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content ul').first()).toContainText('Updated first');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('- Updated first\n- Updated second\n  - Updated nested');
    expect(onDisk).not.toContain('- First bullet');
  });

  test('right-click on ordered list captures editable item content', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content ol').first().click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await page.locator('#inline-snippet-popup button').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('ordered-list');
    await expect(page.locator('#snippet-preview-wrap')).toBeHidden();
    await expect(page.locator('#snip-ordered-list-content')).toHaveValue(
      'First numbered\nSecond numbered\n   Nested numbered',
    );

    await page
      .locator('#snip-ordered-list-content')
      .fill('Updated first\nUpdated second\n   Updated nested');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content ol').first()).toContainText('Updated first');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('1. Updated first\n2. Updated second\n   1. Updated nested');
    expect(onDisk).not.toContain('1. First numbered');
  });

  test('right-click inline editor can delete a block after confirmation', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content blockquote').click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await page.locator('#inline-snippet-popup button').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-delete-btn')).toBeVisible();
    await page.locator('#snippet-delete-btn').click();

    await expect(page.locator('#confirm-modal')).toBeVisible();
    await page.locator('#confirm-modal-ok').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content blockquote')).toHaveCount(0);

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).not.toContain('> Existing quote');
    expect(onDisk).not.toContain('> — Existing author');
  });

  test('snippet type selector remains enabled in insertion mode', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.evaluate(() => {
      const editor = document.getElementById('doc-editor') as HTMLTextAreaElement;
      editor.selectionStart = 0;
      editor.selectionEnd = 0;
      (window as any).openSnippetsModal();
    });

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-modal-title')).toContainText('Insert a snippet');
    await expect(page.locator('#snippet-type')).toBeEnabled();
  });
});
