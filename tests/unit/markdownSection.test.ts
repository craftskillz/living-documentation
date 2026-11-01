import { test } from "node:test";
import assert from "node:assert/strict";
import { markdownSectionAtLine, replaceMarkdownSection } from "../../src/lib/markdownSection";

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
