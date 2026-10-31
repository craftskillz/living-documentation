import { marked, Marked, type MarkedExtension, type Token } from "marked";
import markedFootnote from "marked-footnote";
import en from "../frontend-svelte/public/i18n/en.json";
import { LONE_TAG_SOURCE } from "../shared/tagName";

type MarkdownOptions = Parameters<typeof marked.parse>[1];
type FootnoteOptions = {
  prefixId?: string;
  description?: string;
  backRefLabel?: string;
};

type RenderOptions = FootnoteOptions & { tagMarkers?: boolean };

// HTML comments and raw code-like regions: never rewritten (group 1 = tag name).
const LITERAL_REGIONS = /<!--[\s\S]*?(?:-->|$)|<(pre|code|script|style|textarea)\b(?:"[^"]*"|'[^']*'|[^'">])*?>[\s\S]*?(?:<\/\1\s*>|$)/;

export const TAG_MARKER_CLASS = "ld-tag-marker";
export const TAG_MARKER_GLYPH = "b";
const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
// Literal regions are skipped; the last alternative is a lone `<name free text>`.
const MARKER_PARTS = new RegExp(`${LITERAL_REGIONS.source}|${LONE_TAG_SOURCE}`, "gi");
// Free text that is not valid HTML (accents, quotes) reaches marked as plain text.
const INLINE_LONE_TAG = new RegExp(`^${LONE_TAG_SOURCE}`, "i");

const escapeAttribute = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function isMarkerTag(name: string, source: string): boolean {
  return !VOID_ELEMENTS.has(name.toLowerCase()) && !new RegExp(`</${name}\\s*>`, "i").test(source);
}

function markerHtml(name: string, text = ""): string {
  const tag = text ? `<${name} ${text}>` : `<${name}>`;
  return `<mark class="${TAG_MARKER_CLASS}" title="${escapeAttribute(tag)}" data-tag="${name}">${TAG_MARKER_GLYPH}</mark>`;
}

function renderTagMarkers(html: string, source: string): string {
  return html.replace(MARKER_PARTS, (original, literal, name, text) => {
    if (literal || !name || !isMarkerTag(name, source)) return original;
    return markerHtml(name, text);
  });
}

function tagMarkerExtension(source: string): MarkedExtension {
  return {
    extensions: [{
      name: "tagMarker",
      level: "inline",
      start: (src) => src.indexOf("<"),
      tokenizer(src) {
        const match = INLINE_LONE_TAG.exec(src);
        if (!match || !isMarkerTag(match[1], source)) return undefined;
        return { type: "tagMarker", raw: match[0], name: match[1], text: match[2] ?? "" };
      },
      renderer: (token) => markerHtml(token.name, token.text),
    }],
  };
}

// Consume whole tags (including quoted attributes) and literal HTML regions so
// summary-shaped text inside comments, attributes or code is never rewritten.
const HTML_PARTS = new RegExp(`${LITERAL_REGIONS.source}|(<summary\\b(?:"[^"]*"|'[^']*'|[^'">])*?>)([\\s\\S]*?)(<\\/summary\\s*>)|<\\/?[a-z][a-z0-9-]*\\b(?:"[^"]*"|'[^']*'|[^'">])*?>`, "gi");

function renderSummaries(html: string, options: MarkdownOptions): string {
  return html.replace(HTML_PARTS, (original, literal, opening, content, closing) => {
    if (literal || !opening) return original;
    const text = content.trim();
    const heading = /^(#{1,6})(?:[ \t]+(.*)|$)$/.exec(text);
    if (heading) {
      const level = heading[1].length;
      const title = (heading[2] ?? "").replace(/[ \t]+#+[ \t]*$/, "");
      return `${opening}<h${level} style="display: inline; margin: 0">${marked.parseInline(title, options)}</h${level}>${closing}`;
    }
    return `${opening}${marked.parseInline(content, options)}${closing}`;
  });
}

function createParser(
  source: string,
  options: MarkdownOptions,
  { tagMarkers = false, ...footnoteOptions }: RenderOptions,
): Marked {
  const resolvedOptions = { ...marked.defaults, ...options };
  // Each render owns its extension state, including numbering and definitions.
  const footnotes = markedFootnote({
    prefixId: "ld-fn-",
    description: en["footnotes.title"],
    backRefLabel: en["footnotes.back"],
    headingClass: "ld-footnotes-label",
    ...footnoteOptions,
  });
  // marked-footnote declares ESM types; the server resolves Marked's CJS types.
  // Both describe Marked 12, but its private members make those types nominally
  // incompatible. Keep this bridge at the extension boundary.
  const parser = new Marked(footnotes as unknown as MarkedExtension);
  if (tagMarkers) parser.use(tagMarkerExtension(source));
  parser.use({
    walkTokens(token) {
      if (token.type !== "html") return;
      // Markers first: summary rewriting emits generated tags (<strong>) that are not user tags.
      const text = tagMarkers ? renderTagMarkers(token.text, source) : token.text;
      token.text = renderSummaries(text, resolvedOptions);
    },
  });
  return parser;
}

/** Top-level tokens as the renderer sees them (same extensions), from a throwaway parser. */
export function lexMarkdown(source: string, options: MarkdownOptions = {}): Token[] {
  return createParser(source, options, {}).lexer(source, { ...options, async: false });
}

/** Render footnotes and summary labels with optional ATX heading syntax.
 * Summary rewriting only changes raw HTML tokens; code examples stay literal.
 */
export function renderMarkdownWithSummaries(
  source: string,
  options: MarkdownOptions = {},
  renderOptions: RenderOptions = {},
): string {
  return createParser(source, options, renderOptions).parse(source, { ...options, async: false }) as string;
}
