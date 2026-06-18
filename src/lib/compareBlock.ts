/**
 * Renders :::compare … ::: directive blocks.
 *
 * Using ::: (colon-fence) instead of backtick fences avoids conflicts when the compare
 * block's content itself contains fenced code blocks (```lang … ```).
 *
 * A compare block contains raw Markdown. For each block we:
 *   1. Render its inner Markdown with marked (same options as the parent document)
 *   2. Produce a <div class="ld-compare"> with two columns:
 *      - ld-compare-source : the raw Markdown in a <pre><code> (highlighted client-side by hljs)
 *      - ld-compare-render : the rendered HTML, ready for wireContent.ts to apply table/blockquote styles
 *   3. Embed the raw source in data-compare-source (URI-encoded) so wireContent.ts can apply
 *      table colors, callout icons etc. independently for each compare block.
 *
 * IMPORTANT — why we cannot inject the rendered HTML before the outer marked.parse():
 *   The rendered <pre><code> may contain blank lines (e.g. a code sample with a blank line
 *   between two functions). CommonMark terminates an HTML block at the first blank line, so
 *   marked would stop treating our <div> as raw HTML at that blank line and re-parse the rest
 *   of the document as Markdown — corrupting everything after the blank line.
 *
 *   To avoid this we use a two-phase approach: each :::compare block is replaced by a single
 *   HTML-comment placeholder (which marked passes through untouched, and which contains no
 *   blank lines), the document is parsed, then the placeholders are swapped for the rendered
 *   compare <div>s afterwards.
 */

import { marked } from "marked";

function htmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const COMPARE_RE = /^:::compare[ \t]*\n([\s\S]*?)^:::[ \t]*$/gm;
const PLACEHOLDER_PREFIX = "LD_COMPARE_BLOCK_";

function renderCompareDiv(
  content: string,
  markedOpts: Parameters<typeof marked.parse>[1],
): string {
  // Strip a single trailing newline so marked doesn't add an extra <p></p>
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
}

/**
 * Parse a Markdown document that may contain :::compare blocks and return the final HTML.
 *
 * This replaces the old `marked.parse(preprocessCompareBlocks(source))` pattern: compare
 * blocks are rendered separately and stitched back in AFTER the outer parse, so their
 * (possibly blank-line-containing) rendered HTML never disturbs the outer Markdown parsing.
 */
export function renderMarkdownWithCompareBlocks(
  source: string,
  markedOpts: Parameters<typeof marked.parse>[1] = {},
): string {
  const blocks: string[] = [];

  const withPlaceholders = source.replace(COMPARE_RE, (_, content: string) => {
    const idx = blocks.length;
    blocks.push(renderCompareDiv(content, markedOpts));
    // A standalone HTML comment is an HTML block (no blank lines inside) that marked
    // passes through verbatim — safe to swap out after parsing.
    return `\n<!--${PLACEHOLDER_PREFIX}${idx}-->\n`;
  });

  let html = marked.parse(withPlaceholders, markedOpts) as string;

  // Swap placeholders back for the rendered compare <div>s. Tolerate marked wrapping the
  // comment in a <p>…</p> paragraph.
  html = html.replace(
    new RegExp(
      `(?:<p>\\s*)?<!--${PLACEHOLDER_PREFIX}(\\d+)-->(?:\\s*</p>)?`,
      "g",
    ),
    (_, i: string) => blocks[Number(i)] ?? "",
  );

  return html;
}
