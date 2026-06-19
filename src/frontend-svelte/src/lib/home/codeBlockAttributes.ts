export type CodeBlockWidth = "full" | "3/4" | "2/3" | "1/2" | "1/3" | "1/4";
export type CodeBlockAlign = "left" | "center" | "right";
export type CodeBlockKind = "code" | "mermaid";

export interface CodeBlockAttrs {
  kind: CodeBlockKind;
  width: CodeBlockWidth | null;
  align: CodeBlockAlign | null;
}

const ALLOWED_WIDTHS = new Set<CodeBlockWidth>(["full", "3/4", "2/3", "1/2", "1/3", "1/4"]);
const ALLOWED_ALIGNS = new Set<CodeBlockAlign>(["left", "center", "right"]);
const COMMENT_LINE = "[ \\t]*<!--\\s*(?:code|mermaid)-(?:width|align):\\s*[^\\n]+?\\s*-->[ \\t]*\\n";
const FENCED_BLOCK = "[ \\t]*```[^\\n]*\\n[\\s\\S]*?^[ \\t]*```[ \\t]*";

export function codeBlockSource(): string {
  return `(?:${COMMENT_LINE}){0,2}${FENCED_BLOCK}`;
}

export function codeBlockKindForLanguage(language: string): CodeBlockKind {
  return language.trim().toLowerCase() === "mermaid" ? "mermaid" : "code";
}

function stripLineIndent(markdown: string, indent: string): string {
  if (!indent) return markdown;
  return markdown
    .split("\n")
    .map((line) => line.startsWith(indent) ? line.slice(indent.length) : line)
    .join("\n");
}

export function normalizeCodeBlockMarkdown(markdown: string, indent = ""): string {
  return stripLineIndent(markdown.trimEnd(), indent).trim();
}

export function stripCodeBlockAttributesPrefix(markdown: string): string {
  return markdown.replace(
    /^(?:[ \t]*<!--\s*(?:code|mermaid)-(?:width|align):\s*[^\n]+?\s*-->[ \t]*\n){0,2}/,
    "",
  );
}

export function parseCodeBlockAttributesFromMarkdown(markdown: string): CodeBlockAttrs {
  const normalized = markdown.trim();
  const body = stripCodeBlockAttributesPrefix(normalized);
  const language = body.match(/^```[ \t]*([^\n]*)/)?.[1] ?? "";
  const kind = codeBlockKindForLanguage(language);
  let width: CodeBlockWidth | null = null;
  let align: CodeBlockAlign | null = null;
  const re = /<!--\s*(code|mermaid)-(width|align):\s*([^\s]+)\s*-->/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(normalized))) {
    const [, commentKind, attribute, value] = match;
    if (commentKind !== kind) continue;
    if (attribute === "width" && ALLOWED_WIDTHS.has(value as CodeBlockWidth)) {
      width = value as CodeBlockWidth;
    }
    if (attribute === "align" && ALLOWED_ALIGNS.has(value as CodeBlockAlign)) {
      align = value as CodeBlockAlign;
    }
  }
  return { kind, width, align };
}

export function buildCodeBlockAttributesPrefix(attrs: {
  language?: string;
  width?: string;
  align?: string;
}): string {
  const kind = codeBlockKindForLanguage(attrs.language || "");
  const width = ALLOWED_WIDTHS.has(attrs.width as CodeBlockWidth)
    ? attrs.width as CodeBlockWidth
    : null;
  const align = ALLOWED_ALIGNS.has(attrs.align as CodeBlockAlign)
    ? attrs.align as CodeBlockAlign
    : null;
  const lines: string[] = [];
  if (width) lines.push(`<!-- ${kind}-width: ${width} -->`);
  if (align) lines.push(`<!-- ${kind}-align: ${align} -->`);
  return lines.join("\n");
}

function stripCompareBlocks(source: string): string {
  return source.replace(
    /^:::compare[ \t]*\n[\s\S]*?^:::[ \t]*$/gm,
    (match) => "\n".repeat((match.match(/\n/g) ?? []).length),
  );
}

export function collectCodeBlockAttributesFromSource(source: string): CodeBlockAttrs[] {
  if (typeof source !== "string") return [];
  const attrs: CodeBlockAttrs[] = [];
  const re = new RegExp(`^${codeBlockSource()}`, "gm");
  let match: RegExpExecArray | null;
  const stripped = stripCompareBlocks(source);
  while ((match = re.exec(stripped))) {
    attrs.push(parseCodeBlockAttributesFromMarkdown(match[0]));
    if (match[0].length === 0) re.lastIndex += 1;
  }
  return attrs;
}

export function codeBlockWidthClass(kind: CodeBlockKind, width: CodeBlockWidth): string {
  const suffix = {
    full: "full",
    "3/4": "three-quarters",
    "2/3": "two-thirds",
    "1/2": "half",
    "1/3": "third",
    "1/4": "quarter",
  }[width];
  return `ld-${kind}-width-${suffix}`;
}
