/**
 * Tags each top-level rendered block with the file lines it comes from
 * (`data-source-lines="start-end"`, 1-based), so the viewer can map a selection
 * back to the Markdown source (history of a selection).
 *
 * Two phases around the normal render:
 *   1. before parsing, a standalone `<!--ld-src:start-end-->` comment line is put in
 *      front of each top-level token: marked passes HTML comments through verbatim;
 *   2. after rendering, each marker becomes an attribute of the element that follows it.
 *      Markers left without an element (footnote definitions, link definitions) are dropped.
 */

import type { Token } from "marked";

const MARKER_PREFIX = "ld-src:";
const ATTACH_RE = new RegExp(`<!--${MARKER_PREFIX}(\\d+)-(\\d+)-->\\s*(<[A-Za-z][\\w-]*)`, "g");
const LEFTOVER_RE = new RegExp(`<!--${MARKER_PREFIX}\\d+-\\d+-->\\n?`, "g");

const countNewlines = (text: string): number => text.split("\n").length - 1;

/** `source` must use LF line endings, as marked's lexer does. `lineOffset` = lines before `source` in the file. */
export function injectSourceLineMarkers(source: string, tokens: Token[], lineOffset: number): string {
  const parts: string[] = [];
  let cursor = 0;
  let line = lineOffset + 1;
  for (const token of tokens) {
    if (token.type === "space" || !token.raw) continue;
    const position = source.indexOf(token.raw, cursor);
    if (position === -1) continue;
    const atLineStart = position === 0 || source[position - 1] === "\n";
    const chunk = source.slice(cursor, position);
    line += countNewlines(chunk);
    parts.push(chunk);
    if (atLineStart) {
      const end = line + countNewlines(token.raw.trimEnd());
      parts.push(`<!--${MARKER_PREFIX}${line}-${end}-->\n`);
    }
    parts.push(token.raw);
    line += countNewlines(token.raw);
    cursor = position + token.raw.length;
  }
  parts.push(source.slice(cursor));
  return parts.join("");
}

export function attachSourceLineMarkers(html: string): string {
  return html
    .replace(ATTACH_RE, (_, start: string, end: string, openTag: string) => `${openTag} data-source-lines="${start}-${end}"`)
    .replace(LEFTOVER_RE, "");
}
