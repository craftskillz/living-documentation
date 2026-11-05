import { test } from "node:test";
import assert from "node:assert/strict";
import { markdownLinesRange, markdownSectionAtLine, removeMarkdownLines, replaceMarkdownLines, replaceMarkdownSection } from "../../src/lib/markdownSection";

function section(source: string, text: string) {
  const line = source.slice(0, source.indexOf(text)).split("\n").length;
  const range = markdownSectionAtLine(source, line);
  assert.ok(range);
  return { range, text: source.slice(range.start, range.end) };
}

test("selects the closest heading, including descendants but excluding the next peer", () => {
  const source = "# Title\n\n## One\n\nAlpha\n\n### Child\n\nBeta\n\n## Two\n\nGamma\n";
  assert.equal(section(source, "Alpha").text, "## One\n\nAlpha\n\n### Child\n\nBeta\n\n");
  assert.equal(section(source, "Beta").text, "### Child\n\nBeta\n\n");
  assert.equal(section(source, "Gamma").text, "## Two\n\nGamma\n");
});

test("preserves frontmatter, CRLF, preamble and Setext headings", () => {
  const source = "---\r\ntitle: Example\r\n---\r\nIntro\r\n\r\nHeading\r\n-------\r\nBody\r\n\r\n## Next\r\nEnd";
  assert.equal(section(source, "Intro").text, "Intro\r\n\r\n");
  const { range, text } = section(source, "Body");
  assert.equal(text, "Heading\r\n-------\r\nBody\r\n\r\n");
  assert.equal(replaceMarkdownSection(source, range, "## Changed\n\nUpdated"), `${source.slice(0, range.start)}## Changed\r\n\r\nUpdated\r\n\r\n${source.slice(range.end)}`);
  assert.equal(markdownSectionAtLine(source, 2), null);
});

test("ignores headings in fenced code, quotes and compare examples", () => {
  const source = "## Real\n\n```md\n# Fake\n```\n\n> # Quote\n\n:::compare\n# Example\n:::\n\nTail\n\n## Next\nDone";
  assert.equal(section(source, "Tail").text, source.slice(0, source.indexOf("## Next")));
});

test("handles a document without headings and rejects invalid source lines", () => {
  const source = "---\ntitle: Test\n---\nPlain text\n";
  assert.equal(section(source, "Plain").text, "Plain text\n");
  assert.equal(markdownSectionAtLine(source, 99), null);
  assert.equal(markdownSectionAtLine(source, NaN), null);
});

test("repeated text and headings are located by source position", () => {
  const source = "## Same\nText\n\n## Same\nText\n";
  const range = markdownSectionAtLine(source, 5);
  assert.ok(range);
  assert.equal(range.start, source.lastIndexOf("## Same"));
  assert.equal(replaceMarkdownSection(source, range, ""), source.slice(0, range.start));
});

test('markdownLinesRange delimits whole lines without their last line ending', () => {
  const content = '---\nt: x\n---\n\nUn\ndeux\n\nFin\n';
  const range = markdownLinesRange(content, 5, 6)!;
  assert.equal(content.slice(range.start, range.end), 'Un\ndeux');
  const last = markdownLinesRange(content, 8, 8)!;
  assert.equal(content.slice(last.start, last.end), 'Fin');
});

test('markdownLinesRange refuses lines outside the document', () => {
  assert.equal(markdownLinesRange('a\nb', 3, 3), null);
  assert.equal(markdownLinesRange('a\nb', 0, 1), null);
  assert.equal(markdownLinesRange('a\nb', 2, 1), null);
});

test('replaceMarkdownLines leaves everything around the lines intact, CRLF included', () => {
  const content = 'Avant\r\n\r\nUn\r\ndeux\r\n\r\n\r\nFin\r\n';
  const range = markdownLinesRange(content, 3, 4)!;
  assert.equal(content.slice(range.start, range.end), 'Un\r\ndeux');
  assert.equal(replaceMarkdownLines(content, range, 'Trois\nquatre'), 'Avant\r\n\r\nTrois\r\nquatre\r\n\r\n\r\nFin\r\n');
});

const removing = (content: string, first: number, last: number) => removeMarkdownLines(content, markdownLinesRange(content, first, last)!);

test('removeMarkdownLines takes the block and one of its separations', () => {
  assert.equal(removing('A\n\nB\nb\n\nC\n', 3, 4), 'A\n\nC\n');
  assert.equal(removing('A\r\n\r\nB\r\n\r\nC\r\n', 3, 3), 'A\r\n\r\nC\r\n');
});

test('removeMarkdownLines at either end of the document leaves no blank line', () => {
  assert.equal(removing('A\n\nB\n', 3, 3), 'A\n');
  assert.equal(removing('A\n\nB\n', 1, 1), 'B\n');
  assert.equal(removing('A\n', 1, 1), '');
});

test('removeMarkdownLines does not merge what the block separated', () => {
  assert.equal(removing('A\n- l\n\nB\n', 2, 2), 'A\n\nB\n');
});
