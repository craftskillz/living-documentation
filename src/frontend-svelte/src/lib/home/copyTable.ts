const TABLE_STYLE = "border-collapse:collapse";
const CELL_STYLE = "border:1px solid #000000;padding:4px 8px";
const INLINE_TAGS = new Set(["A", "B", "BR", "CODE", "DEL", "EM", "I", "S", "STRONG", "SUB", "SUP", "U"]);
// Viewer additions that are not table content: tag markers and footnote references.
const EXCLUDED = '.ld-tag-marker, sup:has(> a[href^="#ld-fn-"]), a[href^="#ld-fn-"]';

/** Copies inline formatting only: classes and styles from the viewer stay behind. */
function appendCleanContent(source: Node, target: Node): void {
  for (const child of source.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(child.cloneNode());
    } else if (child instanceof Element && !child.matches(EXCLUDED)) {
      if (child instanceof HTMLImageElement) {
        // An image served by the local viewer cannot be fetched by the paste target.
        target.appendChild(document.createTextNode(child.alt));
      } else if (INLINE_TAGS.has(child.tagName)) {
        const element = document.createElement(child.tagName);
        if (child instanceof HTMLAnchorElement) element.setAttribute("href", child.href);
        if (child.tagName === "CODE") element.style.fontFamily = "monospace";
        appendCleanContent(child, element);
        target.appendChild(element);
      } else {
        appendCleanContent(child, target);
      }
    }
  }
}

function cleanCell(cell: HTMLTableCellElement): HTMLTableCellElement {
  const clean = document.createElement(cell.tagName) as HTMLTableCellElement;
  clean.style.cssText = CELL_STYLE;
  if (cell.tagName === "TH") clean.style.fontWeight = "bold";
  const align = cell.style.textAlign || cell.getAttribute("align");
  if (align) clean.style.textAlign = align;
  if (cell.colSpan > 1) clean.colSpan = cell.colSpan;
  if (cell.rowSpan > 1) clean.rowSpan = cell.rowSpan;
  appendCleanContent(cell, clean);
  return clean;
}

function cellText(cell: HTMLTableCellElement): string {
  const copy = cell.cloneNode(true) as HTMLTableCellElement;
  copy.querySelectorAll("br").forEach((lineBreak) => { lineBreak.replaceWith(" "); });
  return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Writes a minimal HTML table for rich editors, and tab-separated text for the others. */
export function copyTable(table: HTMLTableElement): Promise<void> {
  const clean = document.createElement("table");
  clean.style.cssText = TABLE_STYLE;
  const head = document.createElement("thead");
  const body = document.createElement("tbody");
  const lines: string[] = [];
  for (const row of table.rows) {
    const cleanRow = document.createElement("tr");
    const cells = Array.from(row.cells, cleanCell);
    cleanRow.append(...cells);
    (row.parentElement?.tagName === "THEAD" ? head : body).appendChild(cleanRow);
    lines.push(cells.map(cellText).join("\t"));
  }
  if (head.rows.length) clean.appendChild(head);
  if (body.rows.length) clean.appendChild(body);
  return navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([clean.outerHTML], { type: "text/html" }),
      "text/plain": new Blob([lines.join("\n")], { type: "text/plain" }),
    }),
  ]);
}
