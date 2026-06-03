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
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

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
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

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
    await expect(page.locator('#doc-content table').first().locator('tbody td').nth(7)).toHaveText('\u00A0');
    await expect(page.locator('#doc-content table').first().locator('tbody td').nth(9)).toHaveText('\u00A0');
    await page.locator('#doc-content table').first().click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'table');
    await expect(page.locator('#inline-snippet-popup button[data-action="edit"]')).toContainText('Edit table');
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

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
    await expect(page.locator('#doc-content table').first()).toContainText('updated');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('|           | s         | updated   |');
    expect(onDisk).not.toContain('|           | s         |           |');
  });

  test('a table preceded by table-style + table-border + table-color comments is rendered with cumulative classes', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    const styledTable = page.locator('#doc-content table').nth(1);
    await expect(styledTable).toHaveAttribute('data-table-style', 'compact');
    await expect(styledTable).toHaveAttribute('data-table-border', 'bordered');
    await expect(styledTable).toHaveAttribute('data-table-color', 'info');
    await expect(styledTable).toHaveClass(/table-style-compact/);
    await expect(styledTable).toHaveClass(/table-border-bordered/);
    await expect(styledTable).toHaveClass(/table-color-info/);
    const firstTable = page.locator('#doc-content table').first();
    await expect(firstTable).not.toHaveClass(/table-style-/);
    await expect(firstTable).not.toHaveClass(/table-border-/);
    await expect(firstTable).not.toHaveClass(/table-color-/);
  });

  test('borderless tables keep horizontal separators without vertical cell borders', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    const firstHeader = page.locator('#doc-content table').first().locator('thead th').first();
    const firstCell = page.locator('#doc-content table').first().locator('tbody td').first();

    await expect(firstHeader).toHaveCSS('border-bottom-color', 'rgb(209, 213, 219)');
    await expect(firstCell).toHaveCSS('border-bottom-color', 'rgb(229, 231, 235)');
    await expect(firstCell).toHaveCSS('border-left-width', '0px');
    await expect(firstCell).toHaveCSS('border-right-width', '0px');
  });

  test('borderless colored tables tint horizontal separators with the selected color', async ({ page, ld }) => {
    const tinyDocId = '2026_01_02_10_00_[General]_tiny';
    const docPath = path.join(ld.docsAbs, `${tinyDocId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(tinyDocId)}`);
    await page.evaluate(() => {
      (window as any).openSnippetsModalForInlineInsert(99999);
    });

    await page.locator('#snippet-picker [data-snippet-type="table"]').click();
    await page.locator('#snip-table-color').selectOption('note');
    await page.locator('#snippet-submit-btn').click();

    const table = page.locator('#doc-content table');
    const firstHeader = table.locator('thead th').first();
    const firstCell = table.locator('tbody td').first();

    await expect(table).toHaveClass(/table-color-note/);
    await expect(table).not.toHaveClass(/table-border-bordered/);
    await expect(firstHeader).toHaveCSS('border-bottom-color', 'rgb(139, 92, 246)');
    await expect(firstCell).toHaveCSS('border-bottom-color', 'rgb(233, 213, 255)');
    await expect(firstCell).toHaveCSS('border-left-width', '0px');
    await expect(firstCell).toHaveCSS('border-right-width', '0px');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toMatch(/<!-- table-color: note -->\n\| En-tête 1 \|/);
    expect(onDisk).not.toContain('<!-- table-border:');
  });

  test('inline-edit on a styled table loads style + border + color and round-trips comments on save', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content table').nth(1).click({ button: 'right' });
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('table');
    await expect(page.locator('#snip-table-style')).toHaveValue('compact');
    await expect(page.locator('#snip-table-bordered')).toBeChecked();
    await expect(page.locator('#snip-table-color')).toHaveValue('info');

    await page.locator('#snip-table-style').selectOption('striped');
    await page.locator('#snip-table-color').selectOption('success');
    await page.locator('#snippet-submit-btn').click();
    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content table').nth(1)).toHaveClass(/table-style-striped/);
    await expect(page.locator('#doc-content table').nth(1)).toHaveClass(/table-border-bordered/);
    await expect(page.locator('#doc-content table').nth(1)).toHaveClass(/table-color-success/);

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('<!-- table-style: striped -->\n<!-- table-border: bordered -->\n<!-- table-color: success -->\n| Name    | Age |');
    expect(onDisk).not.toContain('<!-- table-style: compact -->');
    expect(onDisk).not.toContain('<!-- table-border: borderless -->');
    expect(onDisk).not.toContain('<!-- table-color: info -->');
  });

  test('inline-edit can clear the color while keeping the style', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content table').nth(1).click({ button: 'right' });
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();
    await page.locator('#snip-table-color').selectOption('');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toMatch(/<!-- table-style: compact -->\n<!-- table-border: bordered -->\n\| Name/);
    expect(onDisk).not.toContain('<!-- table-color:');
  });

  test('inserting a table from the picker with style + border + color writes cumulative comments to the source', async ({ page, ld }) => {
    const tinyDocId = '2026_01_02_10_00_[General]_tiny';
    const docPath = path.join(ld.docsAbs, `${tinyDocId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(tinyDocId)}`);
    await expect(page.locator('#doc-content h1')).toContainText('Tiny doc');
    await page.evaluate(() => {
      (window as any).openSnippetsModalForInlineInsert(99999);
    });

    await page.locator('#snippet-picker [data-snippet-type="table"]').click();
    await expect(page.locator('#snip-panel-table')).toBeVisible();
    await expect(page.locator('#snip-table-style')).toHaveValue('');
    await expect(page.locator('#snip-table-bordered')).not.toBeChecked();
    await expect(page.locator('#snip-table-color')).toHaveValue('');

    await page.locator('#snip-table-style').selectOption('striped');
    await page.locator('#snip-table-bordered').check();
    await page.locator('#snip-table-color').selectOption('danger');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content table')).toHaveClass(/table-style-striped/);
    await expect(page.locator('#doc-content table')).toHaveClass(/table-border-bordered/);
    await expect(page.locator('#doc-content table')).toHaveClass(/table-color-danger/);
    await expect(page.locator('#doc-content table thead th').first()).toHaveCSS('background-color', 'rgb(254, 226, 226)');
    await expect(page.locator('#doc-content table tbody tr').first()).toHaveCSS('background-color', 'rgb(254, 242, 242)');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toMatch(/<!-- table-style: striped -->\n<!-- table-border: bordered -->\n<!-- table-color: danger -->\n\| En-tête 1 \|/);
  });

  test('striped tables use the neutral stripe fallback when no color is selected', async ({ page, ld }) => {
    const tinyDocId = '2026_01_02_10_00_[General]_tiny';
    const docPath = path.join(ld.docsAbs, `${tinyDocId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(tinyDocId)}`);
    await page.evaluate(() => {
      (window as any).openSnippetsModalForInlineInsert(99999);
    });

    await page.locator('#snippet-picker [data-snippet-type="table"]').click();
    await page.locator('#snip-table-style').selectOption('striped');
    await page.locator('#snippet-submit-btn').click();

    const table = page.locator('#doc-content table');
    await expect(table).toHaveClass(/table-style-striped/);
    await expect(table).not.toHaveClass(/table-color-/);
    await expect(table.locator('tbody tr').first()).toHaveCSS('background-color', 'rgb(243, 244, 246)');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toMatch(/<!-- table-style: striped -->\n\| En-tête 1 \|/);
    expect(onDisk).not.toContain('<!-- table-color:');
    expect(onDisk).not.toContain('neutral');
  });

  test('right-click on code block captures language and editable code content', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content pre').first().click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'code-block');
    await expect(page.locator('#inline-snippet-popup button[data-action="edit"]')).toContainText('Edit code block');
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

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
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

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
    await expect(page.locator('#doc-content pre').nth(2)).toContainText('| limit 10');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('```\nfields @timestamp\n| limit 10\n```');
    expect(onDisk).not.toContain('| sort @timestamp desc');
  });

  test('right-click on indented code block inside a list captures language, strips indent, and preserves it on save', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content pre').nth(1).click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

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
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'blockquote');
    await expect(page.locator('#inline-snippet-popup button[data-action="edit"]')).toContainText('Edit blockquote');
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

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
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('unordered-list');
    await expect(page.locator('#snippet-preview-wrap')).toBeHidden();
    // The unified editor is source-faithful: the captured text preserves the exact
    // indentation found in the document (including continuation lines), rather than
    // re-serializing from the rendered DOM the way the legacy viewer did.
    await expect(page.locator('#snip-unordered-list-content')).toHaveValue(
      '- First bullet\n  continuation for first bullet\n- Second bullet\n  lazy continuation for second bullet\n  - Nested bullet',
    );

    await page
      .locator('#snip-unordered-list-content')
      .fill('- Updated first\n  updated continuation\n- Updated second\nupdated lazy continuation\n  - Updated nested');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content ul').first()).toContainText('Updated first');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('- Updated first\n  updated continuation\n- Updated second\nupdated lazy continuation\n  - Updated nested');
    expect(onDisk).not.toContain('- First bullet');
  });

  test('right-click on ordered list captures editable item content', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content ol').first().click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('ordered-list');
    await expect(page.locator('#snippet-preview-wrap')).toBeHidden();
    // Source-faithful capture: continuation lines keep their original indentation.
    await expect(page.locator('#snip-ordered-list-content')).toHaveValue(
      '1. First numbered\n   continuation for first numbered\n2. Second numbered\n   lazy continuation for second numbered\n   1. Nested numbered\n   - Nested bullet under numbered',
    );

    await page
      .locator('#snip-ordered-list-content')
      .fill('1. Updated first\n   updated continuation\n2. Updated second\nupdated lazy continuation\n   1. Updated nested\n   - Updated nested bullet');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content ol').first()).toContainText('Updated first');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('1. Updated first\n   updated continuation\n2. Updated second\nupdated lazy continuation\n   1. Updated nested\n   - Updated nested bullet');
    expect(onDisk).not.toContain('1. First numbered');
  });

  test('right-click popup exposes a typed delete button that triggers the confirmation modal directly', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content table').first().click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    const editBtn = page.locator('#inline-snippet-popup button[data-action="edit"]');
    const deleteBtn = page.locator('#inline-snippet-popup button[data-action="delete"]');
    await expect(editBtn).toContainText('Edit table');
    await expect(deleteBtn).toContainText('Delete table');

    await deleteBtn.click();
    await expect(page.locator('#inline-snippet-popup')).toHaveCount(0);
    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#confirm-modal')).toBeVisible();
    await page.locator('#confirm-modal-ok').click();

    await expect(page.locator('#doc-content table')).toHaveCount(1);
    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).not.toContain('| En-tête 1 | En-tête 2 | En-tête 3 |');
  });

  test('right-click popup delete button can be cancelled and leaves the snippet untouched', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content blockquote').click({ button: 'right' });
    await page.locator('#inline-snippet-popup button[data-action="delete"]').click();

    await expect(page.locator('#confirm-modal')).toBeVisible();
    await page.locator('#confirm-modal-cancel').click();

    await expect(page.locator('#confirm-modal')).toBeHidden();
    await expect(page.locator('#doc-content blockquote')).toContainText('Existing quote');
    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('> Existing quote');
  });

  test('right-click inline editor can delete a block after confirmation', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content blockquote').click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

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

  test('right-click on a simple collapsible exposes summary and body fields and saves both', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content details').first().click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'collapsible');
    await expect(page.locator('#inline-snippet-popup button[data-action="edit"]')).toContainText('Edit collapsible block');
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('collapsible');
    await expect(page.locator('#snippet-preview-wrap')).toBeHidden();
    await expect(page.locator('#snip-collapsible-summary')).toHaveValue('Simple collapsible');
    await expect(page.locator('#snip-collapsible-body')).toHaveValue('Just a body paragraph.');

    await page.locator('#snip-collapsible-summary').fill('Updated summary');
    await page.locator('#snip-collapsible-body').fill('Updated body paragraph.');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('<summary>Updated summary</summary>');
    expect(onDisk).toContain('Updated body paragraph.');
    expect(onDisk).not.toContain('Simple collapsible');
    expect(onDisk).not.toContain('Just a body paragraph.');
  });

  test('right-click on the summary of a collapsible containing inner snippets edits the collapsible as a whole', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    const detailsSecond = page.locator('#doc-content details').nth(1);
    await expect(detailsSecond).toHaveAttribute('data-inline-snippet-index', /\d+/);
    await detailsSecond.locator('summary').click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'collapsible');
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

    await expect(page.locator('#snip-collapsible-summary')).toHaveValue('Collapsible with inner code');
    const body = await page.locator('#snip-collapsible-body').inputValue();
    expect(body).toContain('Some intro text.');
    expect(body).toContain('```markdown');
    expect(body).toContain('![image](/images/foo.png)');
    expect(body).toContain('```');
  });

  test('right-click on an inner code block of an open collapsible edits the code block, not the collapsible', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    const detailsSecond = page.locator('#doc-content details').nth(1);
    await detailsSecond.evaluate((el) => (el as HTMLDetailsElement).open = true);
    const innerPre = detailsSecond.locator('pre');
    await expect(innerPre).toHaveAttribute('data-inline-snippet-index', /\d+/);
    await innerPre.click({ button: 'right' });

    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'code-block');
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

    await expect(page.locator('#snippet-type')).toHaveValue('code-block');
    await expect(page.locator('#snip-code-lang')).toHaveValue('markdown');
    await expect(page.locator('#snip-code-content')).toHaveValue('![image](/images/foo.png)');
  });

  test('right-click on a level-1 heading opens heading editor and saves new text', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content h1').click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'heading-1');
    await expect(page.locator('#inline-snippet-popup button[data-action="edit"]')).toContainText('Edit heading level 1');
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('heading-1');
    await expect(page.locator('#snippet-preview-wrap')).toBeHidden();
    await expect(page.locator('#snip-heading-content')).toHaveValue('Inline Snippets');

    await page.locator('#snip-heading-content').fill('Updated title');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('# Updated title');
    expect(onDisk).not.toContain('# Inline Snippets');
  });

  test('right-click on a level-3 heading reuses the shared heading panel and saves at level 3', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content h3').click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'heading-3');
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

    await expect(page.locator('#snippet-type')).toHaveValue('heading-3');
    await expect(page.locator('#snip-heading-content')).toHaveValue('Section trois');

    await page.locator('#snip-heading-content').fill('Renommée niveau 3');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content h3')).toContainText('Renommée niveau 3');
    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('### Renommée niveau 3');
    expect(onDisk).not.toContain('### Section trois');
  });

  test('right-click on a formatted paragraph (signature fails) inserts via sibling fallback', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content p').first().click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-action', 'insert');
    await page.locator('#inline-snippet-popup button[data-action="insert"]').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-picker')).toBeVisible();
    await page.locator('#snippet-picker [data-snippet-type="blockquote"]').click();
    await page.locator('#snip-blockquote-content').fill('Inserted via fallback');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toMatch(
      /breaks signature search\.\n+> Inserted via fallback\n+This sentence contains/,
    );
  });

  test('right-click in vertical whitespace between blocks resolves to nearest block above', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);

    const coords = await page.evaluate(() => {
      const content = document.getElementById('doc-content')!;
      const h1 = content.querySelector('h1')!;
      const next = h1.nextElementSibling as HTMLElement;
      const h1Rect = h1.getBoundingClientRect();
      const nextRect = next.getBoundingClientRect();
      const x = h1Rect.left + 5;
      const y = (h1Rect.bottom + nextRect.top) / 2;
      return { x, y };
    });

    await page.mouse.move(coords.x, coords.y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });

    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-action', 'insert');
    await page.locator('#inline-snippet-popup button[data-action="insert"]').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-picker')).toBeVisible();
    await page.locator('#snippet-picker [data-snippet-type="blockquote"]').click();
    await page.locator('#snip-blockquote-content').fill('Inserted in whitespace');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toMatch(/# Inline Snippets\n+> Inserted in whitespace\n+## Section deux/);
  });

  test('opening the snippets modal from the editor shows the categorized picker, not the type selector', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    // The editor textarea only exists in edit mode in the unified UI.
    await page.getByTestId('view-actions').getByRole('button', { name: /Edit/ }).click();
    await expect(page.getByTestId('doc-editor')).toBeVisible();
    await page.evaluate(() => {
      const editor = document.getElementById('doc-editor') as HTMLTextAreaElement;
      editor.selectionStart = 0;
      editor.selectionEnd = 0;
      (window as any).openSnippetsModal();
    });

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-modal-title')).toContainText('Insert a snippet');
    await expect(page.locator('#snippet-picker')).toBeVisible();
    await expect(page.locator('#snippet-type-wrapper')).toBeHidden();
    await expect(page.locator('#snippet-submit-btn')).toBeHidden();
    await expect(page.locator('#snippet-picker-back')).toBeHidden();
    await expect(
      page.locator('#snippet-picker [data-snippet-category="structure"]'),
    ).toBeVisible();
    await expect(
      page.locator('#snippet-picker [data-snippet-type="heading-1"]'),
    ).toBeVisible();
    await expect(
      page.locator('#snippet-picker [data-snippet-type="code-block"]'),
    ).toBeVisible();
  });

  test('picker search filters cards live and Enter selects the first match', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.evaluate(() => {
      (window as any).openSnippetsModal();
    });

    await expect(page.locator('#snippet-picker-search')).toBeFocused();
    await page.locator('#snippet-picker-search').fill('table');
    await expect(
      page.locator('#snippet-picker [data-snippet-type="table"]'),
    ).toBeVisible();
    await expect(
      page.locator('#snippet-picker [data-snippet-type="heading-1"]'),
    ).toBeHidden();

    await page.locator('#snippet-picker-search').press('Enter');
    await expect(page.locator('#snippet-picker')).toBeHidden();
    await expect(page.locator('#snippet-type')).toHaveValue('table');
    await expect(page.locator('#snippet-picker-back')).toBeVisible();
    await expect(page.locator('#snippet-submit-btn')).toBeVisible();
  });

  test('inline insert picker pre-fills unordered and ordered list editors', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.evaluate(() => {
      (window as any).openSnippetsModalForInlineInsert(0);
    });

    await expect(page.locator('#snippet-picker')).toBeVisible();
    await page.locator('#snippet-picker [data-snippet-type="unordered-list"]').click();
    await expect(page.locator('#snip-unordered-list-content')).toBeVisible();
    await expect(page.locator('#snip-unordered-list-content')).toHaveValue(
      [
        '- Élément 1',
        '- Élément 2',
        '  - Sous-élément 2.1',
        '  - Sous-élément 2.2',
        '- Élément 3',
        '  - Sous-élément 3.1',
        '    - Sous-sous-élément 3.1.1',
      ].join('\n'),
    );

    await page.locator('#snippet-picker-back').click();
    await page.locator('#snippet-picker [data-snippet-type="ordered-list"]').click();
    await expect(page.locator('#snip-ordered-list-content')).toBeVisible();
    await expect(page.locator('#snip-ordered-list-content')).toHaveValue(
      [
        '1. Élément 1',
        '2. Élément 2',
        '   1. Sous-élément 2.1',
        '   2. Sous-élément 2.2',
        '3. Élément 3',
        '   1. Sous-élément 3.1',
        '      1. Sous-sous-élément 3.1.1',
      ].join('\n'),
    );
  });

  test('back button returns from a panel to the picker without inserting', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.evaluate(() => {
      (window as any).openSnippetsModal();
    });

    await page.locator('#snippet-picker [data-snippet-type="blockquote"]').click();
    await expect(page.locator('#snippet-picker')).toBeHidden();
    await expect(page.locator('#snip-panel-blockquote')).toBeVisible();

    await page.locator('#snippet-picker-back').click();
    await expect(page.locator('#snippet-picker')).toBeVisible();
    await expect(page.locator('#snip-panel-blockquote')).toBeHidden();
    await expect(page.locator('#snippet-submit-btn')).toBeHidden();
    await expect(page.locator('#snippet-picker-back')).toBeHidden();
  });

  test('right-click in <main> outside #doc-content (tiny doc) falls back to insert at end of document', async ({ page, ld }) => {
    const tinyDocId = '2026_01_02_10_00_[General]_tiny';
    const docPath = path.join(ld.docsAbs, `${tinyDocId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(tinyDocId)}`);

    const coords = await page.evaluate(() => {
      const main = document.getElementById('home-content-area')!;
      const docContent = document.getElementById('doc-content')!;
      const mainRect = main.getBoundingClientRect();
      const docRect = docContent.getBoundingClientRect();
      return {
        x: mainRect.left + mainRect.width / 2,
        y: docRect.bottom + (mainRect.bottom - docRect.bottom) / 2,
      };
    });

    expect(coords.y).toBeGreaterThan(0);
    await page.mouse.move(coords.x, coords.y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });

    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-action', 'insert');
    await page.locator('#inline-snippet-popup button[data-action="insert"]').click();

    await expect(page.locator('#snippet-picker')).toBeVisible();
    await page.locator('#snippet-picker [data-snippet-type="blockquote"]').click();
    await page.locator('#snip-blockquote-content').fill('Appended via main fallback');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content blockquote')).toContainText('Appended via main fallback');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toMatch(/# Tiny doc\n+> Appended via main fallback/);
  });

  test('inline-insert picker can insert a new diagram and saves the markdown to the document', async ({ page, ld }) => {
    const tinyDocId = '2026_01_02_10_00_[General]_tiny';
    const docPath = path.join(ld.docsAbs, `${tinyDocId}.md`);
    const dialogs: string[] = [];
    page.on('dialog', async (d) => {
      dialogs.push(d.message());
      await d.dismiss();
    });

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(tinyDocId)}`);
    await expect(page.locator('#doc-content h1')).toContainText('Tiny doc');
    await page.evaluate(() => {
      (window as any).openSnippetsModalForInlineInsert(99999);
    });

    await expect(page.locator('#snippet-picker')).toBeVisible();
    await page.locator('#snippet-picker [data-snippet-type="diagram"]').click();

    await expect(page.locator('#snip-panel-diagram')).toBeVisible();
    await page.locator('#snip-diag-mode-new').check();
    await page.locator('#snip-diag-new-name').fill('Inline diagram');
    await page.locator('#snip-diag-img-name').fill('inline_diagram.png');

    await Promise.all([
      page.waitForURL(/\/diagram\/?\?id=/),
      page.locator('#snippet-submit-btn').click(),
    ]);

    expect(dialogs).toEqual([]);
    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toMatch(
      /\[!\[Inline diagram\]\(\.\/images\/inline_diagram\.png\)\]\(\/diagram\?id=d\d+\)/,
    );
  });

  test('inline-edit bypasses the picker and shows the detected panel directly', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content table').first().click({ button: 'right' });
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-picker')).toBeHidden();
    await expect(page.locator('#snippet-picker-back')).toBeHidden();
    await expect(page.locator('#snippet-submit-btn')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('table');
  });
});
