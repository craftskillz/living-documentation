// ── Inline snippet editing from rendered viewer ─────────────────────────────
// Right-clicking a rendered fragment that maps to a known snippet offers an
// inline edit/delete action. Right-clicking elsewhere offers an insert action.
// This module only maps rendered DOM elements back to source Markdown ranges;
// the actual form stays the Snippets modal (driven by the callbacks).
// Ported from src/frontend/snippets/inline-snippet-edit.js.

import { detectSnippetType } from "./snippets/detect";
import {
  orderedListBlockRegex,
  unorderedListBlockRegex,
} from "./snippets/listMarkdown";
import { tableBlockSource } from "./tableAttributes";
import { blockquoteBlockSource } from "./blockquoteAttributes";
import { t } from "../i18n.svelte";

export interface InlineSnippetRange {
  start: number;
  end: number;
  type: string;
  indent?: string;
  tableFocusCell?: { row: number; col: number };
}

export interface InlineSnippetCallbacks {
  onEdit: (range: InlineSnippetRange) => void;
  onDelete: (range: InlineSnippetRange) => void;
  onInsert: (insertPos: number) => void;
}

const _INLINE_SNIPPET_TYPES = new Set<string>([
  "anchor-doc-link",
  "doc-link",
  "anchor-link",
  "image",
  "link",
  "collapsible",
  "colored-text",
  "colored-section",
  "tree",
  "code-block",
  "table",
  "blockquote",
  "separator",
  "ordered-list",
  "unordered-list",
  "heading-1",
  "heading-2",
  "heading-3",
  "heading-4",
  "compare",
]);

const _INLINE_EDIT_AFFORDANCE_BY_TYPE: Record<
  string,
  { labelKey: string; iconClass: string }
> = {
  table: { labelKey: "snippet.inline_edit_btn_table", iconClass: "fa-solid fa-table-cells" },
  "code-block": { labelKey: "snippet.inline_edit_btn_code_block", iconClass: "fa-solid fa-code" },
  blockquote: { labelKey: "snippet.inline_edit_btn_blockquote", iconClass: "fa-solid fa-quote-right" },
  "ordered-list": { labelKey: "snippet.inline_edit_btn_ordered_list", iconClass: "fa-solid fa-list-ol" },
  "unordered-list": { labelKey: "snippet.inline_edit_btn_unordered_list", iconClass: "fa-solid fa-list-ul" },
  tree: { labelKey: "snippet.inline_edit_btn_tree", iconClass: "fa-solid fa-folder-tree" },
  "colored-section": { labelKey: "snippet.inline_edit_btn_colored_section", iconClass: "fa-solid fa-fill-drip" },
  "colored-text": { labelKey: "snippet.inline_edit_btn_colored_text", iconClass: "fa-solid fa-highlighter" },
  collapsible: { labelKey: "snippet.inline_edit_btn_collapsible", iconClass: "fa-solid fa-caret-right" },
  link: { labelKey: "snippet.inline_edit_btn_link", iconClass: "fa-solid fa-link" },
  "doc-link": { labelKey: "snippet.inline_edit_btn_doc_link", iconClass: "fa-solid fa-file-lines" },
  "anchor-link": { labelKey: "snippet.inline_edit_btn_anchor_link", iconClass: "fa-solid fa-anchor" },
  "anchor-doc-link": { labelKey: "snippet.inline_edit_btn_anchor_doc_link", iconClass: "fa-solid fa-anchor" },
  image: { labelKey: "snippet.inline_edit_btn_image", iconClass: "fa-solid fa-image" },
  separator: { labelKey: "snippet.inline_edit_btn_separator", iconClass: "fa-solid fa-minus" },
  "heading-1": { labelKey: "snippet.inline_edit_btn_heading_1", iconClass: "fa-solid fa-heading" },
  "heading-2": { labelKey: "snippet.inline_edit_btn_heading_2", iconClass: "fa-solid fa-heading" },
  "heading-3": { labelKey: "snippet.inline_edit_btn_heading_3", iconClass: "fa-solid fa-heading" },
  "heading-4": { labelKey: "snippet.inline_edit_btn_heading_4", iconClass: "fa-solid fa-heading" },
  "compare": { labelKey: "snippet.inline_edit_btn_compare", iconClass: "fa-solid fa-table-columns" },
};

