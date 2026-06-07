/**
 * Preprocesses :::compare … ::: directive blocks before marked renders the full document.
 *
 * Using ::: (colon-fence) instead of backtick fences avoids conflicts when the compare
 * block's content itself contains fenced code blocks (```lang … ```).
 *
 * A compare block contains raw Markdown. The preprocessor:
 *   1. Renders it with marked (same options as the parent document)
 *   2. Produces a <div class="ld-compare"> with two columns:
 *      - ld-compare-source : the raw Markdown in a <pre><code> (highlighted client-side by hljs)
 *      - ld-compare-render : the rendered HTML, ready for wireContent.ts to apply table/blockquote styles
 *   3. Embeds the raw source in data-compare-source (URI-encoded) so wireContent.ts can apply
 *      table colors, callout icons etc. independently for each compare block.
 *
 * The outer marked.parse() call treats the resulting <div> as raw HTML pass-through.
 */

import { marked } from "marked";

function htmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function preprocessCompareBlocks(
  source: string,
  markedOpts: Parameters<typeof marked.parse>[1] = {},
): string {
  // Match :::compare … ::: directive blocks (opening/closing at line start)
  return source.replace(
    /^:::compare[ \t]*\n([\s\S]*?)^:::[ \t]*$/gm,
    (_, content: string) => {
      // Strip trailing newline so marked doesn't add an extra <p></p>
      const trimmed = content.endsWith("\n") ? content.slice(0, -1) : content;
      const renderedHtml = marked.parse(trimmed, markedOpts) as string;
      const escapedSource = htmlEscape(trimmed);
      // URI-encode so the raw Markdown is safely embedded in an HTML attribute value
      const encodedSource = encodeURIComponent(trimmed);
      return (
        '<div class="ld-compare">' +
        '<div class="ld-compare-source">' +
        `<pre><code class="language-markdown">${escapedSource}</code></pre>` +
        "</div>" +
        `<div class="ld-compare-render" data-compare-source="${encodedSource}">` +
        renderedHtml +
        "</div>" +
        "</div>"
      );
    },
  );
}
