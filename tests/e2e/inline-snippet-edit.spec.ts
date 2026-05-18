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
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'table');
    await expect(page.locator('#inline-snippet-popup button')).toContainText('Edit table');
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
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'code-block');
    await expect(page.locator('#inline-snippet-popup button')).toContainText('Edit code block');
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
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'blockquote');
    await expect(page.locator('#inline-snippet-popup button')).toContainText('Edit blockquote');
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

  test('right-click on a simple collapsible exposes summary and body fields and saves both', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content details').first().click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'collapsible');
    await expect(page.locator('#inline-snippet-popup button')).toContainText('Edit collapsible block');
    await page.locator('#inline-snippet-popup button').click();

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
    await page.locator('#inline-snippet-popup button').click();

    await expect(page.locator('#snip-collapsible-summary')).toHaveValue('Collapsible with inner code');
    const body = await page.locator('#snip-collapsible-body').inputValue();
    expect(body).toContain('Some intro text.');
    expect(body).toContain('```markdown');
    expect(body).toContain('![image](./images/foo.png)');
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
    await page.locator('#inline-snippet-popup button').click();

    await expect(page.locator('#snippet-type')).toHaveValue('code-block');
    await expect(page.locator('#snip-code-lang')).toHaveValue('markdown');
    await expect(page.locator('#snip-code-content')).toHaveValue('![image](./images/foo.png)');
  });

  test('right-click on a level-1 heading opens heading editor and saves new text', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content h1').click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'heading-1');
    await expect(page.locator('#inline-snippet-popup button')).toContainText('Edit heading level 1');
    await page.locator('#inline-snippet-popup button').click();

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
    await page.locator('#inline-snippet-popup button').click();

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
    await page.locator('#inline-snippet-popup button').click();

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
    await page.locator('#inline-snippet-popup button').click();

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

  test('inline-edit bypasses the picker and shows the detected panel directly', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await page.locator('#doc-content table').click({ button: 'right' });
    await page.locator('#inline-snippet-popup button').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-picker')).toBeHidden();
    await expect(page.locator('#snippet-picker-back')).toBeHidden();
    await expect(page.locator('#snippet-submit-btn')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('table');
  });
});
