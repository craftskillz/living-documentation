import type { TableAttrs } from "./types";

const VALUE = "[a-z][a-z0-9_-]*";
const COMMENT = `<!--\\s*table-(?:style|border|color):\\s*${VALUE}\\s*-->`;
// Allow one or more newlines after each comment so a blank line may separate the
// `<!-- table-* -->` comment block from the table itself (lenient authoring).
const PREFIX = `(?:${COMMENT}\\n+){0,3}`;
const TABLE_START = "\\|[^\\n]*\\|\\n\\|[ \\t:|-]*-[ \\t:|-]*\\|";

const TABLE_BLOCK =
  PREFIX +
  "(?:\\|[^\\n]*\\|\\n)\\|[ \\t:|-]*-[ \\t:|-]*\\|(?:\\n\\|[^\\n]*\\|)*";

export function tableBlockSource(): string {
  return TABLE_BLOCK;
}

const ALLOWED_STYLES = new Set(["compact", "striped"]);
const ALLOWED_BORDERS = new Set(["bordered", "borderless"]);
const LEGACY_BORDER_STYLES = new Set(["bordered", "borderless"]);
const ALLOWED_COLORS = new Set(["info", "success", "warning", "danger", "note"]);

function parsePrefix(prefix: string): TableAttrs {
  let style: string | null = null, border: string | null = null, color: string | null = null;
  const re = /<!--\s*table-(style|border|color):\s*([a-z][a-z0-9_-]*)\s*-->/g;
  for (const m of (prefix || "").matchAll(re)) {
    const [, kind, value] = m;
    if (kind === "style" && ALLOWED_STYLES.has(value)) style = value;
    if (kind === "style" && LEGACY_BORDER_STYLES.has(value)) border = value;
    if (kind === "border" && ALLOWED_BORDERS.has(value)) border = value;
    if (kind === "color" && ALLOWED_COLORS.has(value)) color = value;
  }
  return { style, border, color };
}

export function parseTableAttributesFromMarkdown(markdown: string): TableAttrs {
  const text = typeof markdown === "string" ? markdown.trim() : "";
  const prefixRe = new RegExp(`^${PREFIX}`);
  const prefix = text.match(prefixRe)?.[0] || "";
  return parsePrefix(prefix);
}

export function buildTableAttributesPrefix(attrs: {
  style?: string;
  border?: string;
  color?: string;
}): string {
  const normalized = parsePrefix(
    [
      attrs?.style ? `<!-- table-style: ${attrs.style} -->` : "",
      attrs?.border ? `<!-- table-border: ${attrs.border} -->` : "",
      attrs?.color ? `<!-- table-color: ${attrs.color} -->` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const lines: string[] = [];
  if (normalized.style) lines.push(`<!-- table-style: ${normalized.style} -->`);
  if (normalized.border === "bordered") lines.push("<!-- table-border: bordered -->");
  if (normalized.color) lines.push(`<!-- table-color: ${normalized.color} -->`);
  return lines.join("\n");
}

export function parseMarkdownTableCells(line: string): string[] {
  return line.trim().split("|").slice(1, -1).map((cell) => cell.trim());
}

export function isMarkdownTableSeparatorLine(line: string): boolean {
  const cells = parseMarkdownTableCells(line);
  return (
    cells.length > 0 &&
    // GFM allows a separator cell to be `:?-+:?` (one or more hyphens, optional
    // alignment colons) — e.g. `--:` for right-align. Requiring 3+ dashes wrongly
    // rejected such tables from inline-snippet detection.
    cells.every((cell) => /^:?-+:?$/.test(cell.replace(/\s+/g, "")))
  );
}

export function looksLikeTableSnippet(markdown: string): boolean {
  const text = typeof markdown === "string" ? markdown.trim() : "";
  const body = text.replace(new RegExp(`^${PREFIX}`), "");
  const lines = body.split("\n").filter((line) => /^\|.*\|$/.test(line.trim()));
  return (
    lines.length >= 2 &&
    /^\|.*\|$/.test(lines[0].trim()) &&
    isMarkdownTableSeparatorLine(lines[1])
  );
}

/**
 * Replace fenced code block content with blank lines so that table-like
 * patterns inside ``` ... ``` blocks are not mistaken for real tables.
 * Line count is preserved so character-offset-based callers stay correct.
 */
function stripFencedCodeBlocks(source: string): string {
  // Strip backtick/tilde fenced code blocks
  let result = source.replace(
    /^(`{3,})[^\n]*$([\s\S]*?)^\1[ \t]*$/gm,
    (match) => "\n".repeat((match.match(/\n/g) ?? []).length),
  );
  // Strip :::compare … ::: directive blocks (their inner tables are handled
  // separately by applyCompareBlockStyles, not by the main index-based pass)
  result = result.replace(
    /^:::compare[ \t]*\n([\s\S]*?)^:::[ \t]*$/gm,
    (match) => "\n".repeat((match.match(/\n/g) ?? []).length),
  );
  return result;
}

/**
 * Remove leading blockquote markers (`> `, including nested `> > `) from every
 * line so a table nested inside a blockquote — and its `<!-- table-* -->` prefix
 * comments, which are also `> `-prefixed — is detected the same as at top level.
 * Line order is preserved, so the Nth detected table still maps to the Nth
 * rendered <table> (querySelectorAll finds nested tables too).
 */
function stripBlockquoteMarkers(source: string): string {
  return source.replace(/^\s{0,3}(?:> ?)+/gm, "");
}

export function collectTableAttributesFromSource(source: string): TableAttrs[] {
  if (typeof source !== "string") return [];
  const stripped = stripFencedCodeBlocks(stripBlockquoteMarkers(source));
  const attrs: TableAttrs[] = [];
  const re = new RegExp(`(${PREFIX})(${TABLE_START})`, "g");
  for (const m of stripped.matchAll(re)) {
    attrs.push(parsePrefix(m[1] || ""));
  }
  return attrs;
}
