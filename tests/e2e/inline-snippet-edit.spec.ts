import fs from 'node:fs';
import path from 'node:path';
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

  test('double-click on a rendered table cell opens the editor focused on that cell', async ({ page, ld }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);

    const scrollBefore = await page.evaluate(() => document.getElementById('home-content-area')?.scrollTop ?? -1);
    await page.locator('#doc-content table').first().locator('tbody td').nth(4).dblclick();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.getElementById('home-content-area')?.scrollTop ?? -1))
      .toBe(scrollBefore);
    await expect(page.locator('#snippet-type')).toHaveValue('table');
    const focusedCell = page.locator('#snip-table-grid input[data-tr="2"][data-tc="1"]');
    await expect(focusedCell).toBeFocused();
    await expect(focusedCell).toHaveValue('e');
    const selectedRange = await focusedCell.evaluate((el: HTMLInputElement) => ({
      start: el.selectionStart,
      end: el.selectionEnd,
      length: el.value.length,
    }));
    expect(selectedRange).toEqual({ start: 0, end: 1, length: 1 });

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => document.getElementById('home-content-area')?.scrollTop ?? -1))
      .toBe(scrollBefore);
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

  test('image width and alignment comments render and round-trip through inline edit', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    const image = page.locator('#doc-content img[alt="Styled image"]');
    await expect(image).toHaveAttribute('data-image-width', '1/2');
    await expect(image).toHaveAttribute('data-image-align', 'right');
    await expect(image).toHaveClass(/ld-image-width-half/);
    await expect(image).toHaveClass(/ld-image-align-right/);
    await expect(image).toHaveCSS('display', 'block');

    const dimensions = await image.evaluate((el) => {
      const imageRect = el.getBoundingClientRect();
      const parentRect = el.parentElement?.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        ratio: imageRect.width / parentRect.width,
        marginLeft: style.marginLeft,
        marginRight: style.marginRight,
      };
    });
    expect(dimensions.ratio).toBeCloseTo(0.5, 1);
    expect(dimensions.marginLeft).not.toBe('0px');
    expect(dimensions.marginRight).toBe('0px');

    await image.click({ button: 'right' });
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();
    await expect(page.locator('#snippet-type')).toHaveValue('image');
    await expect(page.locator('#snip-image-alt')).toHaveValue('Styled image');
    await expect(page.locator('#snip-image-url')).toHaveValue('/images/styled-image.png');
    await expect(page.locator('#snip-image-width')).toHaveValue('1/2');
    await expect(page.locator('#snip-image-align')).toHaveValue('right');

    await page.locator('#snip-image-width').selectOption('1/3');
    await page.locator('#snip-image-align').selectOption('center');
    await page.locator('#snippet-submit-btn').click();

    const updated = page.locator('#doc-content img[alt="Styled image"]');
    await expect(updated).toHaveAttribute('data-image-width', '1/3');
    await expect(updated).toHaveAttribute('data-image-align', 'center');
    await expect(updated).toHaveClass(/ld-image-width-third/);
    await expect(updated).toHaveClass(/ld-image-align-center/);

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain(
      '<!-- image-width: 1/3 -->\n<!-- image-align: center -->\n![Styled image](/images/styled-image.png)',
    );
    expect(onDisk).not.toContain('<!-- image-width: 1/2 -->');
    expect(onDisk).not.toContain('<!-- image-align: right -->');
  });

  test('inserting an image can emit independent width and alignment comments', async ({ page, ld }) => {
    const tinyDocId = '2026_01_02_10_00_[General]_tiny';
    const docPath = path.join(ld.docsAbs, `${tinyDocId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(tinyDocId)}`);
    await expect(page.locator('#doc-content')).toBeVisible();
    await page.evaluate(() => {
      (window as any).openSnippetsModalForInlineInsert(99999);
    });

    await page.locator('#snippet-picker [data-snippet-type="image"]').click();
    await page.locator('#snip-image-alt').fill('Inserted image');
    await page.locator('#snip-image-url').fill('/images/inserted.png');
    await page.locator('#snip-image-width').selectOption('2/3');
    await page.locator('#snip-image-align').selectOption('left');
    await page.locator('#snippet-submit-btn').click();

    const image = page.locator('#doc-content img[alt="Inserted image"]');
    await expect(image).toHaveAttribute('data-image-width', '2/3');
    await expect(image).toHaveAttribute('data-image-align', 'left');
    await expect(image).toHaveClass(/ld-image-width-two-thirds/);
    await expect(image).toHaveClass(/ld-image-align-left/);

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain(
      '<!-- image-width: 2/3 -->\n<!-- image-align: left -->\n![Inserted image](/images/inserted.png)',
    );
  });

  test('shift-click or command-click on a rendered Mermaid diagram opens the shared lightbox', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    const mermaid = page.locator('#doc-content .mermaid');
    await expect(mermaid).toBeVisible();

    // Keep the interaction test deterministic even when the external Mermaid CDN
    // is unavailable: wireDocContent always creates the .mermaid mount, and this
    // SVG mirrors the element Mermaid inserts asynchronously into that mount.
    await mermaid.evaluate((el) => {
      if (!el.querySelector('svg')) {
        el.innerHTML = '<svg viewBox="0 0 200 100" aria-label="Test Mermaid"><rect width="200" height="100" fill="white"/><text x="20" y="55">Start → Finish</text></svg>';
      }
    });

    const svg = mermaid.locator('svg');
    await svg.click({ modifiers: ['Shift'] });
    const lightbox = page.getByTestId('content-lightbox');
    await expect(lightbox).toBeVisible();
    await expect(lightbox).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    const lightboxImage = page.getByTestId('lightbox-image');
    await expect(lightboxImage).toBeVisible();
    await expect(lightboxImage).toHaveAttribute('alt', 'Mermaid diagram');
    await expect(lightboxImage).toHaveAttribute('src', /^data:image\/svg\+xml;charset=utf-8,/);

    await page.keyboard.press('Escape');
    await expect(lightbox).toBeHidden();

    await svg.click({ modifiers: ['Meta'] });
    await expect(lightbox).toBeVisible();
    await expect(page.getByTestId('lightbox-image')).toHaveAttribute(
      'src',
      /^data:image\/svg\+xml;charset=utf-8,/,
    );
    await page.keyboard.press('Escape');
    await expect(lightbox).toBeHidden();
  });

  test('Mermaid layout comments are rendered and editable inline', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    const mermaid = page.locator('#doc-content .mermaid');
    await expect(mermaid).toHaveAttribute('data-code-block-width', '2/3');
    await expect(mermaid).toHaveAttribute('data-code-block-align', 'center');
    await expect(mermaid).toHaveClass(/ld-mermaid-width-two-thirds/);
    await expect(mermaid).toHaveClass(/ld-mermaid-align-center/);
    const mermaidLayout = await mermaid.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const parentRect = el.parentElement?.getBoundingClientRect();
      return {
        ratio: rect.width / parentRect.width,
        leftGap: rect.left - parentRect.left,
        rightGap: parentRect.right - rect.right,
      };
    });
    expect(mermaidLayout.ratio).toBeCloseTo(2 / 3, 2);
    expect(Math.abs(mermaidLayout.leftGap - mermaidLayout.rightGap)).toBeLessThan(2);

    await mermaid.click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'code-block');
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

    await expect(page.locator('#snip-code-lang')).toHaveValue('mermaid');
    await expect(page.locator('#snip-code-width')).toHaveValue('2/3');
    await expect(page.locator('#snip-code-align')).toHaveValue('center');
    await page.locator('#snip-code-width').selectOption('1/2');
    await page.locator('#snip-code-align').selectOption('left');
    await page.locator('#snippet-submit-btn').click();

    const updated = page.locator('#doc-content .mermaid');
    await expect(updated).toHaveClass(/ld-mermaid-width-half/);
    await expect(updated).toHaveClass(/ld-mermaid-align-left/);
    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain(
      '<!-- mermaid-width: 1/2 -->\n<!-- mermaid-align: left -->\n```mermaid',
    );
    expect(onDisk).not.toContain('<!-- code-width: 1/2 -->\n<!-- code-align: left -->\n```mermaid');
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
    // Wait for the Svelte DocViewer to mount before reaching for its window hook.
    await expect(page.locator('#doc-content')).toBeVisible();
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

  test('table editor uses spreadsheet keyboard navigation and context menu deletion', async ({ page, ld }) => {
    const tinyDocId = '2026_01_02_10_00_[General]_tiny';
    const docPath = path.join(ld.docsAbs, `${tinyDocId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(tinyDocId)}`);
    await expect(page.locator('#doc-content')).toBeVisible();
    await page.evaluate(() => {
      (window as any).openSnippetsModalForInlineInsert(99999);
    });

    await page.locator('#snippet-picker [data-snippet-type="table"]').click();
    await expect(page.locator('#snip-table-rows')).toHaveCount(0);
    await expect(page.locator('#snip-table-cols')).toHaveCount(0);
    await expect(page.locator('#snip-table-hint')).toHaveText('Tab to move · → adds a column · ↓ adds a row');
    await expect(page.locator('#snip-table-grid input')).toHaveCount(4);
    await expect(page.locator('#snip-table-grid button[data-remove-col]')).toHaveCount(0);

    await page.locator('#snip-table-grid input[data-tr="0"][data-tc="0"]').fill('A');
    await page.locator('#snip-table-grid input[data-tr="0"][data-tc="0"]').press('Tab');
    await expect(page.locator('#snip-table-grid input[data-tr="0"][data-tc="1"]')).toBeFocused();
    const selectedRange = await page
      .locator('#snip-table-grid input[data-tr="0"][data-tc="1"]')
      .evaluate((el: HTMLInputElement) => ({
        start: el.selectionStart,
        end: el.selectionEnd,
        length: el.value.length,
      }));
    expect(selectedRange.start).toBe(0);
    expect(selectedRange.end).toBe(selectedRange.length);
    expect(selectedRange.length).toBeGreaterThan(0);

    await page.locator('#snip-table-grid input[data-tr="0"][data-tc="1"]').fill('B');
    await page.locator('#snip-table-grid input[data-tr="0"][data-tc="1"]').press('Tab');
    await expect(page.locator('#snip-table-grid input')).toHaveCount(4);
    await expect(page.locator('#snip-table-grid input[data-tr="1"][data-tc="0"]')).toBeFocused();

    await page.locator('#snip-table-grid input[data-tr="1"][data-tc="0"]').fill('row 1');
    await page.locator('#snip-table-grid input[data-tr="1"][data-tc="1"]').fill('row 2');
    await page.locator('#snip-table-grid input[data-tr="1"][data-tc="1"]').press('Tab');
    await expect(page.locator('#snip-table-grid input')).toHaveCount(6);
    await expect(page.locator('#snip-table-grid input[data-tr="2"][data-tc="0"]')).toBeFocused();

    await page.locator('#snip-table-grid input[data-tr="0"][data-tc="1"]').press('ArrowRight');
    await expect(page.locator('#snip-table-grid input')).toHaveCount(9);
    await expect(page.locator('#snip-table-grid input[data-tr="0"][data-tc="2"]')).toBeFocused();
    await page.locator('#snip-table-grid input[data-tr="0"][data-tc="2"]').fill('C');

    await page.locator('#snip-table-grid input[data-tr="2"][data-tc="0"]').fill('delete me');
    await page.locator('#snip-table-grid input[data-tr="2"][data-tc="0"]').press('ArrowDown');
    await expect(page.locator('#snip-table-grid input')).toHaveCount(12);
    await expect(page.locator('#snip-table-grid input[data-tr="3"][data-tc="0"]')).toBeFocused();

    await page.locator('#snip-table-grid input[data-tr="0"][data-tc="1"]').click({ button: 'right' });
    await expect(page.getByText('Delete column')).toBeVisible();
    await page.getByText('Delete column').click();
    await expect(page.locator('#snip-table-grid input')).toHaveCount(8);
    await expect(page.locator('#snip-table-grid input[data-tr="0"][data-tc="0"]')).toHaveValue('A');
    await expect(page.locator('#snip-table-grid input[data-tr="0"][data-tc="1"]')).toHaveValue('C');

    await page.locator('#snip-table-grid input[data-tr="2"][data-tc="0"]').click({ button: 'right' });
    await expect(page.getByText('Delete row')).toBeVisible();
    await page.getByText('Delete row').click();
    await expect(page.locator('#snip-table-grid input')).toHaveCount(6);

    await page.locator('#snippet-submit-btn').click();
    await expect(page.locator('#snippets-modal')).toBeHidden();

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toMatch(/\| A\s+\| C\s+\|/);
    expect(onDisk).not.toMatch(/\| A\s+\| B\s+\| C\s+\|/);
    expect(onDisk).not.toContain('delete me');
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
    await expect(page.locator('#snip-table-grid table')).toHaveClass(/table-style-compact/);
    await expect(page.locator('#snip-table-grid table')).toHaveClass(/table-border-bordered/);
    await expect(page.locator('#snip-table-grid table')).toHaveClass(/table-color-info/);
    await expect(page.locator('#snip-table-grid tr').first().locator('td').first()).toHaveCSS('background-color', 'rgb(219, 234, 254)');
    await expect(page.locator('#snip-table-grid tr').nth(1).locator('td').first()).toHaveCSS('border-left-width', '1px');

    await page.locator('#snip-table-style').selectOption('striped');
    await page.locator('#snip-table-color').selectOption('success');
    await expect(page.locator('#snip-table-grid table')).toHaveClass(/table-style-striped/);
    await expect(page.locator('#snip-table-grid table')).toHaveClass(/table-color-success/);
    await expect(page.locator('#snip-table-grid tr').first().locator('td').first()).toHaveCSS('background-color', 'rgb(220, 252, 231)');
    await page.locator('#snip-table-bordered').uncheck();
    await expect(page.locator('#snip-table-grid table')).not.toHaveClass(/table-border-bordered/);
    await expect(page.locator('#snip-table-grid tr').nth(1).locator('td').first()).toHaveCSS('border-left-width', '0px');
    await page.locator('#snip-table-bordered').check();
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
    await expect(page.locator('#snip-table-grid table')).toHaveClass(/table-style-striped/);
    await expect(page.locator('#snip-table-grid table')).toHaveClass(/table-border-bordered/);
    await expect(page.locator('#snip-table-grid table')).toHaveClass(/table-color-danger/);
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
    // Wait for the Svelte DocViewer to mount before reaching for its window hook.
    await expect(page.locator('#doc-content')).toBeVisible();
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
    const codeBlock = page.locator('#doc-content pre').first();
    await expect(codeBlock).toHaveAttribute('data-code-block-width', '1/2');
    await expect(codeBlock).toHaveAttribute('data-code-block-align', 'right');
    await expect(codeBlock).toHaveClass(/ld-code-width-half/);
    await expect(codeBlock).toHaveClass(/ld-code-align-right/);
    const codeLayout = await codeBlock.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const parentRect = el.parentElement?.getBoundingClientRect();
      return {
        ratio: rect.width / parentRect.width,
        rightGap: parentRect.right - rect.right,
      };
    });
    expect(codeLayout.ratio).toBeCloseTo(1 / 2, 2);
    expect(Math.abs(codeLayout.rightGap)).toBeLessThan(2);
    await codeBlock.click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toBeVisible();
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'code-block');
    await expect(page.locator('#inline-snippet-popup button[data-action="edit"]')).toContainText('Edit code block');
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('code-block');
    await expect(page.locator('#snippet-preview-wrap')).toBeHidden();
    await expect(page.locator('#snip-code-lang')).toHaveValue('javascript');
    await expect(page.locator('#snip-code-content')).toHaveValue('console.log("Hello World!");');
    await expect(page.locator('#snip-code-width')).toHaveValue('1/2');
    await expect(page.locator('#snip-code-align')).toHaveValue('right');

    await page.locator('#snip-code-content').fill('console.log("Updated!");');
    await page.locator('#snip-code-width').selectOption('1/3');
    await page.locator('#snip-code-align').selectOption('center');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content pre').first()).toContainText('Updated!');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain(
      '<!-- code-width: 1/3 -->\n<!-- code-align: center -->\n```javascript\nconsole.log("Updated!");\n```',
    );
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
    await expect(page.locator('#doc-content')).toBeVisible();

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
    await expect(page.locator('#doc-content')).toBeVisible();
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

  test('Mermaid picker builds and inserts a pie chart snippet', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await expect(page.locator('#doc-content')).toBeVisible();
    await page.evaluate(() => {
      (window as any).openSnippetsModalForInlineInsert(0);
    });

    await page.locator('#snippet-picker [data-snippet-type="mermaid"]').click();
    await expect(page.locator('#snippet-type')).toHaveValue('mermaid');
    await expect(page.locator('#snip-mermaid-type')).toHaveValue('pie');
    await expect(page.locator('#snip-mermaid-type')).toContainText('PIE CHART');
    await expect(page.locator('#snip-mermaid-pie-title')).toHaveValue('DOC WORKFLOW');
    await expect(page.locator('#snip-panel-mermaid input[aria-label^="Label"]')).toHaveCount(3);

    await page.locator('#snip-mermaid-pie-title').fill('DOC TIME');
    await page.locator('#snip-panel-mermaid input[aria-label="Label 1"]').fill('Writing');
    await page.locator('#snip-panel-mermaid input[aria-label="Weight 1"]').fill('80');
    await expect(page.locator('#snip-panel-mermaid input[aria-label="Weight 1"]')).toHaveValue('50');
    await page.locator('#snip-panel-mermaid input[aria-label="Weight 3"]').fill('0');
    await page.locator('#snip-panel-mermaid input[aria-label="Weight 2"]').fill('10');
    await page.locator('#snip-panel-mermaid input[aria-label="Weight 1"]').fill('80');
    await page.getByRole('button', { name: /Add item/ }).click();
    await page.locator('#snip-panel-mermaid input[aria-label="Label 4"]').fill('Reviewing');
    await page.locator('#snip-panel-mermaid input[aria-label="Weight 4"]').fill('20');
    await expect(page.locator('#snip-panel-mermaid input[aria-label="Weight 4"]')).toHaveValue('10');

    await expect(page.locator('#snippet-preview')).toContainText('pie title DOC TIME');
    await expect(page.locator('#snippet-preview')).toContainText('"Reviewing" : 10');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content .mermaid').first()).toBeVisible();
    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('```mermaid\npie title DOC TIME');
    expect(onDisk).toContain('         "Writing" : 80');
    expect(onDisk).toContain('         "Reviewing" : 10');
  });

  test('Mermaid picker builds and inserts a timeline snippet', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await expect(page.locator('#doc-content')).toBeVisible();
    await page.evaluate(() => {
      (window as any).openSnippetsModalForInlineInsert(0);
    });

    await page.locator('#snippet-picker [data-snippet-type="mermaid"]').click();
    await page.locator('#snip-mermaid-type').selectOption('timeline');
    await expect(page.locator('#snip-mermaid-type')).toHaveValue('timeline');
    await expect(page.locator('#snip-mermaid-type')).toContainText('TIMELINE');
    await expect(page.locator('#snip-mermaid-timeline-title')).toHaveValue(
      'DOCUMENTATION ROADMAP',
    );
    await expect(page.locator('#snip-panel-mermaid input[aria-label^="Period"]')).toHaveCount(
      5,
    );

    await page.locator('#snip-mermaid-timeline-title').fill('PROJECT MILESTONES');
    await page.locator('#snip-panel-mermaid input[aria-label="Period 1"]').fill('2022');
    await page.locator('#snip-panel-mermaid input[aria-label="Event 1"]').fill('Research notes');
    await page.getByRole('button', { name: /Add event/ }).click();
    await page.locator('#snip-panel-mermaid input[aria-label="Period 6"]').fill('2027');
    await page.locator('#snip-panel-mermaid input[aria-label="Event 6"]').fill('Template gallery');

    await expect(page.locator('#snippet-preview')).toContainText('timeline');
    await expect(page.locator('#snippet-preview')).toContainText('title PROJECT MILESTONES');
    await expect(page.locator('#snippet-preview')).toContainText('2027 : Template gallery');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content .mermaid').first()).toBeVisible();
    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('```mermaid\ntimeline\n    title PROJECT MILESTONES');
    expect(onDisk).toContain('    2022 : Research notes');
    expect(onDisk).toContain('    2027 : Template gallery');
  });

  test('Mermaid picker builds and inserts a tree view snippet', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await expect(page.locator('#doc-content')).toBeVisible();
    await page.evaluate(() => {
      (window as any).openSnippetsModalForInlineInsert(0);
    });

    await page.locator('#snippet-picker [data-snippet-type="mermaid"]').click();
    await page.locator('#snip-mermaid-type').selectOption('tree-view');
    await expect(page.locator('#snip-mermaid-type')).toHaveValue('tree-view');
    await expect(page.locator('#snip-mermaid-type')).toContainText('TREE VIEW');
    await expect(page.locator('#snip-panel-mermaid input[aria-label^="Node"]')).toHaveCount(6);

    await page.locator('#snip-panel-mermaid input[aria-label="Node 1"]').fill('project-hub/');
    await page.locator('#snip-panel-mermaid input[aria-label="Level 2"]').fill('1');
    await page.locator('#snip-panel-mermaid input[aria-label="Node 2"]').fill('playbooks/');
    await page.locator('#snip-panel-mermaid input[aria-label="Decorator 3"]').fill(
      ':::highlight icon(logos:markdown)',
    );
    await page.locator('#snip-panel-mermaid input[aria-label="Note 3"]').fill('reader guide');
    await page.getByRole('button', { name: /Add node/ }).click();
    await page.locator('#snip-panel-mermaid input[aria-label="Level 7"]').fill('2');
    await page.locator('#snip-panel-mermaid input[aria-label="Node 7"]').fill('release-plan.md');
    await page.locator('#snip-panel-mermaid input[aria-label="Note 7"]').fill('publication plan');

    await expect(page.locator('#snippet-preview')).toContainText('treeView-beta');
    await expect(page.locator('#snippet-preview')).toContainText('project-hub/');
    await expect(page.locator('#snippet-preview')).toContainText(
      'getting-started.md :::highlight icon(logos:markdown) ## reader guide',
    );
    await expect(page.locator('#snippet-preview')).toContainText(
      'release-plan.md ## publication plan',
    );
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content .mermaid').first()).toBeVisible();
    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('```mermaid\ntreeView-beta\n    project-hub/');
    expect(onDisk).toContain(
      '            getting-started.md :::highlight icon(logos:markdown) ## reader guide',
    );
    expect(onDisk).toContain('            release-plan.md ## publication plan');
  });

  test('Mermaid picker builds and inserts a sequence diagram snippet', async ({ page, ld }) => {
    const docPath = path.join(ld.docsAbs, `${docId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await expect(page.locator('#doc-content')).toBeVisible();
    await page.evaluate(() => {
      (window as any).openSnippetsModalForInlineInsert(0);
    });

    await page.locator('#snippet-picker [data-snippet-type="mermaid"]').click();
    await page.locator('#snip-mermaid-type').selectOption('sequence');
    await expect(page.locator('#snip-mermaid-type')).toHaveValue('sequence');
    await expect(page.locator('#snip-mermaid-type')).toContainText('SEQUENCE DIAGRAM');
    await expect(page.locator('#snip-panel-mermaid select[aria-label^="Type"]')).toHaveCount(7);

    await page.locator('#snip-panel-mermaid input[aria-label="From 1"]').fill('Coordinator');
    await page.locator('#snip-panel-mermaid input[aria-label="To 1"]').fill('Reviewer');
    await page.locator('#snip-panel-mermaid input[aria-label="Message 1"]').fill('Ready for review');
    await page.locator('#snip-panel-mermaid input[aria-label="To 5"]').fill('Publisher');
    await page
      .locator('#snip-panel-mermaid input[aria-label="Message 5"]')
      .fill('Review takes time<br/>before release');
    await page.getByRole('button', { name: /Add message/ }).click();
    await page.locator('#snip-panel-mermaid input[aria-label="From 8"]').fill('Reviewer');
    await page.locator('#snip-panel-mermaid select[aria-label="Arrow 8"]').selectOption('-->>');
    await page.locator('#snip-panel-mermaid input[aria-label="To 8"]').fill('Coordinator');
    await page.locator('#snip-panel-mermaid input[aria-label="Message 8"]').fill('Approved');

    await expect(page.locator('#snippet-preview')).toContainText('sequenceDiagram');
    await expect(page.locator('#snippet-preview')).toContainText(
      'Coordinator ->> Reviewer: Ready for review',
    );
    await expect(page.locator('#snippet-preview')).toContainText(
      'Note right of Publisher: Review takes time<br/>before release',
    );
    await expect(page.locator('#snippet-preview')).toContainText(
      'Reviewer -->> Coordinator: Approved',
    );
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content .mermaid').first()).toBeVisible();
    const onDisk = fs.readFileSync(docPath, 'utf-8');
    expect(onDisk).toContain('```mermaid\nsequenceDiagram\n    Coordinator ->> Reviewer: Ready for review');
    expect(onDisk).toContain('    Note right of Publisher: Review takes time<br/>before release');
    expect(onDisk).toContain('    Reviewer -->> Coordinator: Approved');
  });

  test('inline insert picker pre-fills unordered and ordered list editors', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(docId)}`);
    await expect(page.locator('#doc-content')).toBeVisible();
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
    await expect(page.locator('#doc-content')).toBeVisible();
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
    await expect(page.locator('#doc-content')).toBeVisible();

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

  test('a table nested in a blockquote is styled, editable as a table, and round-trips inside the quote', async ({ page, ld }) => {
    const bqDocId = '2026_01_03_10_00_[General]_blockquote_table';
    const docPath = path.join(ld.docsAbs, `${bqDocId}.md`);

    await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(bqDocId)}`);

    // Render: the blockquote-nested table still receives its style classes even
    // though every source line carries a `> ` blockquote marker.
    const table = page.locator('#doc-content blockquote table');
    await expect(table).toHaveAttribute('data-table-border', 'bordered');
    await expect(table).toHaveAttribute('data-table-color', 'info');
    await expect(table).toHaveClass(/table-border-bordered/);
    await expect(table).toHaveClass(/table-color-info/);

    // Edit: right-clicking a cell resolves to the table, not the surrounding quote.
    await table.locator('tbody td').first().click({ button: 'right' });
    await expect(page.locator('#inline-snippet-popup')).toHaveAttribute('data-snippet-type', 'table');
    await expect(page.locator('#inline-snippet-popup button[data-action="edit"]')).toContainText('Edit table');
    await page.locator('#inline-snippet-popup button[data-action="edit"]').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    await expect(page.locator('#snippet-type')).toHaveValue('table');
    await expect(page.locator('#snip-table-bordered')).toBeChecked();
    await expect(page.locator('#snip-table-color')).toHaveValue('info');
    await expect(page.locator('#snip-table-grid input[data-tr="1"][data-tc="1"]')).toHaveValue('10');

    await page.locator('#snip-table-grid input[data-tr="1"][data-tc="1"]').fill('99');
    await page.locator('#snippet-submit-btn').click();
    await expect(page.locator('#snippets-modal')).toBeHidden();
    await expect(page.locator('#doc-content blockquote table')).toContainText('99');

    const onDisk = fs.readFileSync(docPath, 'utf-8');
    // Quote title untouched; attribute comments + table stay inside the blockquote.
    expect(onDisk).toContain('<!-- quote-title: Hello -->');
    expect(onDisk).toMatch(/^> <!-- table-border: bordered -->$/m);
    expect(onDisk).toMatch(/^> <!-- table-color: info -->$/m);
    expect(onDisk).toMatch(/^> \| Youssef \| 99\s/m);
    expect(onDisk).not.toMatch(/\| Youssef \| 10 /);
  });
});
