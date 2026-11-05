import { parseImageComments, type ImageAlign, type ImageAttrs, type ImageWidth } from "../../../../lib/contentAnnotations";

export { imageWidthClass } from "../../../../lib/contentAnnotations";
export type { ImageAlign, ImageAttrs, ImageWidth };

const COMMENT = "<!--\\s*image-(?:width|align):\\s*[^\\n]+?\\s*-->";
const PREFIX = `(?:${COMMENT}\\n+){0,2}`;
const IMAGE = "!\\[[^\\]\\n]*\\]\\([^\\n)]+\\)";

export function imageBlockSource(): string {
  return PREFIX + IMAGE;
}

export function parseImageAttributesFromMarkdown(markdown: string): ImageAttrs {
  const text = typeof markdown === "string" ? markdown.trim() : "";
  const prefix = text.match(new RegExp(`^${PREFIX}`))?.[0] || "";
  return parseImageComments(prefix);
}

export function buildImageAttributesPrefix(attrs: {
  width?: string;
  align?: string;
}): string {
  const normalized = parseImageComments(
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
  for (const match of stripped.matchAll(re)) {
    attrs.push(parseImageComments(match[1] || ""));
  }
  return attrs;
}
