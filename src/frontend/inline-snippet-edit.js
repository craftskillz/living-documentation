// ── Inline snippet editing from rendered viewer ─────────────────────────────
// Right-clicking a rendered fragment that maps to a known snippet offers an
// inline edit action. The actual form stays the Snippets modal; this file only
// maps rendered DOM elements back to source Markdown ranges.

const _INLINE_SNIPPET_TYPES = new Set([
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
]);

const _INLINE_EDIT_AFFORDANCE_BY_TYPE = {
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
};

function _inlineEditAffordance(type) {
  const known = _INLINE_EDIT_AFFORDANCE_BY_TYPE[type];
  if (known) return known;
  return { labelKey: "snippet.inline_edit_btn", iconClass: "fa-solid fa-pen-to-square" };
}

const _INLINE_DELETE_LABEL_KEY_BY_TYPE = {
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
};

function _inlineDeleteAffordance(type) {
  return {
    labelKey: _INLINE_DELETE_LABEL_KEY_BY_TYPE[type] || "snippet.inline_delete_btn",
    iconClass: "fa-solid fa-trash",
  };
}

const _INLINE_TYPE_SELECTORS = [
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
  {
    types: ["anchor-doc-link", "doc-link", "anchor-link", "link"],
    selector: "a[href]",
  },
];

let _inlineSnippetPopup = null;

function _inlineRangesOverlap(a, b) {
  // Reject only same-position duplicates (different regex matched the same span)
  // and partial overlaps. Allow strict nesting so a container can coexist with
  // its inner snippets (the deepest-mapped DOM ancestor wins at click time).
  if (a.start === b.start && a.end === b.end) return true;
  if (a.start >= b.start && a.end <= b.end) return false;
  if (b.start >= a.start && b.end <= a.end) return false;
  return a.start < b.end && b.start < a.end;
}

function _inlineAddRange(ranges, start, raw) {
  if (!raw || !raw.trim()) return;
  const type = detectSnippetType(raw);
  if (!type || !_INLINE_SNIPPET_TYPES.has(type)) return;
  const end = start + raw.length;
  const candidate = { start, end, type };
  if (ranges.some((existing) => _inlineRangesOverlap(existing, candidate))) {
    return;
  }
  ranges.push(candidate);
}

function _inlineAddRegexRanges(ranges, content, regex, groupIndex = 0) {
  let match;
  while ((match = regex.exec(content))) {
    const raw = match[groupIndex];
    const start =
      match.index + (groupIndex > 0 ? match[0].indexOf(raw) : 0);
    _inlineAddRange(ranges, start, raw);
    if (match[0].length === 0) regex.lastIndex += 1;
  }
}

function _inlineLineIndentBefore(content, idx) {
  let i = idx;
  while (i > 0 && content[i - 1] !== "\n") i -= 1;
  const prefix = content.slice(i, idx);
  return /^[ \t]+$/.test(prefix) ? prefix : "";
}

function _inlineAddCodeBlockRanges(ranges, content) {
  const regex = /```[\s\S]*?```/g;
  let match;
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
    const candidate = { start, end, type, indent };
    if (ranges.some((existing) => _inlineRangesOverlap(existing, candidate))) {
      continue;
    }
    ranges.push(candidate);
  }
}

