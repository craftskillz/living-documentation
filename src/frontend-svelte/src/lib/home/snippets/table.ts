// Snippets — Table builder (ported from snippet-table.js).
// Keeps the imperative grid rendering used by the snippets modal. The modal
// supplies an `onPreview` callback so it can refresh the Markdown preview.

import {
  parseTableAttributesFromMarkdown,
  parseMarkdownTableCells,
  isMarkdownTableSeparatorLine,
} from "../tableAttributes";

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

export function createTableController(onPreview: () => void): TableController {
  return { data: [], onPreview };
}

export function tableInit(ctrl: TableController): void {
  ctrl.data = [
    ["En-tête 1", "En-tête 2", "En-tête 3"],
    ["", "", ""],
    ["", "", ""],
  ];
  const styleEl = document.getElementById("snip-table-style") as HTMLSelectElement | null;
  if (styleEl) styleEl.value = "";
  const borderedEl = document.getElementById("snip-table-bordered") as HTMLInputElement | null;
  if (borderedEl) borderedEl.checked = false;
  const colorEl = document.getElementById("snip-table-color") as HTMLSelectElement | null;
  if (colorEl) colorEl.value = "";
  tableRenderGrid(ctrl);
}

export function tableRenderGrid(ctrl: TableController): void {
  const rows = ctrl.data.length;
  const cols = ctrl.data[0]?.length ?? 0;
  const rowsEl = document.getElementById("snip-table-rows");
  if (rowsEl) rowsEl.textContent = String(rows);
  const colsEl = document.getElementById("snip-table-cols");
  if (colsEl) colsEl.textContent = String(cols);

  const inputBase =
    "px-2 py-1 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 w-full min-w-[80px]";
  const hdrCls = `${inputBase} font-semibold border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100`;
  const cellCls = `${inputBase} border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100`;

  let html = '<table class="border-collapse w-full"><tbody>';
  for (let r = 0; r < rows; r++) {
    html += "<tr>";
    for (let c = 0; c < cols; c++) {
      const cls = r === 0 ? hdrCls : cellCls;
      html += `<td class="p-0.5"><input type="text" value="${esc(ctrl.data[r][c])}" data-tr="${r}" data-tc="${c}" class="${cls}" /></td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
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
    });
  }
  ctrl.onPreview();
}

export function tableChangeRows(ctrl: TableController, delta: number): void {
  const cols = ctrl.data[0]?.length ?? 3;
  if (delta > 0) {
    ctrl.data.push(Array(cols).fill(""));
  } else if (ctrl.data.length > 2) {
    ctrl.data.pop();
  }
  tableRenderGrid(ctrl);
}

export function tableChangeCols(ctrl: TableController, delta: number): void {
  if (delta > 0) {
    ctrl.data.forEach((row) => row.push(""));
  } else if ((ctrl.data[0]?.length ?? 0) > 1) {
    ctrl.data.forEach((row) => row.pop());
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
    "| " + row.map((cell, c) => cell.padEnd(widths[c])).join(" | ") + " |";
  const sep = "| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |";
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
