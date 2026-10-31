import type { LineRange } from "./selectionHistory";

const SOURCE_LINES_ATTR = "data-source-lines";
const SOURCE_LINES_RE = /^(\d+)-(\d+)$/;

/** Rendered blocks carry their file lines (`data-source-lines`); the selection widens to the blocks whose text it covers. */
export function selectionSourceLines(root: HTMLElement, selection: Selection | null): LineRange | null {
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  let start = Number.POSITIVE_INFINITY;
  let end = 0;
  for (const block of root.querySelectorAll<HTMLElement>(`[${SOURCE_LINES_ATTR}]`)) {
    const match = SOURCE_LINES_RE.exec(block.getAttribute(SOURCE_LINES_ATTR) ?? "");
    if (!match || !coversText(range, block)) continue;
    start = Math.min(start, Number(match[1]));
    end = Math.max(end, Number(match[2]));
  }
  return end ? { start, end } : null;
}

/** A triple-click ends the range at offset 0 of the next block: touching a block is not covering its text. */
function coversText(range: Range, block: HTMLElement): boolean {
  if (!range.intersectsNode(block)) return false;
  const part = range.cloneRange();
  if (!block.contains(range.startContainer)) part.setStartBefore(block);
  if (!block.contains(range.endContainer)) part.setEndAfter(block);
  return part.toString().trim() !== "";
}
