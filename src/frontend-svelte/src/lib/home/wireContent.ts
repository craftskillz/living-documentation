import { collectTableAttributesFromSource } from "./tableAttributes";
import {
  collectBlockquoteAttributesFromSource,
  getCalloutIcon,
} from "./blockquoteAttributes";
import {
  collectImageAttributesFromSource,
  imageWidthClass,
} from "./imageAttributes";
import {
  collectCodeBlockAttributesFromSource,
  codeBlockWidthClass,
  type CodeBlockAttrs,
} from "./codeBlockAttributes";

declare global {
  interface Window {
    hljs?: { highlightElement(el: Element): void };
    mermaid?: { run(opts: { nodes: NodeListOf<Element> }): void };
  }
}

interface WireOptions {
  content: string;
  codeBlockMaxHeight: number;
  t: (key: string) => string;
  onDocLink: (id: string, anchor: string | null) => void;
  onAnchor: (anchorId: string) => void;
}

const COPY_SVG =
  '<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="8" height="9" rx="1.5"/><path d="M3 11V3a1 1 0 0 1 1-1h7"/></svg>';
const CHECK_SVG =
  '<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5 6.5 12 13 4.5"/></svg>';

export function wireDocContent(contentEl: HTMLElement, html: string, opts: WireOptions) {
  contentEl.innerHTML = html;
  applyTableStyles(contentEl, opts.content);
  fillEmptyTableCells(contentEl);
  applyBlockquoteStyles(contentEl, opts.content);
  applyImageStyles(contentEl, opts.content);
  applyCompareBlockStyles(contentEl);
  applyColumnLayouts(contentEl);
  const codeBlockAttrs = collectCodeBlockAttributesFromSource(opts.content);
  let codeBlockIndex = 0;

  contentEl.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(h => {
    if (!h.id) {
      h.id = (h.textContent || "")
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
    }
  });

  // Mermaid before highlight.js
  contentEl.querySelectorAll("pre code").forEach(block => {
    const inCompare = Boolean(block.closest(".ld-compare-render"));
    const attrs = inCompare ? null : codeBlockAttrs[codeBlockIndex++];
    const pre = block.closest("pre");
    if (!block.classList.contains("language-mermaid")) {
      if (pre && attrs) applyCodeBlockLayout(pre, attrs);
      return;
    }
    const source = block.textContent || "";
    const wrapper = document.createElement("div");
    wrapper.className = "mermaid my-4";
    wrapper.textContent = source;
    if (attrs) applyCodeBlockLayout(wrapper, attrs);
    pre?.replaceWith(wrapper);
  });
  if (window.mermaid && contentEl.querySelector(".mermaid")) {
    window.mermaid.run({ nodes: contentEl.querySelectorAll(".mermaid") });
  }

  contentEl.querySelectorAll("pre code").forEach(block => {
    window.hljs?.highlightElement(block);
  });

  decorateCodeCopy(contentEl, opts.t);
  decorateCollapsible(contentEl, opts.codeBlockMaxHeight, opts.t);

  // In-doc links (?doc=id)
  contentEl.querySelectorAll("a[href]").forEach(a => {
    const href = a.getAttribute("href");
    const m = href?.match(/[?&]doc=([^&#]+)/);
    if (!m) return;
    const hashIdx = href?.indexOf("#");
    const anchorTarget = hashIdx !== -1 ? href?.slice(hashIdx + 1) : null;
    a.addEventListener("click", e => {
      e.preventDefault();
      opts.onDocLink(decodeURIComponent(m[1]), anchorTarget);
    });
  });

  // Anchor links
  contentEl.querySelectorAll('a[href^="#"]').forEach(a => {
    const href = a.getAttribute("href");
    if (!href || href.length < 2) return;
    a.addEventListener("click", e => {
      e.preventDefault();
      opts.onAnchor(href.slice(1));
    });
  });

  // Wrap tables for horizontal scroll
  contentEl.querySelectorAll("table").forEach(t => {
    const wrapper = document.createElement("div");
    wrapper.className = "overflow-x-auto";
    t.parentNode?.insertBefore(wrapper, t);
    wrapper.appendChild(t);
  });
}

function applyCodeBlockLayout(element: HTMLElement, attrs: CodeBlockAttrs) {
  if (attrs.width) {
    element.classList.add(codeBlockWidthClass(attrs.kind, attrs.width));
    element.dataset.codeBlockWidth = attrs.width;
  }
  if (attrs.align) {
    element.classList.add(`ld-${attrs.kind}-align-${attrs.align}`);
    element.dataset.codeBlockAlign = attrs.align;
  }
}

function applyTableStyles(contentEl: HTMLElement, content: string) {
  const attrs = collectTableAttributesFromSource(typeof content === "string" ? content : "");
  // Exclude tables inside compare render blocks — those are handled by applyCompareBlockStyles.
  const tables = Array.from(contentEl.querySelectorAll("table")).filter(
    (t) => !t.closest(".ld-compare-render"),
  );
  tables.forEach((table, i) => {
    const a = attrs[i];
    if (!a) return;
    if (a.style) { table.classList.add(`table-style-${a.style}`); (table as HTMLElement).dataset.tableStyle = a.style; }
    if (a.border) { table.classList.add(`table-border-${a.border}`); (table as HTMLElement).dataset.tableBorder = a.border; }
    if (a.color) { table.classList.add(`table-color-${a.color}`); (table as HTMLElement).dataset.tableColor = a.color; }
  });
}

function fillEmptyTableCells(contentEl: HTMLElement) {
  contentEl.querySelectorAll("table th, table td").forEach(cell => {
    if ((cell.textContent || "").trim() === "") cell.textContent = " ";
  });
}

function applyImageStyles(contentEl: HTMLElement, content: string) {
  const attrs = collectImageAttributesFromSource(typeof content === "string" ? content : "");
  const images = Array.from(contentEl.querySelectorAll("img")).filter(
    (img) => !img.closest(".ld-compare-render"),
  );
  images.forEach((image, i) => {
    const a = attrs[i];
    if (!a) return;
    if (a.width) {
      image.classList.add(imageWidthClass(a.width));
      image.dataset.imageWidth = a.width;
    }
    if (a.align) {
      image.classList.add(`ld-image-align-${a.align}`);
      image.dataset.imageAlign = a.align;
    }
  });
}

// ── Column layouts ────────────────────────────────────────────────────────────
// Source directive (comments kept in the Markdown, so it round-trips):
//   <!-- layout-columns: 2/1 | vertical-align: center | text-align: left | gap: lg -->
//   <!-- col -->
//   … markdown …
//   <!-- col -->
//   … markdown …
//   <!-- /layout-columns -->
// marked keeps these as top-level comment nodes (markers must be blank-line separated), so we
// restructure post-render: wrap the blocks of each column into .ld-columns / .ld-column divs.
interface ColumnLayoutOpts {
  ratio: string | null;
  valign: string | null;
  textAlign: string | null;
  gap: string | null;
}

const LAYOUT_OPEN_RE = /^\s*layout-columns\b/i;
const LAYOUT_COL_RE = /^\s*col\s*$/i;
const LAYOUT_CLOSE_RE = /^\s*\/layout-columns\s*$/i;
const VALIGN_VALUES = new Set(["top", "center", "bottom", "stretch"]);
const TEXT_ALIGN_VALUES = new Set(["left", "center", "right", "justify"]);
const GAP_VALUES = new Set(["sm", "md", "lg"]);

function parseColumnLayoutOpts(data: string): ColumnLayoutOpts {
  const rest = data.trim().replace(/^layout-columns\s*:?\s*/i, "");
  const opts: ColumnLayoutOpts = { ratio: null, valign: null, textAlign: null, gap: null };
  for (const partRaw of rest.split("|")) {
    const part = partRaw.trim();
    if (!part) continue;
    const kv = part.match(/^([\w-]+)\s*:\s*(.+)$/);
    if (kv) {
      const key = kv[1].toLowerCase();
      const value = kv[2].trim().toLowerCase();
      if (key === "vertical-align" && VALIGN_VALUES.has(value)) opts.valign = value;
      else if (key === "text-align" && TEXT_ALIGN_VALUES.has(value)) opts.textAlign = value;
      else if (key === "gap" && GAP_VALUES.has(value)) opts.gap = value;
      else if (key === "ratio") opts.ratio = value.replace(/\s+/g, "");
    } else if (/^\d+(\s*\/\s*\d+)*$/.test(part)) {
      opts.ratio = part.replace(/\s+/g, "");
    }
  }
  return opts;
}

function gridTemplateFromRatio(ratio: string | null, columnCount: number): string {
  const equal = `repeat(${columnCount}, minmax(0, 1fr))`;
  if (!ratio) return equal;
  if (ratio.includes("/")) {
    const fractions = ratio.split("/").map((n) => parseInt(n, 10));
    // Only honor the ratio when it matches the number of columns, else fall back to equal.
    if (fractions.length === columnCount && fractions.every((n) => Number.isFinite(n) && n > 0)) {
      return fractions.map((n) => `${n}fr`).join(" ");
    }
    return equal;
  }
  const n = parseInt(ratio, 10);
  return Number.isFinite(n) && n > 0 ? `repeat(${n}, minmax(0, 1fr))` : equal;
}

function applyColumnLayouts(contentEl: HTMLElement) {
  const openings: Comment[] = [];
  contentEl.childNodes.forEach((n) => {
    if (n.nodeType === Node.COMMENT_NODE && LAYOUT_OPEN_RE.test((n as Comment).data)) {
      openings.push(n as Comment);
    }
  });

  for (const open of openings) {
    const opts = parseColumnLayoutOpts(open.data);

    // Gather nodes between the opening and the matching closing comment.
    const between: Node[] = [];
    let close: Comment | null = null;
    for (let n = open.nextSibling; n; n = n.nextSibling) {
      if (n.nodeType === Node.COMMENT_NODE && LAYOUT_CLOSE_RE.test((n as Comment).data)) {
        close = n as Comment;
        break;
      }
      between.push(n);
    }
    if (!close) continue; // no closer → leave the source untouched (safe)

    // Split the range into column groups at each <!-- col --> marker.
    const groups: Node[][] = [];
    let current: Node[] | null = null;
    for (const node of between) {
      if (node.nodeType === Node.COMMENT_NODE && LAYOUT_COL_RE.test((node as Comment).data)) {
        current = [];
        groups.push(current);
        continue;
      }
      if (!current) {
        if (node.nodeType === Node.TEXT_NODE && !(node.textContent || "").trim()) continue;
        current = [];
        groups.push(current);
      }
      current.push(node);
    }
    if (groups.length === 0) continue; // malformed → leave untouched

    const container = document.createElement("div");
    container.className = "ld-columns";
    if (opts.valign) container.classList.add(`ld-valign-${opts.valign}`);
    if (opts.textAlign) container.classList.add(`ld-text-${opts.textAlign}`);
    if (opts.gap) container.classList.add(`ld-gap-${opts.gap}`);
    container.style.gridTemplateColumns = gridTemplateFromRatio(opts.ratio, groups.length);

    for (const group of groups) {
      const col = document.createElement("div");
      col.className = "ld-column";
      for (const node of group) col.appendChild(node); // moves the node into the column
      container.appendChild(col);
    }

    contentEl.insertBefore(container, open);
    open.remove();
    close.remove();
    // Remove leftover markers / whitespace text nodes that were not moved into a column.
    for (const node of between) {
      if (node.parentNode === contentEl) node.remove();
    }
  }
}

// Apply the column-layout transform to an HTML string (used by the PDF export, which embeds
// server-rendered HTML without running the live wireDocContent decoration pass).
export function renderColumnLayoutsInHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  applyColumnLayouts(tmp);
  return tmp.innerHTML;
}

function decorateCodeCopy(contentEl: HTMLElement, t: (k: string) => string) {
  const copyLabel = t("doc.code_copy") || "Copy";
  const copiedLabel = t("doc.code_copied") || "Copied!";
  contentEl.querySelectorAll("pre").forEach(pre => {
    const code = pre.querySelector("code");
    if (!code || pre.querySelector(".ld-code-copy")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ld-code-copy";
    btn.title = copyLabel;
    btn.setAttribute("aria-label", copyLabel);
    btn.innerHTML = COPY_SVG;
    btn.addEventListener("click", async e => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(code.innerText);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = code.innerText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch {}
        document.body.removeChild(ta);
      }
      btn.classList.add("ld-copied");
      btn.title = copiedLabel;
      btn.innerHTML = CHECK_SVG;
      setTimeout(() => {
        btn.classList.remove("ld-copied");
        btn.title = copyLabel;
        btn.innerHTML = COPY_SVG;
      }, 1500);
    });
    pre.appendChild(btn);
  });
}

function applyBlockquoteStyles(contentEl: HTMLElement, content: string) {
  const attrs = collectBlockquoteAttributesFromSource(typeof content === "string" ? content : "");
  // Exclude blockquotes inside compare render blocks — those are handled by applyCompareBlockStyles.
  const blockquotes = Array.from(contentEl.querySelectorAll("blockquote")).filter(
    (bq) => !bq.closest(".ld-compare-render"),
  );
  blockquotes.forEach((bq, i) => {
    const a = attrs[i];
    if (!a || (!a.type && !a.title && !a.icon)) return;

    bq.classList.add("ld-callout");
    if (a.type) bq.classList.add(`ld-callout-${a.type}`);

    const hasIcon  = a.icon;
    const hasTitle = typeof a.title === "string" && a.title.trim() !== "";

    if (hasIcon && !hasTitle) {
      // Icon only → prepend inline before the first paragraph's text
      const firstP = bq.querySelector("p");
      const iconSpan = document.createElement("span");
      iconSpan.className = "ld-callout-icon ld-callout-icon-inline";
      iconSpan.innerHTML = getCalloutIcon(a.type);
      if (firstP) {
        firstP.insertBefore(iconSpan, firstP.firstChild);
      } else {
        bq.insertBefore(iconSpan, bq.firstChild);
      }
      return;
    }

    if (!hasIcon && !hasTitle) return;

    // Icon + title, or title only → dedicated header row
    const header = document.createElement("div");
    header.className = "ld-callout-header";

    if (hasIcon) {
      const iconSpan = document.createElement("span");
      iconSpan.className = "ld-callout-icon";
      iconSpan.innerHTML = getCalloutIcon(a.type);
      header.appendChild(iconSpan);
    }

    if (hasTitle) {
      const titleSpan = document.createElement("span");
      titleSpan.className = "ld-callout-title";
      titleSpan.textContent = a.title!;
      header.appendChild(titleSpan);
    }

    bq.insertBefore(header, bq.firstChild);
  });
}

/**
 * Apply table and blockquote styles to each .ld-compare-render container
 * independently, using the raw Markdown source stored in data-compare-source.
 *
 * This is needed because the main applyTableStyles / applyBlockquoteStyles passes
 * exclude compare-render elements to keep their index-based source↔DOM mapping
 * correct for the rest of the document.
 */
function applyCompareBlockStyles(contentEl: HTMLElement) {
  contentEl
    .querySelectorAll<HTMLElement>(".ld-compare-render[data-compare-source]")
    .forEach((render) => {
      const encoded = render.dataset.compareSource ?? "";
      if (!encoded) return;
      const compareSource = decodeURIComponent(encoded);

      // ── Tables ──────────────────────────────────────────────────────────────
      const tableAttrs = collectTableAttributesFromSource(compareSource);
      render.querySelectorAll("table").forEach((table, i) => {
        const a = tableAttrs[i];
        if (!a) return;
        const t = table as HTMLElement;
        if (a.style) { t.classList.add(`table-style-${a.style}`); t.dataset.tableStyle = a.style; }
        if (a.border) { t.classList.add(`table-border-${a.border}`); t.dataset.tableBorder = a.border; }
        if (a.color) { t.classList.add(`table-color-${a.color}`); t.dataset.tableColor = a.color; }
      });

      // ── Blockquotes ─────────────────────────────────────────────────────────
      const bqAttrs = collectBlockquoteAttributesFromSource(compareSource);
      render.querySelectorAll("blockquote").forEach((bq, i) => {
        const a = bqAttrs[i];
        if (!a || (!a.type && !a.title && !a.icon)) return;
        bq.classList.add("ld-callout");
        if (a.type) bq.classList.add(`ld-callout-${a.type}`);
        const hasIcon  = a.icon;
        const hasTitle = typeof a.title === "string" && a.title.trim() !== "";
        if (hasIcon && !hasTitle) {
          const firstP = bq.querySelector("p");
          const iconSpan = document.createElement("span");
          iconSpan.className = "ld-callout-icon ld-callout-icon-inline";
          iconSpan.innerHTML = getCalloutIcon(a.type);
          if (firstP) firstP.insertBefore(iconSpan, firstP.firstChild);
          else bq.insertBefore(iconSpan, bq.firstChild);
          return;
        }
        if (!hasIcon && !hasTitle) return;
        const header = document.createElement("div");
        header.className = "ld-callout-header";
        if (hasIcon) {
          const iconSpan = document.createElement("span");
          iconSpan.className = "ld-callout-icon";
          iconSpan.innerHTML = getCalloutIcon(a.type);
          header.appendChild(iconSpan);
        }
        if (hasTitle) {
          const titleSpan = document.createElement("span");
          titleSpan.className = "ld-callout-title";
          titleSpan.textContent = a.title!;
          header.appendChild(titleSpan);
        }
        bq.insertBefore(header, bq.firstChild);
      });
    });
}

function decorateCollapsible(contentEl: HTMLElement, maxHeight: number, t: (k: string) => string) {
  if (typeof maxHeight !== "number" || maxHeight <= 0) return;
  const more = t("doc.code_show_more") || "▾ Show more";
  const less = t("doc.code_show_less") || "▴ Show less";
  contentEl.querySelectorAll("pre").forEach(pre => {
    if (!pre.querySelector("code")) return;
    if (pre.scrollHeight <= maxHeight + 8) return;
    pre.classList.add("ld-collapsible");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ld-code-toggle";
    btn.textContent = more;
    btn.addEventListener("click", e => {
      e.preventDefault();
      const expanded = pre.classList.toggle("ld-expanded");
      btn.textContent = expanded ? less : more;
    });
    pre.appendChild(btn);
  });
}
