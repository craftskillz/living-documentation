import { TAG_MARKER_CLASS } from "../../../../lib/summaryMarkdown";

/**
 * Turns a rendered paragraph or heading back into the Markdown it comes from.
 * Text is kept verbatim, so what marked would have rendered differently (escapes, entities)
 * does not match the source: the caller compares and falls back on the Markdown editor.
 */

/** The part of a DOM node needed here: an element of an iframe is not an instance of this window's classes. */
export interface BlockNode {
  nodeType: number;
  nodeName: string;
  nodeValue: string | null;
  childNodes: ArrayLike<BlockNode>;
  getAttribute?: (name: string) => string | null;
}

export interface BlockMarkdownOptions {
  /** With this setting, a single line ending renders as a line break. */
  softBreaks?: boolean;
}

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const HEADING_LEVELS: Record<string, number> = { h2: 2, h3: 3, h4: 4 };
// b, i and strike: Chromium's substitutes when replaced text holds a space.
const WRAPPERS: Record<string, string> = { strong: "**", b: "**", em: "*", i: "*", del: "~~", strike: "~~", code: "`" };
// Chromium's substitute for code. A source span or font never gets this far: it fails the comparison with the source.
const TRANSPARENT_ELEMENTS = new Set(["font", "span"]);
const HARD_BREAK = "  \n";
const FOOTNOTE_HREF_PREFIX = "#ld-fn-";
const FOOTNOTE_REF_ATTRIBUTE = "data-ld-fn-ref";
// structureHtml makes these two root-relative in a generated page.
const ROOT_DOC_LINK_RE = /^\/\?doc=/;
const ROOT_IMAGE_RE = /^\/(images(?:-ai)?\/)/;

function childrenMarkdown(node: BlockNode, options: BlockMarkdownOptions): string | null {
  let markdown = "";
  for (const child of Array.from(node.childNodes)) {
    const part = nodeMarkdown(child, options);
    if (part === null) return null;
    markdown += part;
  }
  return markdown;
}

function target(url: string, title: string | null): string {
  return title ? `(${url} "${title}")` : `(${url})`;
}

function footnoteMarkdown(sup: BlockNode): string | null {
  const [link] = Array.from(sup.childNodes);
  const href = link?.getAttribute?.("href");
  if (sup.childNodes.length !== 1 || link.getAttribute?.(FOOTNOTE_REF_ATTRIBUTE) == null || !href?.startsWith(FOOTNOTE_HREF_PREFIX)) return null;
  return `[^${href.slice(FOOTNOTE_HREF_PREFIX.length)}]`;
}

function elementMarkdown(element: BlockNode, options: BlockMarkdownOptions): string | null {
  const name = element.nodeName.toLowerCase();
  const attribute = (key: string) => element.getAttribute?.(key) ?? null;
  if (name in WRAPPERS) {
    const inner = childrenMarkdown(element, options);
    return inner ? WRAPPERS[name] + inner + WRAPPERS[name] : inner;
  }
  if (TRANSPARENT_ELEMENTS.has(name)) return childrenMarkdown(element, options);
  if (name === "br") return options.softBreaks ? "\n" : HARD_BREAK;
  if (name === "sup") return footnoteMarkdown(element);
  if (name === "mark") return attribute("class") === TAG_MARKER_CLASS ? attribute("title") : null;
  if (name === "img") return `![${attribute("alt") ?? ""}]${target((attribute("src") ?? "").replace(ROOT_IMAGE_RE, "$1"), attribute("title"))}`;
  if (name === "a") {
    const inner = childrenMarkdown(element, options);
    const href = attribute("href");
    if (inner === null || href === null) return null;
    if (inner === href) return href;
    return inner ? `[${inner}]${target(href.replace(ROOT_DOC_LINK_RE, "?doc="), attribute("title"))}` : "";
  }
  return null;
}

function nodeMarkdown(node: BlockNode, options: BlockMarkdownOptions): string | null {
  if (node.nodeType === TEXT_NODE) return node.nodeValue ?? "";
  return node.nodeType === ELEMENT_NODE ? elementMarkdown(node, options) : null;
}

/** Null for a block that is not a paragraph or a heading from h2 to h4, or that holds anything else than known inline Markdown. */
export function blockToMarkdown(block: BlockNode, options: BlockMarkdownOptions = {}): string | null {
  const name = block.nodeName.toLowerCase();
  const level = HEADING_LEVELS[name];
  if (name !== "p" && !level) return null;
  const inner = childrenMarkdown(block, options);
  if (inner === null) return null;
  return level ? `${"#".repeat(level)} ${inner}` : inner;
}

export function sameIgnoringWhitespace(a: string, b: string): boolean {
  return a.replace(/\s/g, "") === b.replace(/\s/g, "");
}
