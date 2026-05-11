// ── Snippets — Table builder ─────────────────────────────────────────────────
// Loaded as a classic script; exposes the table-builder helpers and `_tableData`
// state as globals. Depends on `esc` (utils.js) and `snippetUpdatePreview`
// (defined inline in index.html).

let _tableData = [];

function tableInit() {
  _tableData = [
    ["En-tête 1", "En-tête 2", "En-tête 3"],
    ["", "", ""],
    ["", "", ""],
  ];
  tableRenderGrid();
}

function tableRenderGrid() {
  const rows = _tableData.length;
  const cols = _tableData[0]?.length ?? 0;
  document.getElementById("snip-table-rows").textContent = rows;
  document.getElementById("snip-table-cols").textContent = cols;

  const inputBase =
    "px-2 py-1 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 w-full min-w-[80px]";
  const hdrCls = `${inputBase} font-semibold border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100`;
  const cellCls = `${inputBase} border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100`;

  let html = '<table class="border-collapse w-full"><tbody>';
  for (let r = 0; r < rows; r++) {
    html += "<tr>";
    for (let c = 0; c < cols; c++) {
      const cls = r === 0 ? hdrCls : cellCls;
      html += `<td class="p-0.5"><input type="text" value="${esc(_tableData[r][c])}" oninput="tableUpdate(${r},${c},this.value)" class="${cls}" /></td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  document.getElementById("snip-table-grid").innerHTML = html;
  snippetUpdatePreview();
}

function tableUpdate(r, c, val) {
  _tableData[r][c] = val;
  snippetUpdatePreview();
}

function tableChangeRows(delta) {
  const cols = _tableData[0]?.length ?? 3;
  if (delta > 0) {
    _tableData.push(Array(cols).fill(""));
  } else if (_tableData.length > 2) {
    _tableData.pop();
  }
  tableRenderGrid();
}

function tableChangeCols(delta) {
  if (delta > 0) {
    _tableData.forEach((row) => row.push(""));
  } else if ((_tableData[0]?.length ?? 0) > 1) {
    _tableData.forEach((row) => row.pop());
  }
  tableRenderGrid();
}

function buildTableMarkdown() {
  if (!_tableData.length || !_tableData[0]?.length) return "";
  const cols = _tableData[0].length;
  const widths = Array(cols).fill(3);
  _tableData.forEach((row) => {
    row.forEach((cell, c) => {
      widths[c] = Math.max(widths[c], cell.length);
    });
  });
  const fmtRow = (row) =>
    "| " +
    row.map((cell, c) => cell.padEnd(widths[c])).join(" | ") +
    " |";
  const sep = "| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |";
  return [
    fmtRow(_tableData[0]),
    sep,
    ..._tableData.slice(1).map(fmtRow),
  ].join("\n");
}
