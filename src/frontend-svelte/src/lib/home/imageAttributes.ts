export type ImageWidth = "full" | "3/4" | "2/3" | "1/2" | "1/3" | "1/4";
export type ImageAlign = "left" | "center" | "right";

export interface ImageAttrs {
  width: ImageWidth | null;
  align: ImageAlign | null;
}

const ALLOWED_WIDTHS = new Set<ImageWidth>(["full", "3/4", "2/3", "1/2", "1/3", "1/4"]);
const ALLOWED_ALIGNS = new Set<ImageAlign>(["left", "center", "right"]);
const COMMENT = "<!--\\s*image-(?:width|align):\\s*[^\\n]+?\\s*-->";
const PREFIX = `(?:${COMMENT}\\n+){0,2}`;
const IMAGE = "!\\[[^\\]\\n]*\\]\\([^\\n)]+\\)";

export function imageBlockSource(): string {
  return PREFIX + IMAGE;
}

function parsePrefix(prefix: string): ImageAttrs {
  let width: ImageWidth | null = null;
  let align: ImageAlign | null = null;
  const re = /<!--\s*image-(width|align):\s*([^\s]+)\s*-->/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(prefix || ""))) {
    const [, kind, value] = match;
    if (kind === "width" && ALLOWED_WIDTHS.has(value as ImageWidth)) {
      width = value as ImageWidth;
    }
    if (kind === "align" && ALLOWED_ALIGNS.has(value as ImageAlign)) {
      align = value as ImageAlign;
    }
  }
  return { width, align };
}

export function parseImageAttributesFromMarkdown(markdown: string): ImageAttrs {
  const text = typeof markdown === "string" ? markdown.trim() : "";
  const prefix = text.match(new RegExp(`^${PREFIX}`))?.[0] || "";
  return parsePrefix(prefix);
}

export function buildImageAttributesPrefix(attrs: {
  width?: string;
  align?: string;
}): string {
  const normalized = parsePrefix(
    [
      attrs.width ? `<!-- image-width: ${attrs.width} -->` : "",
      attrs.align ? `<!-- image-align: ${attrs.align} -->` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const lines: string[] = [];
  if (normalized.width) lines.push(`<!-- image-width: ${normalized.width} -->`);
  if (normalized.align) lines.push(`<!-- image-align: ${normalized.align} -->`);
  return lines.join("\n");
}

function stripNonRenderedBlocks(source: string): string {
  let result = source.replace(
    /^(`{3,}|~{3,})[^\n]*$([\s\S]*?)^\1[ \t]*$/gm,
    (match) => "\n".repeat((match.match(/\n/g) ?? []).length),
  );
  result = result.replace(
    /^:::compare[ \t]*\n([\s\S]*?)^:::[ \t]*$/gm,
    (match) => "\n".repeat((match.match(/\n/g) ?? []).length),
  );
  return result;
}

export function collectImageAttributesFromSource(source: string): ImageAttrs[] {
  if (typeof source !== "string") return [];
  const stripped = stripNonRenderedBlocks(source);
  const attrs: ImageAttrs[] = [];
  const re = new RegExp(`(${PREFIX})(${IMAGE})`, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(stripped))) {
    attrs.push(parsePrefix(match[1] || ""));
  }
  return attrs;
}

export function imageWidthClass(width: ImageWidth): string {
  return {
    full: "ld-image-width-full",
    "3/4": "ld-image-width-three-quarters",
    "2/3": "ld-image-width-two-thirds",
    "1/2": "ld-image-width-half",
    "1/3": "ld-image-width-third",
    "1/4": "ld-image-width-quarter",
  }[width];
}