function _inlineEditAffordance(type: string) {
  const known = _INLINE_EDIT_AFFORDANCE_BY_TYPE[type];
  if (known) return known;
  return { labelKey: "snippet.inline_edit_btn", iconClass: "fa-solid fa-pen-to-square" };
}

const _INLINE_DELETE_LABEL_KEY_BY_TYPE: Record<string, string> = {
  table: "snippet.inline_delete_btn_table",
  "code-block": "snippet.inline_delete_btn_code_block",
  blockquote: "snippet.inline_delete_btn_blockquote",
  "ordered-list": "snippet.inline_delete_btn_ordered_list",
  "unordered-list": "snippet.inline_delete_btn_unordered_list",
  tree: "snippet.inline_delete_btn_tree",
  "colored-section": "snippet.inline_delete_btn_colored_section",
  "colored-text": "snippet.inline_delete_btn_colored_text",
  collapsible: "snippet.inline_delete_btn_collapsible",
  link: "snippet.inline_delete_btn_link",
  "doc-link": "snippet.inline_delete_btn_doc_link",
  "anchor-link": "snippet.inline_delete_btn_anchor_link",
  "anchor-doc-link": "snippet.inline_delete_btn_anchor_doc_link",
  image: "snippet.inline_delete_btn_image",
  separator: "snippet.inline_delete_btn_separator",
  "heading-1": "snippet.inline_delete_btn_heading_1",
  "heading-2": "snippet.inline_delete_btn_heading_2",
  "heading-3": "snippet.inline_delete_btn_heading_3",
  "heading-4": "snippet.inline_delete_btn_heading_4",
  "compare": "snippet.inline_delete_btn_compare",
};

function _inlineDeleteAffordance(type: string) {
  return {
    labelKey: _INLINE_DELETE_LABEL_KEY_BY_TYPE[type] || "snippet.inline_delete_btn",
    iconClass: "fa-solid fa-trash",
  };
}

const _INLINE_TYPE_SELECTORS: { types: string[]; selector: string }[] = [
  { types: ["collapsible"], selector: "details" },
  { types: ["colored-section"], selector: 'div[style*="border-left"]' },
  { types: ["colored-text"], selector: 'span[style*="color"]' },
  { types: ["tree", "code-block"], selector: "pre" },
  { types: ["table"], selector: "table" },
  { types: ["blockquote"], selector: "blockquote" },
  { types: ["separator"], selector: "hr" },
  { types: ["ordered-list"], selector: "ol" },
  { types: ["unordered-list"], selector: "ul" },
  { types: ["heading-1"], selector: "h1" },
  { types: ["heading-2"], selector: "h2" },
  { types: ["heading-3"], selector: "h3" },
  { types: ["heading-4"], selector: "h4" },
  { types: ["image"], selector: "img" },
  { types: ["compare"], selector: ".ld-compare" },
  {
    types: ["anchor-doc-link", "doc-link", "anchor-link", "link"],
    selector: "a[href]",
  },
];

let _inlineSnippetPopup: HTMLElement | null = null;

function _inlineRangesOverlap(a: InlineSnippetRange, b: InlineSnippetRange): boolean {
  if (a.start === b.start && a.end === b.end) return true;
  if (a.start >= b.start && a.end <= b.end) return false;
  if (b.start >= a.start && b.end <= a.end) return false;
  return a.start < b.end && b.start < a.end;
}

function _inlineAddRange(ranges: InlineSnippetRange[], start: number, raw: string): void {
  if (!raw || !raw.trim()) return;
  const type = detectSnippetType(raw);
  if (!type || !_INLINE_SNIPPET_TYPES.has(type)) return;
  const end = start + raw.length;
  const candidate: InlineSnippetRange = { start, end, type };
  if (ranges.some((existing) => {
    if (_inlineRangesOverlap(existing, candidate)) return true;
    // Reject any snippet whose range falls entirely inside a code-block or compare range.
    // Fenced code/compare blocks contain literal text — patterns like tables or
    // blockquotes inside them must not be treated as separate editable snippets.
    if ((existing.type === "code-block" || existing.type === "compare") && start >= existing.start && end <= existing.end) return true;
    return false;
  })) {
    return;
  }
  ranges.push(candidate);
}

