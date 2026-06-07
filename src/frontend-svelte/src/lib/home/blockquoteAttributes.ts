export interface BlockquoteAttrs {
  type: string | null;
  title: string | null;
  icon: boolean;
}

/** Maps alias types to their canonical form used in the select. */
const TYPE_ALIASES: Record<string, string> = {
  note: "info",
  tip: "success",
  caution: "warning",
  danger: "error",
};

const ALLOWED_TYPES = new Set([
  "info", "success", "warning", "error",
  ...Object.keys(TYPE_ALIASES),
]);

function canonicalType(val: string): string {
  return TYPE_ALIASES[val] ?? val;
}

const COMMENT_TYPE_RE  = /^<!--\s*quote-type:\s*([a-z][a-z0-9_-]*)\s*-->$/;
const COMMENT_TITLE_RE = /^<!--\s*quote-title:\s*(.+?)\s*-->$/;
const COMMENT_ICON_RE  = /^<!--\s*quote-icon\s*-->$/;

// ── Regex source for the full blockquote block (prefix + body) ──────────────
// Used by inlineSnippetEdit to capture prefix comments + blockquote lines.
const BQ_COMMENT = "<!--\\s*quote-(?:type|title|icon)[^\\n]*-->";
const BQ_PREFIX  = "(?:" + BQ_COMMENT + "\\n+){0,3}";
const BQ_BODY    = ">[ \\t][^\\n]*(?:\\n[ \\t]*>.*)*";

/** Returns a regex source string matching a full (optionally prefixed) blockquote block. */
export function blockquoteBlockSource(): string {
  return BQ_PREFIX + BQ_BODY;
}

/**
 * Scan markdown source and return one BlockquoteAttrs per top-level blockquote,
 * in document order (same index as querySelectorAll("blockquote")).
 *
 * Prefixed blockquotes carry { type, title, icon }.
 * Plain blockquotes get { type: null, title: null, icon: false }.
 */
export function collectBlockquoteAttributesFromSource(source: string): BlockquoteAttrs[] {
  if (typeof source !== "string") return [];

  const attrs: BlockquoteAttrs[] = [];
  const lines = source.split("\n");

  let pendingType:  string | null = null;
  let pendingTitle: string | null = null;
  let pendingIcon = false;
  let inBlockquote = false;

  // Fenced-code-block tracking: skip lines inside ``` or ~~~ fences so that
  // `> ` lines or quote-* comments inside code blocks are not parsed as
  // real blockquotes.
  let inFencedCode = false;
  let fenceChar = "";
  let fenceLen = 0;
  let inCompareBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Detect :::compare … ::: directive blocks (skip inner content)
    if (/^:::compare[ \t]*$/.test(line)) {
      inCompareBlock = true;
      inBlockquote = false;
      pendingType = null; pendingTitle = null; pendingIcon = false;
      continue;
    }
    if (inCompareBlock) {
      if (/^:::[ \t]*$/.test(line)) inCompareBlock = false;
      continue;
    }

    // Detect opening / closing fence
    const fenceMatch = /^(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const ch  = fenceMatch[1][0];
      const len = fenceMatch[1].length;
      if (!inFencedCode) {
        inFencedCode = true;
        fenceChar = ch;
        fenceLen  = len;
        // Entering a code block resets any pending quote prefix that may have
        // accumulated (edge case: comment immediately before a code fence).
        inBlockquote = false;
        pendingType = null; pendingTitle = null; pendingIcon = false;
        continue;
      } else if (ch === fenceChar && len >= fenceLen && /^[`~]+[ \t]*$/.test(line)) {
        inFencedCode = false;
        fenceChar = ""; fenceLen = 0;
        continue;
      }
    }
    if (inFencedCode) continue;

    const typeMatch = line.match(COMMENT_TYPE_RE);
    if (typeMatch) {
      const val = typeMatch[1];
      pendingType = ALLOWED_TYPES.has(val) ? canonicalType(val) : null;
      continue;
    }

    const titleMatch = line.match(COMMENT_TITLE_RE);
    if (titleMatch) { pendingTitle = titleMatch[1]; continue; }

    if (COMMENT_ICON_RE.test(line)) { pendingIcon = true; continue; }

    if (line.startsWith(">")) {
      if (!inBlockquote) {
        attrs.push({ type: pendingType, title: pendingTitle, icon: pendingIcon });
        pendingType  = null;
        pendingTitle = null;
        pendingIcon  = false;
        inBlockquote = true;
      }
      continue;
    }

    inBlockquote = false;
    if (line.trim() !== "") {
      pendingType  = null;
      pendingTitle = null;
      pendingIcon  = false;
    }
  }

  return attrs;
}

const ICONS: Record<string, string> = {
  info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
  success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
  warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
  error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>',
};

export function getCalloutIcon(type: string | null): string {
  return ICONS[canonicalType(type ?? "")] ?? ICONS["info"];
}
