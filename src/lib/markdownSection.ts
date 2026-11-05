import { lexMarkdown } from "./summaryMarkdown";

export interface MarkdownSection { start: number; end: number }

export function markdownBodyStart(content: string): number {
  return content.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0].length ?? 0;
}

/** File offsets, preserving CRLF and whitespace; only structural headings split sections. */
export function markdownSectionAtLine(content: string, line: number): MarkdownSection | null {
  const starts = [0];
  for (let i = 0; i < content.length; i++) if (content[i] === "\n") starts.push(i + 1);
  if (!Number.isInteger(line) || line < 1 || line > starts.length) return null;
  const bodyStart = markdownBodyStart(content);
  const position = starts[line - 1];
  if (position < bodyStart) return null;
  const source = content.slice(bodyStart).replace(/\r\n/g, "\n")
    // Match the viewer: headings inside a comparison are examples, not sections.
    .replace(/^:::compare[ \t]*\n[\s\S]*?^:::[ \t]*$/gm,
      block => `<!--compare${"\n".repeat(block.split("\n").length - 1)}-->`);
  const headings: { start: number; depth: number }[] = [];
  let cursor = 0;
  const bodyLine = content.slice(0, bodyStart).split("\n").length - 1;
  for (const token of lexMarkdown(source)) {
    if (!token.raw) continue;
    const at = source.indexOf(token.raw, cursor);
    if (at < 0) continue;
    if (token.type === "heading") {
      const index = bodyLine + source.slice(0, at).split("\n").length - 1;
      headings.push({ start: starts[index], depth: token.depth });
    }
    cursor = at + token.raw.length;
  }
  let selected = -1;
  for (let i = 0; i < headings.length; i++) if (headings[i].start <= position) selected = i;
  if (selected < 0) return { start: bodyStart, end: headings[0]?.start ?? content.length };
  const heading = headings[selected];
  const next = headings.slice(selected + 1).find(h => h.depth <= heading.depth);
  return { start: heading.start, end: next?.start ?? content.length };
}

export function replaceMarkdownSection(content: string, range: MarkdownSection, text: string): string {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  let replacement = text.replace(/\r\n|\n/g, newline);
  // Keep the next heading a separate block even if the user removes trailing blank lines.
  if (replacement && range.end < content.length) replacement = replacement.trimEnd() + newline + newline;
  return content.slice(0, range.start) + replacement + content.slice(range.end);
}

/** Offsets of whole file lines (1-based, inclusive), without the line ending of the last one. */
export function markdownLinesRange(content: string, first: number, last: number): MarkdownSection | null {
  const lines = content.split("\n");
  if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last < first || last > lines.length) return null;
  const start = lines.slice(0, first - 1).join("\n").length + (first > 1 ? 1 : 0);
  const end = start + lines.slice(first - 1, last).join("\n").length;
  return { start, end: content[end - 1] === "\r" ? end - 1 : end };
}

/** Unlike a section, these lines keep whatever surrounds them. */
export function replaceMarkdownLines(content: string, range: MarkdownSection, text: string): string {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  return content.slice(0, range.start) + text.replace(/\r\n|\n/g, newline) + content.slice(range.end);
}

/** Removes the lines and one separation, so that what they separated stays separated. */
export function removeMarkdownLines(content: string, range: MarkdownSection): string {
  const before = content.slice(0, range.start);
  const after = content.slice(range.end);
  const blankBefore = before === "" || /\n\r?\n$/.test(before);
  if (!blankBefore) return before + after.replace(/^\r?\n/, "");
  const rest = after.replace(/^(?:\r?\n)+/, "");
  return rest ? before + rest : before.replace(/(\r?\n)(?:\r?\n)+$/, "$1");
}
