import { parseCalloutType } from "../../../../lib/contentAnnotations";

export { getCalloutIcon } from "../../../../lib/contentAnnotations";

export interface BlockquoteAttrs {
  type: string | null;
  title: string | null;
  icon: boolean;
}

const COMMENT_TYPE_RE = /^<!--\s*quote-type:\s*([a-z][a-z0-9_-]*)\s*-->$/;
const COMMENT_TITLE_RE = /^<!--\s*quote-title:\s*(.+?)\s*-->$/;
const COMMENT_ICON_RE = /^<!--\s*quote-icon\s*-->$/;

// ── Regex source for the full blockquote block (prefix + body) ──────────────
// Used by inlineSnippetEdit to capture prefix comments + blockquote lines.
const BQ_COMMENT = "<!--\\s*quote-(?:type|title|icon)[^\\n]*-->";
const BQ_PREFIX = `(?:${BQ_COMMENT}\\n+){0,3}`;
const BQ_BODY = ">[ \\t][^\\n]*(?:\\n[ \\t]*>.*)*";

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
export function collectBlockquoteAttributesFromSource(
  source: string,
): BlockquoteAttrs[] {
  if (typeof source !== "string") return [];

  const attrs: BlockquoteAttrs[] = [];
  const lines = source.split("\n");

  let pendingType: string | null = null;
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
      pendingType = null;
      pendingTitle = null;
      pendingIcon = false;
      continue;
    }
    if (inCompareBlock) {
      if (/^:::[ \t]*$/.test(line)) inCompareBlock = false;
      continue;
    }

    // Detect opening / closing fence
    const fenceMatch = /^(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const ch = fenceMatch[1][0];
      const len = fenceMatch[1].length;
      if (!inFencedCode) {
        inFencedCode = true;
        fenceChar = ch;
        fenceLen = len;
        // Entering a code block resets any pending quote prefix that may have
        // accumulated (edge case: comment immediately before a code fence).
        inBlockquote = false;
        pendingType = null;
        pendingTitle = null;
        pendingIcon = false;
        continue;
      } else if (
        ch === fenceChar &&
        len >= fenceLen &&
        /^[`~]+[ \t]*$/.test(line)
      ) {
        inFencedCode = false;
        fenceChar = "";
        fenceLen = 0;
        continue;
      }
    }
    if (inFencedCode) continue;

    const typeMatch = line.match(COMMENT_TYPE_RE);
    if (typeMatch) {
      const val = typeMatch[1];
      pendingType = parseCalloutType(val);
      continue;
    }

    const titleMatch = line.match(COMMENT_TITLE_RE);
    if (titleMatch) {
      pendingTitle = titleMatch[1];
      continue;
    }

    if (COMMENT_ICON_RE.test(line)) {
      pendingIcon = true;
      continue;
    }

    if (line.startsWith(">")) {
      if (!inBlockquote) {
        attrs.push({
          type: pendingType,
          title: pendingTitle,
          icon: pendingIcon,
        });
        pendingType = null;
        pendingTitle = null;
        pendingIcon = false;
        inBlockquote = true;
      }
      continue;
    }

    inBlockquote = false;
    if (line.trim() !== "") {
      pendingType = null;
      pendingTitle = null;
      pendingIcon = false;
    }
  }

  return attrs;
}