function _inlineAddRegexRanges(
  ranges: InlineSnippetRange[],
  content: string,
  regex: RegExp,
  groupIndex = 0,
): void {
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content))) {
    const raw = match[groupIndex];
    const start = match.index + (groupIndex > 0 ? match[0].indexOf(raw) : 0);
    _inlineAddRange(ranges, start, raw);
    if (match[0].length === 0) regex.lastIndex += 1;
  }
}

function _inlineLineIndentBefore(content: string, idx: number): string {
  let i = idx;
  while (i > 0 && content[i - 1] !== "\n") i -= 1;
  const prefix = content.slice(i, idx);
  return /^[ \t]+$/.test(prefix) ? prefix : "";
}

function _inlineAddCompareBlockRanges(ranges: InlineSnippetRange[], content: string): void {
  const regex = /^:::compare[ \t]*\n[\s\S]*?^:::[ \t]*$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content))) {
    const raw = match[0];
    if (!raw.trim()) {
      if (raw.length === 0) regex.lastIndex += 1;
      continue;
    }
    const start = match.index;
    const end = start + raw.length;
    const candidate: InlineSnippetRange = { start, end, type: "compare" };
    if (ranges.some((existing) => _inlineRangesOverlap(existing, candidate))) continue;
    ranges.push(candidate);
  }
}

function _inlineAddCodeBlockRanges(ranges: InlineSnippetRange[], content: string): void {
  const regex = /```[\s\S]*?```/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content))) {
    const raw = match[0];
    if (!raw.trim()) {
      if (raw.length === 0) regex.lastIndex += 1;
      continue;
    }
    const type = detectSnippetType(raw);
    if (!type || !_INLINE_SNIPPET_TYPES.has(type)) continue;
    const indent = _inlineLineIndentBefore(content, match.index);
    const start = match.index - indent.length;
    const end = match.index + raw.length;
    const candidate: InlineSnippetRange = { start, end, type, indent };
    if (ranges.some((existing) => _inlineRangesOverlap(existing, candidate))) {
      continue;
    }
    ranges.push(candidate);
  }
}

function _inlineCollectSnippetRanges(content: string): InlineSnippetRange[] {
  const ranges: InlineSnippetRange[] = [];

  // Container ranges first so inner snippets (code, lists, links…) that overlap
  // with a container get skipped — the user edits the container as a whole.
  _inlineAddRegexRanges(ranges, content, /<details[\s\S]*?<\/details>/gi);
  _inlineAddRegexRanges(
    ranges,
    content,
    /<div\b[^>]*border-left[^>]*>[\s\S]*?<\/div>/gi,
  );
  // Compare blocks before code blocks: the guard rejects any inner ```code``` fence
  // that falls inside a compare range, so compare must be registered first.
  _inlineAddCompareBlockRanges(ranges, content);
  _inlineAddCodeBlockRanges(ranges, content);
  _inlineAddRegexRanges(ranges, content, /(?:^|\n\n)(#{1,4} [^\n]+)/g, 1);
  _inlineAddRegexRanges(
    ranges,
    content,
    /<span\b[^>]*color:[^>]*>[\s\S]*?<\/span>/gi,
  );
  _inlineAddRegexRanges(
    ranges,
    content,
    new RegExp("(?:^|\\n)((" + tableBlockSource() + "))", "g"),
    1,
  );
  _inlineAddRegexRanges(
    ranges,
    content,
    new RegExp("(?:^|\\n)((" + blockquoteBlockSource() + "))", "g"),
    1,
  );
  _inlineAddRegexRanges(ranges, content, orderedListBlockRegex());
  _inlineAddRegexRanges(ranges, content, unorderedListBlockRegex());
  _inlineAddRegexRanges(ranges, content, /!\[[^\]\n]*\]\([^)]+\)/g);
  _inlineAddRegexRanges(ranges, content, /\[[^\]\n]+\]\([^)]+\)/g);

  const frontmatter = content.match(/^---\s*\n[\s\S]*?\n---/);
  _inlineAddRegexRanges(ranges, content, /^---$/gm);
  return ranges
    .filter((range) => {
      if (range.type !== "separator") return true;
      return !frontmatter || range.start > frontmatter[0].length;
    })
    .sort((a, b) => a.start - b.start);
}

