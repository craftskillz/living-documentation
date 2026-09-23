import { marked } from "marked";

type MarkdownOptions = Parameters<typeof marked.parse>[1];

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

/** Render summary labels as inline Markdown, with optional ATX heading syntax.
 * Only raw HTML tokens are changed: fenced/indented code and escaped examples
 * retain their normal Markdown rendering. Existing HTML labels stay supported.
 */
export function renderMarkdownWithSummaries(
  source: string,
  options: MarkdownOptions = {},
): string {
  // Unlike marked.parse, the low-level lexer/parser do not merge defaults
  // into a supplied options object (even {}). Keep GFM tables, etc. enabled.
  const resolvedOptions = { ...marked.defaults, ...options };
  const tokens = marked.lexer(source, resolvedOptions);
  marked.walkTokens(tokens, (token) => {
    if (token.type === "html") token.text = renderSummaries(token.text, resolvedOptions);
  });
  return marked.parser(tokens, resolvedOptions);
}
