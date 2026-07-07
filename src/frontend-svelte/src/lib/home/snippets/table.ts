// Snippets — Table builder (ported from snippet-table.js).
// Keeps the imperative grid rendering used by the snippets modal. The modal
// supplies an `onPreview` callback so it can refresh the Markdown preview.

import {
  parseTableAttributesFromMarkdown,
  parseMarkdownTableCells,
  isMarkdownTableSeparatorLine,
} from "../tableAttributes";
import { t } from "../../i18n.svelte";

function esc(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface TableController {
  data: string[][];
  onPreview: () => void;
}

const DEFAULT_TABLE_ROWS = 2;
const DEFAULT_TABLE_COLS = 2;
const MIN_TABLE_ROWS = 1;
const MIN_TABLE_COLS = 1;
const TABLE_CONTEXT_MENU_ID = "snip-table-context-menu";

export function createTableController(onPreview: () => void): TableController {
  return { data: [], onPreview };
}

export function tableInit(ctrl: TableController): void {
  ctrl.data = [
    Array.from({ length: DEFAULT_TABLE_COLS }, (_, i) => `En-tête ${i + 1}`),
    Array(DEFAULT_TABLE_COLS).fill(""),
  ];
  const styleEl = document.getElementById("snip-table-style") as HTMLSelectElement | null;
  if (styleEl) styleEl.value = "";
  const borderedEl = document.getElementById("snip-table-bordered") as HTMLInputElement | null;
  if (borderedEl) borderedEl.checked = false;
  const colorEl = document.getElementById("snip-table-color") as HTMLSelectElement | null;
  if (colorEl) colorEl.value = "";
  tableRenderGrid(ctrl);
}

function ensureRectangularTable(ctrl: TableController): void {
  if (!ctrl.data.length) {
    ctrl.data = Array.from({ length: DEFAULT_TABLE_ROWS }, (_, r) =>
      Array.from({ length: DEFAULT_TABLE_COLS }, (_, c) => (r === 0 ? `En-tête ${c + 1}` : "")),
    );
  }
  while (ctrl.data.length < MIN_TABLE_ROWS) {
    ctrl.data.push([]);
  }
  const cols = Math.max(MIN_TABLE_COLS, ...ctrl.data.map((row) => row.length));
  ctrl.data.forEach((row) => {
    while (row.length < cols) row.push("");
  });
}

export function focusTableCell(row: number, col: number, selectContents = false): void {
  queueMicrotask(() => {
    const input = document.querySelector<HTMLInputElement>(
      `#snip-table-grid input[data-tr="${row}"][data-tc="${col}"]`,
    );
    if (!input) return;
    input.focus({ preventScroll: true });
    if (selectContents) {
      input.select();
    } else {
      const end = input.value.length;
      input.setSelectionRange(end, end);
    }
  });
}

function addTableColumn(ctrl: TableController, focusRow: number): void {
  ensureRectangularTable(ctrl);
  const cols = ctrl.data[0]?.length ?? MIN_TABLE_COLS;
  ctrl.data.forEach((currentRow) => currentRow.push(""));
  tableRenderGrid(ctrl);
  focusTableCell(focusRow, cols);
}

function addTableRow(ctrl: TableController, focusCol: number, selectContents = false): void {
  ensureRectangularTable(ctrl);
  const rows = ctrl.data.length;
  const cols = ctrl.data[0]?.length ?? MIN_TABLE_COLS;
  ctrl.data.push(Array(cols).fill(""));
  tableRenderGrid(ctrl);
  focusTableCell(rows, Math.max(0, Math.min(focusCol, cols - 1)), selectContents);
}

function moveTableFocus(
  ctrl: TableController,
  row: number,
  col: number,
  selectContents = false,
): void {
  ensureRectangularTable(ctrl);
  const rows = ctrl.data.length;
  const cols = ctrl.data[0]?.length ?? MIN_TABLE_COLS;
  const nextRow = Math.max(0, Math.min(row, rows - 1));
  let nextCol = col;

  nextCol = Math.max(0, Math.min(nextCol, cols - 1));
  focusTableCell(nextRow, nextCol, selectContents);
}

function removeTableColumn(ctrl: TableController, col: number): void {
  hideTableContextMenu();
  ensureRectangularTable(ctrl);
  const cols = ctrl.data[0]?.length ?? MIN_TABLE_COLS;
  if (cols <= MIN_TABLE_COLS) return;
  ctrl.data.forEach((row) => row.splice(col, 1));
  tableRenderGrid(ctrl);
  focusTableCell(0, Math.max(0, Math.min(col, cols - 2)));
}

function removeTableRow(ctrl: TableController, row: number): void {
  hideTableContextMenu();
  ensureRectangularTable(ctrl);
  if (ctrl.data.length <= MIN_TABLE_ROWS) return;
  const cols = ctrl.data[0]?.length ?? MIN_TABLE_COLS;
  ctrl.data.splice(row, 1);
  tableRenderGrid(ctrl);
  focusTableCell(Math.max(0, Math.min(row, ctrl.data.length - 1)), Math.min(cols - 1, 0));
}

function handleTableKeydown(ctrl: TableController, input: HTMLInputElement, ev: KeyboardEvent): void {
  hideTableContextMenu();
  const r = Number(input.dataset.tr);
  const c = Number(input.dataset.tc);
  const rows = ctrl.data.length;
  const cols = ctrl.data[0]?.length ?? MIN_TABLE_COLS;

  if (ev.key === "Tab") {
    ev.preventDefault();
    if (ev.shiftKey) {
      if (c > 0) moveTableFocus(ctrl, r, c - 1, true);
      else if (r > 0) moveTableFocus(ctrl, r - 1, cols - 1, true);
      else moveTableFocus(ctrl, r, c, true);
      return;
    }
    if (c < cols - 1) moveTableFocus(ctrl, r, c + 1, true);
    else if (r < rows - 1) moveTableFocus(ctrl, r + 1, 0, true);
    else addTableRow(ctrl, 0, true);
    return;
  }

  if (ev.key === "ArrowUp") {
    ev.preventDefault();
    moveTableFocus(ctrl, r - 1, c);
    return;
  }

  if (ev.key === "ArrowDown") {
    ev.preventDefault();
    if (r < rows - 1) moveTableFocus(ctrl, r + 1, c);
    else addTableRow(ctrl, c);
    return;
  }

  if (ev.key === "ArrowLeft") {
    ev.preventDefault();
    moveTableFocus(ctrl, r, c - 1);
    return;
  }

  if (ev.key === "ArrowRight") {
    ev.preventDefault();
    if (c < cols - 1) moveTableFocus(ctrl, r, c + 1);
    else addTableColumn(ctrl, r);
  }
}

function hideTableContextMenu(): void {
  document.getElementById(TABLE_CONTEXT_MENU_ID)?.remove();
}

function showTableContextMenu(
  ctrl: TableController,
  input: HTMLInputElement,
  ev: MouseEvent,
): void {
  ev.preventDefault();
  hideTableContextMenu();
  ensureRectangularTable(ctrl);
  const row = Number(input.dataset.tr);
  const col = Number(input.dataset.tc);
  const canDeleteRow = ctrl.data.length > MIN_TABLE_ROWS;
  const canDeleteCol = (ctrl.data[0]?.length ?? MIN_TABLE_COLS) > MIN_TABLE_COLS;

  const menu = document.createElement("div");
  menu.id = TABLE_CONTEXT_MENU_ID;
  menu.className =
    "fixed z-[80] min-w-44 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg text-sm";
  menu.style.left = `${ev.clientX}px`;
  menu.style.top = `${ev.clientY}px`;

  const rowBtn = document.createElement("button");
  rowBtn.type = "button";
  rowBtn.textContent = t("snippet.table_delete_row");
  rowBtn.disabled = !canDeleteRow;
  rowBtn.className =
    "block w-full px-3 py-2 text-left text-gray-700 dark:text-gray-100 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-40 disabled:hover:bg-transparent";
  rowBtn.addEventListener("click", () => removeTableRow(ctrl, row));
  menu.appendChild(rowBtn);

  const colBtn = document.createElement("button");
  colBtn.type = "button";
  colBtn.textContent = t("snippet.table_delete_column");
  colBtn.disabled = !canDeleteCol;
  colBtn.className =
    "block w-full px-3 py-2 text-left text-gray-700 dark:text-gray-100 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-40 disabled:hover:bg-transparent";
  colBtn.addEventListener("click", () => removeTableColumn(ctrl, col));
  menu.appendChild(colBtn);

  document.body.appendChild(menu);
  window.setTimeout(() => {
    document.addEventListener("click", hideTableContextMenu, { once: true });
  }, 0);
}

function currentTableClassNames(): string {
  const style = (document.getElementById("snip-table-style") as HTMLSelectElement | null)?.value;
  const bordered = (document.getElementById("snip-table-bordered") as HTMLInputElement | null)?.checked;
  const color = (document.getElementById("snip-table-color") as HTMLSelectElement | null)?.value;
  return [
    "ld-table-edit-table",
    "w-full",
    "table-fixed",
    "border-collapse",
    style ? `table-style-${style}` : "",
    bordered ? "table-border-bordered" : "",
    color ? `table-color-${color}` : "",
  ].filter(Boolean).join(" ");
}

export function tableRenderGrid(ctrl: TableController): void {
  ensureRectangularTable(ctrl);
  const rows = ctrl.data.length;
  const cols = ctrl.data[0]?.length ?? 0;
  const rowsEl = document.getElementById("snip-table-rows");
  if (rowsEl) rowsEl.textContent = String(rows);
  const colsEl = document.getElementById("snip-table-cols");
  if (colsEl) colsEl.textContent = String(cols);

  const inputBase =
    "ld-table-edit-input block w-full min-w-[160px] bg-transparent border-0 rounded-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500";
  const hdrCls = `${inputBase} font-semibold`;
  const bodyInputCls = `${inputBase}`;

  let html = '<div class="ld-table-editor min-w-full overflow-x-auto rounded-md bg-white dark:bg-gray-950">';
  html += `<table class="${currentTableClassNames()}"><tbody>`;
  for (let r = 0; r < rows; r++) {
    html += "<tr>";
    for (let c = 0; c < cols; c++) {
      const inputCls = r === 0 ? hdrCls : bodyInputCls;
      html += `<td><input type="text" value="${esc(ctrl.data[r][c])}" data-tr="${r}" data-tc="${c}" class="${inputCls}" /></td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table></div>";
  const grid = document.getElementById("snip-table-grid");
  if (grid) {
    grid.innerHTML = html;
    grid.querySelectorAll<HTMLInputElement>("input[data-tr]").forEach((input) => {
      input.addEventListener("input", () => {
        const r = Number(input.dataset.tr);
        const c = Number(input.dataset.tc);
        ctrl.data[r][c] = input.value;
        ctrl.onPreview();
      });
      input.addEventListener("keydown", (ev) => handleTableKeydown(ctrl, input, ev));
      input.addEventListener("contextmenu", (ev) => showTableContextMenu(ctrl, input, ev));
      input.addEventListener("mouseup", (ev) => {
        if (ev.button === 2) showTableContextMenu(ctrl, input, ev);
      });
    });
  }
  ctrl.onPreview();
}

export function tableChangeRows(ctrl: TableController, delta: number): void {
  const cols = ctrl.data[0]?.length ?? 3;
  if (delta > 0) {
    ctrl.data.push(Array(cols).fill(""));
  } else if (ctrl.data.length > MIN_TABLE_ROWS) {
    ctrl.data.pop();
  }
  tableRenderGrid(ctrl);
}

export function buildTableMarkdown(ctrl: TableController): string {
  const data = ctrl.data;
  if (!data.length || !data[0]?.length) return "";
  const cols = data[0].length;
  const widths = Array(cols).fill(3);
  data.forEach((row) => {
    row.forEach((cell, c) => {
      widths[c] = Math.max(widths[c], cell.length);
    });
  });
  const fmtRow = (row: string[]) =>
    `| ${row.map((cell, c) => cell.padEnd(widths[c])).join(" | ")} |`;
  const sep = `| ${widths.map((w) => "-".repeat(w)).join(" | ")} |`;
  return [fmtRow(data[0]), sep, ...data.slice(1).map(fmtRow)].join("\n");
}

export function parseTableSnippetMarkdown(markdown: string): {
  attrs: ReturnType<typeof parseTableAttributesFromMarkdown>;
  rows: string[][];
} {
  const attrs = parseTableAttributesFromMarkdown(markdown);
  const allLines = markdown
    .split("\n")
    .filter((line) => /^\|.*\|$/.test(line.trim()));
  const dataLines = allLines.filter((line) => !isMarkdownTableSeparatorLine(line));
  const rows = dataLines.map(parseMarkdownTableCells);
  const maxCols = rows.length ? Math.max(...rows.map((row) => row.length)) : 0;
  rows.forEach((row) => {
    while (row.length < maxCols) row.push("");
  });
  return { attrs, rows };
}