function _inlineTopLevelListElements(contentEl: HTMLElement, selector: string): Element[] {
  return Array.from(contentEl.querySelectorAll(selector)).filter(
    (el) => !el.parentElement!.closest("ol, ul"),
  );
}

function _inlineAssignElements(
  contentEl: HTMLElement,
  candidates: InlineSnippetRange[],
): void {
  contentEl.querySelectorAll("[data-inline-snippet-index]").forEach((el) => {
    el.removeAttribute("data-inline-snippet-index");
    el.classList.remove("ld-inline-snippet-target");
  });

  for (const { types, selector } of _INLINE_TYPE_SELECTORS) {
    const matching = candidates.filter((candidate) =>
      types.includes(candidate.type),
    );
    if (!matching.length) continue;
    const elements =
      selector === "ol" || selector === "ul"
        ? _inlineTopLevelListElements(contentEl, selector)
        : Array.from(contentEl.querySelectorAll(selector)).filter(
            (el) => !el.closest(".ld-compare-render"),
          );
    const limit = Math.min(matching.length, elements.length);
    for (let i = 0; i < limit; i += 1) {
      (elements[i] as HTMLElement).dataset.inlineSnippetIndex = String(
        candidates.indexOf(matching[i]),
      );
      elements[i].classList.add("ld-inline-snippet-target");
    }
  }
}

function _inlineClosePopup(): void {
  if (_inlineSnippetPopup) {
    _inlineSnippetPopup.remove();
    _inlineSnippetPopup = null;
  }
}

interface InlinePopupAction {
  iconClass: string;
  labelKey: string;
  dataAction?: string;
  dataType?: string;
  onActivate: () => void;
}

function _inlineShowPopup(
  event: MouseEvent,
  options: InlinePopupAction | InlinePopupAction[],
): void {
  _inlineClosePopup();
  const actions = Array.isArray(options) ? options : [options];
  const primary = actions[0] || ({} as InlinePopupAction);
  const popup = document.createElement("div");
  popup.id = "inline-snippet-popup";
  if (primary.dataAction) popup.dataset.action = primary.dataAction;
  if (primary.dataType) popup.dataset.snippetType = primary.dataType;
  popup.className =
    "fixed z-50 flex flex-col rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 shadow-lg p-1";
  // Layout-critical styles set inline so the popup is correctly sized at measure
  // time even before the Tailwind CDN JIT generates these utility classes
  // (otherwise the first popup is an unstyled full-width block → clamped left).
  popup.style.position = "fixed";
  popup.style.display = "flex";
  popup.style.flexDirection = "column";
  popup.style.width = "max-content";
  popup.style.zIndex = "50";
  for (const action of actions) {
    const isDanger = action.dataAction === "delete";
    const btn = document.createElement("button");
    btn.type = "button";
    if (action.dataAction) btn.dataset.action = action.dataAction;
    btn.className =
      "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold " +
      (isDanger
        ? "text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
        : "text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30");
    const icon = document.createElement("i");
    icon.className = action.iconClass;
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = t(action.labelKey);
    btn.append(icon, label);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      _inlineClosePopup();
      action.onActivate();
    });
    popup.appendChild(btn);
  }
  document.body.appendChild(popup);

  const margin = 8;
  const rect = popup.getBoundingClientRect();
  const left = Math.min(
    window.innerWidth - rect.width - margin,
    Math.max(margin, event.clientX),
  );
  const top = Math.max(margin, event.clientY - rect.height - margin);
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  _inlineSnippetPopup = popup;
}

function _inlineTopLevelBlock(contentEl: HTMLElement, target: EventTarget | null): Element | null {
  let block: Element | null = target instanceof Element ? target : null;
  while (block && block.parentElement && block.parentElement !== contentEl) {
    block = block.parentElement;
  }
  if (!block || block === contentEl || block.parentElement !== contentEl) {
    return null;
  }
  return block;
}

function _inlineTableCellPosition(
  eventTarget: EventTarget | null,
  tableTarget: Element,
): { row: number; col: number } | null {
  const cell = (eventTarget as Element | null)?.closest("th, td");
  if (!cell || !tableTarget.contains(cell)) return null;
  const rowEl = cell.closest("tr");
  if (!rowEl) return null;
  const row = Array.from(tableTarget.querySelectorAll("tr")).indexOf(rowEl);
  const col = Array.from(rowEl.children).indexOf(cell);
  if (row < 0 || col < 0) return null;
  return { row, col };
}

