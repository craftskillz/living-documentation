import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect } from '../helpers/ld-fixture';

// Kanban board widget: a document containing the `data-ld-kanban` marker
// renders as an interactive board (whole-document takeover). Columns map to
// subfolders of the board doc's folder; cards are the documents inside them.
test.describe('kanban board widget', () => {
  test.use({ fixtureName: 'with-kanban' });

  // App-level doc id = encodeURIComponent(relative path without .md); the URL
  // param carries it encoded once more (URLSearchParams decodes one level).
  const boardAppId = encodeURIComponent('3_projets/2026_01_05_10_00_[Board]_board');
  const boardUrl = (baseURL: string) => `${baseURL}/?doc=${encodeURIComponent(boardAppId)}`;
  const networkSettleMs = 100;
  const viewportBottomGapPx = 24;
  const columnGapPx = 12;
  const maxKanbanColumns = 6;
  const maxColumnTitleTopInsetPx = 24;
  const taskTwoDescription = 'Follow up with the reviewer before closing the card.';

  async function expectBoardDescriptionsSettled(page: Page) {
    await expect(
      page.locator('[data-kanban-folder="Doing"] [data-testid="kanban-card"]'),
    ).toContainText(taskTwoDescription);
  }

  test('renders the board: columns from the widget, cards from folders, no prose', async ({ page, ld }) => {
    await page.goto(boardUrl(ld.baseURL));

    const board = page.getByTestId('kanban-board');
    await expect(board).toBeVisible();
    const columns = page.getByTestId('kanban-column');
    await expect(columns).toHaveCount(3);
    await expect(columns.nth(0)).toHaveAttribute('data-kanban-color', 'sky');
    await expect(columns.nth(1)).toHaveAttribute('data-kanban-color', 'amber');
    await expect(columns.nth(2)).toHaveAttribute('data-kanban-color', 'emerald');

    // Cards land in the columns matching their folder (titles are title-cased
    // by the filename parser; the card also shows the formatted date).
    await expect(page.locator('[data-kanban-folder="Todo"] [data-testid="kanban-card"]')).toContainText('Task One');
    await expect(page.locator('[data-kanban-folder="Doing"] [data-testid="kanban-card"]')).toContainText('Task Two');
    await expect(page.locator('[data-kanban-folder="Doing"] [data-testid="kanban-card"]')).toContainText(taskTwoDescription);
    // The Done folder does not exist in the fixture — empty column still renders.
    await expect(page.locator('[data-kanban-folder="Done"]')).toBeVisible();
    await expect(page.locator('[data-kanban-folder="Done"] [data-testid="kanban-card"]')).toHaveCount(0);

    // Whole-document takeover: the `# Project board` heading is NOT rendered.
    await expect(page.locator('#doc-content h1')).toHaveCount(0);

    // The missing column folder was created lazily on render.
    await expect
      .poll(() => fs.existsSync(path.join(ld.docsAbs, '3_projets/Done')))
      .toBe(true);
  });

  test('columns stretch to the same visible-page height', async ({ page, ld }) => {
    await page.goto(boardUrl(ld.baseURL));
    const columns = page.getByTestId('kanban-column');
    await expect(columns).toHaveCount(3);

    const metrics = await columns.evaluateAll((els) =>
      els.map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          top: rect.top,
          height: rect.height,
          viewportHeight: window.innerHeight,
        };
      }),
    );
    const heights = metrics.map((metric) => metric.height);
    const firstHeight = heights[0];
    for (const height of heights) {
      expect(Math.abs(height - firstHeight)).toBeLessThanOrEqual(1);
    }
    const expectedVisibleHeight = metrics[0].viewportHeight - metrics[0].top - viewportBottomGapPx;
    expect(firstHeight).toBeGreaterThanOrEqual(expectedVisibleHeight - 2);
  });

  test('column titles start near the top without inherited prose spacing', async ({ page, ld }) => {
    await page.goto(boardUrl(ld.baseURL));
    const columns = page.getByTestId('kanban-column');
    await expect(columns).toHaveCount(3);

    const topInsets = await columns.evaluateAll((els) =>
      els.map((el) => {
        const columnTop = el.getBoundingClientRect().top;
        const titleTop = el.querySelector('h2')!.getBoundingClientRect().top;
        return titleTop - columnTop;
      }),
    );
    for (const inset of topInsets) {
      expect(inset).toBeLessThanOrEqual(maxColumnTitleTopInsetPx);
    }
  });

  test('columns stretch horizontally to fill the available board width', async ({ page, ld }) => {
    await page.goto(boardUrl(ld.baseURL));
    const lanes = page.getByTestId('kanban-lanes');
    const columns = page.getByTestId('kanban-column');
    await expect(columns).toHaveCount(3);

    const metrics = await page.evaluate(() => {
      const laneRect = document.querySelector('[data-testid="kanban-lanes"]')!.getBoundingClientRect();
      const columnRects = Array.from(
        document.querySelectorAll('[data-testid="kanban-column"]'),
      ).map((el) => el.getBoundingClientRect());
      return {
        laneWidth: laneRect.width,
        columnWidths: columnRects.map((rect) => rect.width),
        lastColumnRight: columnRects[columnRects.length - 1].right,
        laneRight: laneRect.right,
      };
    });
    const expectedColumnWidth =
      (metrics.laneWidth - columnGapPx * (metrics.columnWidths.length - 1)) /
      metrics.columnWidths.length;
    for (const width of metrics.columnWidths) {
      expect(Math.abs(width - expectedColumnWidth)).toBeLessThanOrEqual(2);
    }
    expect(Math.abs(metrics.laneRight - metrics.lastColumnRight)).toBeLessThanOrEqual(2);
    await expect(lanes).toBeVisible();
  });

  test('hides regular document header actions and keeps only favorites, kanban edit plus delete', async ({ page, ld }) => {
    await page.goto(boardUrl(ld.baseURL));
    await expect(page.getByTestId('kanban-board')).toBeVisible();

    const viewActions = page.getByTestId('view-actions');
    await expect(viewActions.getByRole('button')).toHaveCount(3);
    await expect(viewActions.getByTestId('kanban-edit-columns')).toBeVisible();
    await expect(page.getByTestId("delete-doc-btn")).toBeVisible();
    await expect(page.getByTestId("favorite-doc-btn")).toBeVisible();
    await expect(page.locator('#doc-content').getByTestId('kanban-edit-columns')).toHaveCount(0);

    await expect(page.getByTestId('copy-doc-id-btn')).toHaveCount(0);
    await expect(page.getByTestId('tts-play')).toHaveCount(0);
    await expect(page.getByTestId('marker-doc-btn')).toHaveCount(0);
    await expect(page.getByTestId('export-pdf-btn')).toHaveCount(0);
    await expect(page.getByTestId('metadata-btn')).toHaveCount(0);
    await expect(page.getByTestId('versions-btn')).toHaveCount(0);
    await expect(page.getByTestId('edit-doc-btn')).toHaveCount(0);
    await expect(page.getByTestId('toc-toggle-btn')).toHaveCount(0);
  });

  test('editing columns shows labels and colors, not object strings', async ({ page, ld }) => {
    const boardPath = path.join(
      ld.docsAbs,
      '3_projets/2026_01_05_10_00_[Board]_board.md',
    );

    await page.goto(boardUrl(ld.baseURL));
    await page.getByTestId('kanban-edit-columns').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    const rows = page.getByTestId('snip-kanban-column-row');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).locator('input')).toHaveValue('Todo');
    await expect(rows.nth(1).locator('input')).toHaveValue('Doing');
    await expect(rows.nth(2).locator('input')).toHaveValue('Done');
    await expect(page.locator('#snippet-preview')).not.toContainText('[object Object]');
    await expect(page.locator('#snippet-preview')).toContainText(
      '<div data-ld-kanban data-columns="Todo|Doing|Done" data-colors="sky|amber|emerald"></div>',
    );

    await rows.nth(2).locator('select').selectOption('violet');
    await expect(page.locator('#snippet-preview')).toContainText('data-colors="sky|amber|violet"');
    await page.locator('#snippet-submit-btn').click();

    await expect(page.locator('#snippets-modal')).toBeHidden();
    expect(fs.readFileSync(boardPath, 'utf-8')).toContain(
      '<div data-ld-kanban data-columns="Todo|Doing|Done" data-colors="sky|amber|violet"></div>',
    );
  });

  test('creating a kanban snippet uses default labels and colors in preview', async ({ page, ld }) => {
    await page.goto(boardUrl(ld.baseURL));
    await expect(page.getByTestId('kanban-board')).toBeVisible();
    await page.waitForFunction(() => typeof (window as any).openSnippetsModalForInlineInsert === 'function');
    await page.evaluate(() => {
      (window as any).openSnippetsModalForInlineInsert(0);
    });
    await page.locator('#snippet-picker [data-snippet-type="kanban"]').click();

    await expect(page.locator('#snippets-modal')).toBeVisible();
    const rows = page.getByTestId('snip-kanban-column-row');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).locator('input')).toHaveValue('Todo');
    await expect(rows.nth(0).locator('select')).toHaveValue('sky');
    await expect(rows.nth(1).locator('input')).toHaveValue('Doing');
    await expect(rows.nth(1).locator('select')).toHaveValue('amber');
    await expect(rows.nth(2).locator('input')).toHaveValue('Done');
    await expect(rows.nth(2).locator('select')).toHaveValue('emerald');
    await expect(page.locator('#snippet-preview')).not.toContainText('[object Object]');
    await expect(page.locator('#snippet-preview')).toContainText(
      '<div data-ld-kanban data-columns="Todo|Doing|Done" data-colors="sky|amber|emerald"></div>',
    );
  });

  test('the kanban snippet builder does not allow more than six columns', async ({ page, ld }) => {
    await page.goto(boardUrl(ld.baseURL));
    await page.getByTestId('kanban-edit-columns').click();

    const rows = page.getByTestId('snip-kanban-column-row');
    const addColumn = page.getByRole('button', { name: 'Add column' });
    await expect(rows).toHaveCount(3);

    for (let i = 3; i < maxKanbanColumns; i += 1) {
      await addColumn.click();
    }
    await expect(rows).toHaveCount(maxKanbanColumns);
    await expect(addColumn).toBeDisabled();
    await rows.nth(3).locator('input').fill('Column 4');
    await rows.nth(4).locator('input').fill('Column 5');
    await rows.nth(5).locator('input').fill('Column 6');
    await expect(page.locator('#snippet-preview')).toContainText(
      'data-columns="Todo|Doing|Done|Column 4|Column 5|Column 6"',
    );
    await expect(page.locator('#snippet-preview')).toContainText(
      'data-colors="sky|amber|emerald|rose|violet|slate"',
    );
  });

  test('drag hover and source highlights use inset styles that are not clipped', async ({ page, ld }) => {
    await page.goto(boardUrl(ld.baseURL));
    await expectBoardDescriptionsSettled(page);
    const todoCard = page.locator('[data-kanban-folder="Todo"] [data-testid="kanban-card"]');
    const doneColumn = page.locator('[data-kanban-folder="Done"]');
    await expect(todoCard).toBeVisible();
    await expect(doneColumn).toBeVisible();

    await doneColumn.dispatchEvent('dragover');
    await expect(doneColumn).not.toHaveClass(/ring-2/);
    await expect(doneColumn).not.toHaveClass(/ring-blue-400/);
    await expect(doneColumn).toHaveCSS('box-shadow', /inset/);

    await doneColumn.dispatchEvent('dragleave');
    await expect(doneColumn).toHaveCSS('box-shadow', 'none');

    await todoCard.dispatchEvent('dragstart');
    await expect(todoCard).toHaveCSS('box-shadow', /inset/);
    await todoCard.dispatchEvent('dragend');
    await expect(todoCard).not.toHaveCSS('box-shadow', /inset/);
  });

  test('does not trigger a global document aggregate reload after initial render', async ({ page, ld }) => {
    const counts = {
      documents: 0,
      fileCounts: 0,
      statuses: 0,
    };
    page.on('request', (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname === '/api/documents') counts.documents += 1;
      if (pathname === '/api/documents/file-counts') counts.fileCounts += 1;
      if (pathname === '/api/documents/statuses') counts.statuses += 1;
    });

    await page.goto(boardUrl(ld.baseURL));
    await expect(page.getByTestId('kanban-board')).toBeVisible();
    await expect
      .poll(() => fs.existsSync(path.join(ld.docsAbs, '3_projets/Done')))
      .toBe(true);
    await page.waitForTimeout(networkSettleMs);

    expect(counts.documents).toBe(1);
    expect(counts.fileCounts).toBe(1);
    expect(counts.statuses).toBe(1);
  });

  test('dragging a card to another column moves the .md file between folders', async ({ page, ld }) => {
    await page.goto(boardUrl(ld.baseURL));
    await expectBoardDescriptionsSettled(page);
    await expect(page.locator('[data-kanban-folder="Todo"] [data-testid="kanban-card"]')).toBeVisible();

    await page.dragAndDrop(
      '[data-kanban-folder="Todo"] [data-testid="kanban-card"]',
      '[data-kanban-folder="Done"]',
    );

    // Board re-renders with the card in Done.
    await expect(page.locator('[data-kanban-folder="Done"] [data-testid="kanban-card"]')).toContainText('Task One');
    await expect(page.locator('[data-kanban-folder="Todo"] [data-testid="kanban-card"]')).toHaveCount(0);

    // The file physically moved on disk.
    await expect
      .poll(() => fs.existsSync(path.join(ld.docsAbs, '3_projets/Done/2026_01_06_10_00_[Task]_task_one.md')))
      .toBe(true);
    expect(fs.existsSync(path.join(ld.docsAbs, '3_projets/Todo/2026_01_06_10_00_[Task]_task_one.md'))).toBe(false);
  });

  test('the + button creates a new document in the column folder', async ({ page, ld }) => {
    await page.goto(boardUrl(ld.baseURL));
    await expectBoardDescriptionsSettled(page);
    const doing = page.locator('[data-kanban-folder="Doing"]');
    await expect(doing).toBeVisible();

    await doing.getByTestId('kanban-add-card').click();
    await doing.locator('input[type="text"]').fill('Fresh task');
    await doing.getByTestId('kanban-create-card').click();

    await expect(doing.getByTestId('kanban-card')).toHaveCount(2);
    const freshCard = doing.getByTestId('kanban-card').filter({ hasText: 'Fresh task' });
    await expect(freshCard).toBeVisible();
    await expect(freshCard).toContainText('Here is the description');

    const created = fs
      .readdirSync(path.join(ld.docsAbs, '3_projets/Doing'))
      .filter((f) => f.includes('fresh_task') && f.endsWith('.md'));
    expect(created).toHaveLength(1);
    expect(fs.readFileSync(path.join(ld.docsAbs, '3_projets/Doing', created[0]), 'utf-8')).toBe(
      '# Fresh task\n\nHere is the description\n\n## Content\n\nHere is the Full Content\n',
    );
  });

  test('clicking a card navigates to the document', async ({ page, ld }) => {
    await page.goto(boardUrl(ld.baseURL));
    await page.locator('[data-kanban-folder="Doing"] [data-testid="kanban-card"]').click();
    await expect(page.getByTestId('doc-title')).toHaveText('Task Two');
    await expect(page.getByTestId('tts-play')).toBeVisible();
    await expect(page.getByTestId('edit-doc-btn')).toBeVisible();
    await expect(page.getByTestId('delete-doc-btn')).toBeVisible();
  });
});