function _inlineCollectSnippetRanges(content) {
  const ranges = [];

  // Container ranges first so inner snippets (code, lists, links…) that overlap
  // with a container get skipped — the user edits the container as a whole.
  _inlineAddRegexRanges(ranges, content, /<details[\s\S]*?<\/details>/gi);
  _inlineAddRegexRanges(
    ranges,
    content,
    /<div\b[^>]*border-left[^>]*>[\s\S]*?<\/div>/gi,
  );
  _inlineAddCodeBlockRanges(ranges, content);
  _inlineAddRegexRanges(
    ranges,
    content,
    /(?:^|\n\n)(#{1,4} [^\n]+)/g,
    1,
  );
  _inlineAddRegexRanges(
    ranges,
    content,
    /<span\b[^>]*color:[^>]*>[\s\S]*?<\/span>/gi,
  );
  _inlineAddRegexRanges(
    ranges,
    content,
    /(?:^|\n)((?:\|[^\n]*\|\n)\|[ \t:|-]*\|(?:\n\|[^\n]*\|)*)/g,
    1,
  );
  _inlineAddRegexRanges(ranges, content, /^> .*(?:\n>.*)*/gm);
  _inlineAddRegexRanges(ranges, content, /^1\. .*(?:\n(?:\d+\.| {3,}\d+\.) .*)*/gm);
  _inlineAddRegexRanges(ranges, content, /^- .*(?:\n(?:- | {2,}- ).*)*/gm);
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

function _inlineTopLevelListElements(contentEl, selector) {
  return Array.from(contentEl.querySelectorAll(selector)).filter(
    (el) => !el.parentElement.closest("ol, ul"),
  );
}

function _inlineAssignElements(contentEl, candidates) {
  contentEl
    .querySelectorAll("[data-inline-snippet-index]")
    .forEach((el) => {
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
        : Array.from(contentEl.querySelectorAll(selector));
    const limit = Math.min(matching.length, elements.length);
    for (let i = 0; i < limit; i += 1) {
      elements[i].dataset.inlineSnippetIndex = String(
        candidates.indexOf(matching[i]),
      );
      elements[i].classList.add("ld-inline-snippet-target");
    }
  }
}

function _inlineClosePopup() {
  if (_inlineSnippetPopup) {
    _inlineSnippetPopup.remove();
    _inlineSnippetPopup = null;
  }
}

function _inlineShowPopup(event, options) {
  _inlineClosePopup();
  const actions = Array.isArray(options) ? options : [options];
  const primary = actions[0] || {};
  const popup = document.createElement("div");
  popup.id = "inline-snippet-popup";
  if (primary.dataAction) popup.dataset.action = primary.dataAction;
  if (primary.dataType) popup.dataset.snippetType = primary.dataType;
  popup.className =
    "fixed z-50 flex flex-col rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 shadow-lg p-1";
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
    label.textContent = window.t(action.labelKey);
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

function _inlineTopLevelBlock(contentEl, target) {
  let block = target instanceof Element ? target : null;
  while (block && block.parentElement && block.parentElement !== contentEl) {
    block = block.parentElement;
  }
  if (!block || block === contentEl || block.parentElement !== contentEl) {
    return null;
  }
  return block;
}

function _inlineNearestBlockByY(contentEl, clientY) {
  if (typeof clientY !== "number") return null;
  const children = Array.from(contentEl.children);
  if (!children.length) return null;
  let above = null;
  let below = null;
  for (const child of children) {
    const rect = child.getBoundingClientRect();
    if (rect.bottom < clientY) above = child;
    else if (rect.top > clientY) {
      if (!below) below = child;
    } else return child;
  }
  return above || below;
}

function _inlineResolveBlockEnd(block, candidates) {
  if (block.matches("[data-inline-snippet-index]")) {
    const range = candidates[Number(block.dataset.inlineSnippetIndex)];
    if (range) return range.end;
  }
  let anchorIdx = null;
  const desc = Array.from(
    block.querySelectorAll("[data-inline-snippet-index]"),
  );
  if (desc.length > 0) {
    let maxEnd = -1;
    for (const d of desc) {
      const range = candidates[Number(d.dataset.inlineSnippetIndex)];
      if (range && range.end > maxEnd) maxEnd = range.end;
    }
    if (maxEnd >= 0) anchorIdx = maxEnd;
  } else {
    const text = (block.textContent || "").trim();
    if (text) {
      const firstLine = text.split("\n")[0].trim().slice(0, 60);
      if (firstLine) {
        const idx = currentDocContent.indexOf(firstLine);
        if (idx >= 0) anchorIdx = idx;
      }
    }
  }
  if (anchorIdx === null) return null;
  const blankIdx = currentDocContent.indexOf("\n\n", anchorIdx);
  return blankIdx >= 0 ? blankIdx : currentDocContent.length;
}

function _inlineResolveBlockStart(block, candidates) {
  if (block.matches("[data-inline-snippet-index]")) {
    const range = candidates[Number(block.dataset.inlineSnippetIndex)];
    if (range) return range.start;
  }
  const desc = Array.from(
    block.querySelectorAll("[data-inline-snippet-index]"),
  );
  if (desc.length > 0) {
    let minStart = Infinity;
    for (const d of desc) {
      const range = candidates[Number(d.dataset.inlineSnippetIndex)];
      if (range && range.start < minStart) minStart = range.start;
    }
    if (minStart < Infinity) return minStart;
  }
  const text = (block.textContent || "").trim();
  if (text) {
    const firstLine = text.split("\n")[0].trim().slice(0, 60);
    if (firstLine) {
      const idx = currentDocContent.indexOf(firstLine);
      if (idx >= 0) return idx;
    }
  }
  return null;
}

function _inlineFindInsertPosition(contentEl, target, candidates, clientY) {
  if (typeof currentDocContent !== "string") return null;
  const topBlock =
    _inlineTopLevelBlock(contentEl, target) ||
    _inlineNearestBlockByY(contentEl, clientY);
  if (!topBlock) return currentDocContent.length;

  const directEnd = _inlineResolveBlockEnd(topBlock, candidates);
  if (directEnd !== null) return directEnd;

  let prev = topBlock.previousElementSibling;
  while (prev) {
    const end = _inlineResolveBlockEnd(prev, candidates);
    if (end !== null) {
      const next = currentDocContent.indexOf("\n\n", end + 1);
      return next >= 0 ? next : currentDocContent.length;
    }
    prev = prev.previousElementSibling;
  }

  let nxt = topBlock.nextElementSibling;
  while (nxt) {
    const start = _inlineResolveBlockStart(nxt, candidates);
    if (start !== null) {
      const prevBlank = currentDocContent.lastIndexOf("\n\n", start);
      return prevBlank >= 0 ? prevBlank : 0;
    }
    nxt = nxt.nextElementSibling;
  }

  return currentDocContent.length;
}

function initInlineSnippetEditing(contentEl) {
  if (!contentEl || typeof currentDocContent !== "string") return;
  const candidates = _inlineCollectSnippetRanges(currentDocContent);
  _inlineAssignElements(contentEl, candidates);

  if (contentEl._inlineSnippetContextHandler) {
    contentEl.removeEventListener(
      "contextmenu",
      contentEl._inlineSnippetContextHandler,
    );
  }
  contentEl._inlineSnippetContextHandler = (event) => {
    const target = event.target.closest("[data-inline-snippet-index]");
    if (target && contentEl.contains(target)) {
      const range = candidates[Number(target.dataset.inlineSnippetIndex)];
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
          onActivate: () => openSnippetsModalForInlineEdit(range),
        },
        {
          iconClass: del.iconClass,
          labelKey: del.labelKey,
          dataAction: "delete",
          dataType: range.type,
          onActivate: () => confirmAndDeleteInlineSnippetRange(range),
        },
      ]);
      return;
    }
    if (!contentEl.contains(event.target)) return;
    const insertPos = _inlineFindInsertPosition(
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
      onActivate: () => openSnippetsModalForInlineInsert(insertPos),
    });
  };
  contentEl.addEventListener(
    "contextmenu",
    contentEl._inlineSnippetContextHandler,
  );

  // Fallback: catch right-clicks on the surrounding <main id="content-area">
  // when the rendered doc-content is too small to receive them (empty doc, only
  // a heading, etc.). Lower priority than the inner handler — runs only when
  // the click target is OUTSIDE contentEl and nothing else preventDefault'd.
  const mainEl =
    contentEl.closest("main#content-area") || contentEl.closest("main");
  if (mainEl && !mainEl._inlineSnippetMainFallbackHandler) {
    mainEl._inlineSnippetMainFallbackHandler = (event) => {
      if (event.defaultPrevented) return;
      if (typeof currentDocContent !== "string") return;
      const live = document.getElementById("doc-content");
      if (!live || live.classList.contains("hidden") || live.offsetParent === null) {
        return;
      }
      if (event.target.closest("#doc-editor, #doc-content, textarea, input")) {
        return;
      }
      event.preventDefault();
      const insertPos = currentDocContent.length;
      _inlineShowPopup(event, {
        iconClass: "fa-solid fa-plus",
        labelKey: "snippet.inline_insert_btn",
        dataAction: "insert",
        onActivate: () => openSnippetsModalForInlineInsert(insertPos),
      });
    };
    mainEl.addEventListener(
      "contextmenu",
      mainEl._inlineSnippetMainFallbackHandler,
    );
  }
}

document.addEventListener("click", (event) => {
  if (_inlineSnippetPopup && !_inlineSnippetPopup.contains(event.target)) {
    _inlineClosePopup();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") _inlineClosePopup();
});

window.initInlineSnippetEditing = initInlineSnippetEditing;
