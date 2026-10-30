import { locateTagInsertion } from "./tagInsert";

export type TagClickRefusal = "zone" | "ambiguous" | "not-found";
export type TagClickContext = { ok: true; before: string; after: string } | { ok: false; reason: "zone" | "not-found" };

// Elements where a tag can never be inserted (table/code/diagram/compare/kanban/markers).
const REFUSED_ZONES = "table, pre, code, svg, .mermaid, .ld-compare, .ld-tag-marker, .ld-kanban-board";

type CaretDocument = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as CaretDocument;
  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    return pos ? { node: pos.offsetNode, offset: pos.offset } : null;
  }
  const range = doc.caretRangeFromPoint?.(x, y);
  return range ? { node: range.startContainer, offset: range.startOffset } : null;
}

/** Text before/after the char under the pointer, or why the click cannot take a tag. */
export function tagClickContext(contentEl: HTMLElement, event: MouseEvent): TagClickContext {
  const target = event.target as Element | null;
  if (!target || target.closest(REFUSED_ZONES)) return { ok: false, reason: "zone" };
  const caret = caretAt(event.clientX, event.clientY);
  if (!caret || caret.node.nodeType !== Node.TEXT_NODE || !contentEl.contains(caret.node)) {
    return { ok: false, reason: "not-found" };
  }
  const text = caret.node.textContent ?? "";
  let offset = caret.offset;
  // A click on the right half of a char puts the caret after it: step back onto that char.
  if (offset > 0) {
    const range = document.createRange();
    range.setStart(caret.node, offset - 1);
    range.setEnd(caret.node, offset);
    const rect = range.getBoundingClientRect();
    if (event.clientX >= rect.left && event.clientX <= rect.right) offset -= 1;
  }
  return { ok: true, before: text.slice(0, offset), after: text.slice(offset) };
}

/** Source index for the click, or a refusal reason. */
export function tagClickIndex(contentEl: HTMLElement, content: string, event: MouseEvent):
  { ok: true; index: number } | { ok: false; reason: TagClickRefusal } {
  const ctx = tagClickContext(contentEl, event);
  if (!ctx.ok) return ctx;
  return locateTagInsertion(content, ctx.before, ctx.after);
}
