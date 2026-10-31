import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderMarkdownWithCompareBlocks as render } from '../../src/lib/compareBlock';

const lines = (html: string) => [...html.matchAll(/<(\w+) data-source-lines="(\d+)-(\d+)"/g)].map(([, tag, start, end]) => `${tag}:${start}-${end}`);

test('top-level blocks carry their source line range, shifted by the stripped frontmatter', () => {
  const source = '# Title\n\nFirst **bold**\nparagraph\n\n- a\n- b\n\n```js\nx\n```\n';
  assert.deepEqual(lines(render(source, {}, { sourceLineOffset: 4 })), ['h1:5-5', 'p:7-8', 'ul:10-11', 'pre:13-15']);
});

test('without a source line offset the HTML carries no line attributes', () => {
  const html = render('# Title\n\nText\n');
  assert.ok(!html.includes('data-source-lines'));
  assert.ok(!html.includes('ld-src'));
});

test('a compare block counts as one block and keeps the following lines aligned', () => {
  const source = 'Intro\n\n:::compare\n| A |\n|---|\n| x |\n\n```md\ny\n```\n:::\n\nAfter\n';
  assert.deepEqual(lines(render(source, {}, { sourceLineOffset: 0 })), ['p:1-1', 'div:3-11', 'p:13-13']);
});

test('footnote definitions and CRLF line endings do not shift the following blocks', () => {
  const source = 'Text[^1]\r\n\r\n[^1]: Note\r\n\r\n## Next\r\n\r\nEnd\r\n';
  const html = render(source, {}, { sourceLineOffset: 0 });
  assert.deepEqual(lines(html).filter((entry) => !entry.startsWith('section')), ['p:1-1', 'h2:5-5', 'p:7-7']);
  assert.ok(!html.includes('ld-src'));
});
