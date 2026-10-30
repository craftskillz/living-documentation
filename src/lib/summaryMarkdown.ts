import { marked, Marked, type MarkedExtension } from "marked";
import markedFootnote from "marked-footnote";
import en from "../frontend-svelte/public/i18n/en.json";

type MarkdownOptions = Parameters<typeof marked.parse>[1];
type FootnoteOptions = {
  prefixId?: string;
  description?: string;
  backRefLabel?: string;
};

// Consume whole tags (including quoted attributes) and literal HTML regions so
// summary-shaped text inside comments, attributes or code is never rewritten.
const HTML_PARTS = /<!--[\s\S]*?(?:-->|$)|<(pre|code|script|style|textarea)\b(?:"[^"]*"|'[^']*'|[^'">])*?>[\s\S]*?(?:<\/\1\s*>|$)|(<summary\b(?:"[^"]*"|'[^']*'|[^'">])*?>)([\s\S]*?)(<\/summary\s*>)|<\/?[a-z][a-z0-9-]*\b(?:"[^"]*"|'[^']*'|[^'">])*?>/gi;

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

/** Render footnotes and summary labels with optional ATX heading syntax.
 * Summary rewriting only changes raw HTML tokens; code examples stay literal.
 */
export function renderMarkdownWithSummaries(
  source: string,
  options: MarkdownOptions = {},
  footnoteOptions: FootnoteOptions = {},
): string {
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
  parser.use({
    walkTokens(token) {
      if (token.type === "html") token.text = renderSummaries(token.text, resolvedOptions);
    },
  });
  return parser.parse(source, { ...options, async: false }) as string;
}
