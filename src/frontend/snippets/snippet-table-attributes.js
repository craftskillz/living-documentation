// ── Snippets — Table attributes ──────────────────────────────────────────────
// Shared parsing/building for table-style/table-border/table-color comments.
// Loaded as a classic script before snippet detection, documents and snippets.

const _LD_TABLE_ATTR_VALUE_SOURCE = "[a-z][a-z0-9_-]*";
const _LD_TABLE_ATTR_COMMENT_SOURCE =
  "<!--\\s*table-(?:style|border|color):\\s*" +
  _LD_TABLE_ATTR_VALUE_SOURCE +
  "\\s*-->";
const _LD_TABLE_ATTR_PREFIX_SOURCE =
  "(?:" + _LD_TABLE_ATTR_COMMENT_SOURCE + "\\n){0,3}";
const _LD_TABLE_START_SOURCE =
  "\\|[^\\n]*\\|\\n\\|[ \\t:|-]*-[ \\t:|-]*\\|";
const _LD_TABLE_BLOCK_SOURCE =
  _LD_TABLE_ATTR_PREFIX_SOURCE +
  "(?:\\|[^\\n]*\\|\\n)\\|[ \\t:|-]*-[ \\t:|-]*\\|(?:\\n\\|[^\\n]*\\|)*";

const _LD_ALLOWED_TABLE_STYLES = new Set(["compact", "striped"]);
const _LD_ALLOWED_TABLE_BORDERS = new Set(["bordered", "borderless"]);
const _LD_LEGACY_TABLE_BORDER_STYLES = new Set(["bordered", "borderless"]);
const _LD_ALLOWED_TABLE_COLORS = new Set([
  "info",
  "success",
  "warning",
  "danger",
  "note",
]);

function ldTableAttributePrefixSource() {
  return _LD_TABLE_ATTR_PREFIX_SOURCE;
}

function ldTableBlockSource() {
  return _LD_TABLE_BLOCK_SOURCE;
}

function ldParseMarkdownTableCells(line) {
  return line
    .trim()
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function ldIsMarkdownTableSeparatorLine(line) {
  const cells = ldParseMarkdownTableCells(line);
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, "")))
  );
}

function ldParseTableAttributesPrefix(prefix) {
  let style = null;
  let border = null;
  let color = null;
  const attrRe = /<!--\s*table-(style|border|color):\s*([a-z][a-z0-9_-]*)\s*-->/g;
  let match;
  while ((match = attrRe.exec(prefix || ""))) {
    const [, kind, value] = match;
    if (kind === "style" && _LD_ALLOWED_TABLE_STYLES.has(value)) {
      style = value;
    }
    if (kind === "style" && _LD_LEGACY_TABLE_BORDER_STYLES.has(value)) {
      border = value;
    }
    if (kind === "border" && _LD_ALLOWED_TABLE_BORDERS.has(value)) {
      border = value;
    }
    if (kind === "color" && _LD_ALLOWED_TABLE_COLORS.has(value)) {
      color = value;
    }
  }
  return { style, border, color };
}

function ldParseTableAttributesFromMarkdown(markdown) {
  const text = typeof markdown === "string" ? markdown.trim() : "";
  const prefixRe = new RegExp("^" + ldTableAttributePrefixSource());
  const prefix = text.match(prefixRe)?.[0] || "";
  return ldParseTableAttributesPrefix(prefix);
}

function ldCollectTableAttributesFromSource(source) {
  if (typeof source !== "string") return [];
  const attrs = [];
  const re = new RegExp(
    "(" + ldTableAttributePrefixSource() + ")(" + _LD_TABLE_START_SOURCE + ")",
    "g",
  );
  let match;
  while ((match = re.exec(source))) {
    attrs.push(ldParseTableAttributesPrefix(match[1] || ""));
  }
  return attrs;
}

function ldBuildTableAttributesPrefix(attrs) {
  const normalized = ldParseTableAttributesPrefix(
    [
      attrs?.style ? `<!-- table-style: ${attrs.style} -->` : "",
      attrs?.border ? `<!-- table-border: ${attrs.border} -->` : "",
      attrs?.color ? `<!-- table-color: ${attrs.color} -->` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const lines = [];
  if (normalized.style) lines.push(`<!-- table-style: ${normalized.style} -->`);
  if (normalized.border === "bordered") {
    lines.push("<!-- table-border: bordered -->");
  }
  if (normalized.color) lines.push(`<!-- table-color: ${normalized.color} -->`);
  return lines.join("\n");
}

function ldLooksLikeTableSnippet(markdown) {
  const text = typeof markdown === "string" ? markdown.trim() : "";
  const body = text.replace(new RegExp("^" + ldTableAttributePrefixSource()), "");
  const lines = body.split("\n").filter((line) => /^\|.*\|$/.test(line.trim()));
  return (
    lines.length >= 2 &&
    /^\|.*\|$/.test(lines[0].trim()) &&
    ldIsMarkdownTableSeparatorLine(lines[1])
  );
}