function _inlineNearestBlockByY(contentEl: HTMLElement, clientY: number): Element | null {
  if (typeof clientY !== "number") return null;
  const children = Array.from(contentEl.children);
  if (!children.length) return null;
  let above: Element | null = null;
  let below: Element | null = null;
  for (const child of children) {
    const rect = child.getBoundingClientRect();
    if (rect.bottom < clientY) above = child;
    else if (rect.top > clientY) {
      if (!below) below = child;
    } else return child;
  }
  return above || below;
}

function _inlineResolveBlockEnd(
  content: string,
  block: Element,
  candidates: InlineSnippetRange[],
): number | null {
  if (block.matches("[data-inline-snippet-index]")) {
    const range = candidates[Number((block as HTMLElement).dataset.inlineSnippetIndex)];
    if (range) return range.end;
  }
  let anchorIdx: number | null = null;
  const desc = Array.from(block.querySelectorAll("[data-inline-snippet-index]"));
  if (desc.length > 0) {
    let maxEnd = -1;
    for (const d of desc) {
      const range = candidates[Number((d as HTMLElement).dataset.inlineSnippetIndex)];
      if (range && range.end > maxEnd) maxEnd = range.end;
    }
    if (maxEnd >= 0) anchorIdx = maxEnd;
  } else {
    const text = (block.textContent || "").trim();
    if (text) {
      const firstLine = text.split("\n")[0].trim().slice(0, 60);
      if (firstLine) {
        const idx = content.indexOf(firstLine);
        if (idx >= 0) anchorIdx = idx;
      }
    }
  }
  if (anchorIdx === null) return null;
  const blankIdx = content.indexOf("\n\n", anchorIdx);
  return blankIdx >= 0 ? blankIdx : content.length;
}

function _inlineResolveBlockStart(
  content: string,
  block: Element,
  candidates: InlineSnippetRange[],
): number | null {
  if (block.matches("[data-inline-snippet-index]")) {
    const range = candidates[Number((block as HTMLElement).dataset.inlineSnippetIndex)];
    if (range) return range.start;
  }
  const desc = Array.from(block.querySelectorAll("[data-inline-snippet-index]"));
  if (desc.length > 0) {
    let minStart = Infinity;
    for (const d of desc) {
      const range = candidates[Number((d as HTMLElement).dataset.inlineSnippetIndex)];
      if (range && range.start < minStart) minStart = range.start;
    }
    if (minStart < Infinity) return minStart;
  }
  const text = (block.textContent || "").trim();
  if (text) {
    const firstLine = text.split("\n")[0].trim().slice(0, 60);
    if (firstLine) {
      const idx = content.indexOf(firstLine);
      if (idx >= 0) return idx;
    }
  }
  return null;
}

function _inlineFindInsertPosition(
  content: string,
  contentEl: HTMLElement,
  target: EventTarget | null,
  candidates: InlineSnippetRange[],
  clientY: number,
): number | null {
  const topBlock =
    _inlineTopLevelBlock(contentEl, target) ||
    _inlineNearestBlockByY(contentEl, clientY);
  if (!topBlock) return content.length;

  const directEnd = _inlineResolveBlockEnd(content, topBlock, candidates);
  if (directEnd !== null) return directEnd;

  let prev = topBlock.previousElementSibling;
  while (prev) {
    const end = _inlineResolveBlockEnd(content, prev, candidates);
    if (end !== null) {
      const next = content.indexOf("\n\n", end + 1);
      return next >= 0 ? next : content.length;
    }
    prev = prev.previousElementSibling;
  }

  let nxt = topBlock.nextElementSibling;
  while (nxt) {
    const start = _inlineResolveBlockStart(content, nxt, candidates);
    if (start !== null) {
      const prevBlank = content.lastIndexOf("\n\n", start);
      return prevBlank >= 0 ? prevBlank : 0;
    }
    nxt = nxt.nextElementSibling;
  }

  return content.length;
}

export function initInlineSnippetEditing(
  contentEl: HTMLElement,
  content: string,
  cb: InlineSnippetCallbacks,
): () => void {
  if (!contentEl || typeof content !== "string") {
    return () => {};
  }
  const candidates = _inlineCollectSnippetRanges(content);
  _inlineAssignElements(contentEl, candidates);

  const contextHandler = (event: MouseEvent) => {
    const target = (event.target as Element | null)?.closest(
      "[data-inline-snippet-index]",
    );
    if (target && contentEl.contains(target)) {
      const range = candidates[Number((target as HTMLElement).dataset.inlineSnippetIndex)];
      if (!range) return;
      event.preventDefault();
      const edit = _inlineEditAffordance(range.type);
      const del = _inlineDeleteAffordance(range.type);
      _inlineShowPopup(event, [
        {
          iconClass: edit.iconClass,
          labelKey: edit.labelKey,
          dataAction: "edit",
          dataType: range.type,
          onActivate: () => cb.onEdit(range),
        },
        {
          iconClass: del.iconClass,
          labelKey: del.labelKey,
          dataAction: "delete",
          dataType: range.type,
          onActivate: () => cb.onDelete(range),
        },
      ]);
      return;
    }
    if (!contentEl.contains(event.target as Node)) return;
    const insertPos = _inlineFindInsertPosition(
      content,
      contentEl,
      event.target,
      candidates,
      event.clientY,
    );
    if (insertPos === null) return;
    event.preventDefault();
    _inlineShowPopup(event, {
      iconClass: "fa-solid fa-plus",
      labelKey: "snippet.inline_insert_btn",
      dataAction: "insert",
      onActivate: () => cb.onInsert(insertPos),
    });
  };
  contentEl.addEventListener("contextmenu", contextHandler);

  const dblClickHandler = (event: MouseEvent) => {
    const target = (event.target as Element | null)?.closest(
      "[data-inline-snippet-index]",
    );
    if (!target || !contentEl.contains(target)) return;
    const range = candidates[Number((target as HTMLElement).dataset.inlineSnippetIndex)];
    if (!range || range.type !== "table") return;
    event.preventDefault();
    event.stopPropagation();
    _inlineClosePopup();
    cb.onEdit({
      ...range,
      tableFocusCell: _inlineTableCellPosition(event.target, target) || undefined,
    });
  };
  contentEl.addEventListener("dblclick", dblClickHandler);

  // Fallback: catch right-clicks on the surrounding content area when the
  // rendered content is too small to receive them (empty doc, only a heading,
  // etc.). Lower priority than the inner handler — runs only when the click
  // target is OUTSIDE contentEl and nothing else preventDefault'd.
  const mainEl =
    contentEl.closest("#home-content-area") || contentEl.closest("main");
  let mainFallbackHandler: ((event: MouseEvent) => void) | null = null;
  if (mainEl) {
    mainFallbackHandler = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (contentEl.offsetParent === null) return;
      if (
        (event.target as Element | null)?.closest(
          "textarea, input, [data-inline-snippet-index]",
        )
      ) {
        return;
      }
      if (contentEl.contains(event.target as Node)) return;
      event.preventDefault();
      _inlineShowPopup(event, {
        iconClass: "fa-solid fa-plus",
        labelKey: "snippet.inline_insert_btn",
        dataAction: "insert",
        onActivate: () => cb.onInsert(content.length),
      });
    };
    mainEl.addEventListener("contextmenu", mainFallbackHandler as EventListener);
  }

  const docClickHandler = (event: MouseEvent) => {
    if (_inlineSnippetPopup && !_inlineSnippetPopup.contains(event.target as Node)) {
      _inlineClosePopup();
    }
  };
  const docKeydownHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") _inlineClosePopup();
  };
  document.addEventListener("click", docClickHandler);
  document.addEventListener("keydown", docKeydownHandler);

  return () => {
    contentEl.removeEventListener("contextmenu", contextHandler);
    contentEl.removeEventListener("dblclick", dblClickHandler);
    if (mainEl && mainFallbackHandler) {
      mainEl.removeEventListener("contextmenu", mainFallbackHandler as EventListener);
    }
    document.removeEventListener("click", docClickHandler);
    document.removeEventListener("keydown", docKeydownHandler);
    _inlineClosePopup();
    contentEl.querySelectorAll("[data-inline-snippet-index]").forEach((el) => {
      el.removeAttribute("data-inline-snippet-index");
      el.classList.remove("ld-inline-snippet-target");
    });
  };
}
