import assert from 'node:assert/strict';
import { test } from 'node:test';
import { marked } from 'marked';
import { renderMarkdownWithSummaries as render } from '../../src/lib/summaryMarkdown';
import { renderMarkdownWithCompareBlocks } from '../../src/lib/compareBlock';

test('partial options preserve the normal GFM rendering defaults', () => {
  const source = '| A | B |\n|---|---|\n| x | y |\n\n~~Deleted~~\n\n- [x] Done\n\nhttps://example.com';
  for (const options of [{}, { breaks: false }, { async: false }, { gfm: false }]) {
    assert.equal(render(source, options), marked.parse(source, options));
  }
  assert.ok(render(source).includes('<table>'));
});

test('summary headings support all six levels and inline Markdown', () => {
  for (let level = 1; level <= 6; level++) {
    const html = render(`<details>\n<summary>${'#'.repeat(level)} Slide **0** > 30</summary>\n\nBody\n\n</details>`);
    assert.ok(html.includes(`<h${level} style="display: inline; margin: 0">Slide <strong>0</strong> &gt; 30</h${level}>`));
    assert.ok(html.includes('<p>Body</p>'));
  }
});

test('summary supports inline formatting, attributes, HTML and escapes', () => {
  const html = render('<SUMMARY title="a > b">**Bold** *italic* [link](https://example.com) `code` <strong>HTML</strong> \\*literal\\* &amp;</SUMMARY>');
  assert.equal(html, '<SUMMARY title="a > b"><strong>Bold</strong> <em>italic</em> <a href="https://example.com">link</a> <code>code</code> <strong>HTML</strong> *literal* &amp;</SUMMARY>');
  assert.equal(render('<summary>#tag</summary>'), '<summary>#tag</summary>');
  assert.ok(render('<summary>## Title ##</summary>').includes('>Title</h2>'));
});

test('code examples, comments and HTML attributes are preserved', () => {
  for (const source of [
    '```html\n<summary># **Example**</summary>\n```',
    '    <summary># **Example**</summary>',
    '`<summary># **Example**</summary>`',
    '<pre><summary># **Example**</summary></pre>',
    '<code><summary># **Example**</summary></code>',
    '<!-- <summary># **Example**</summary> -->',
    '<div title="<summary># **Example**</summary>">HTML</div>',
    '<script>const example = "<summary># **Example**</summary>";</script>',
  ]) assert.equal(render(source), marked.parse(source));
});

test('nested details, multiple summaries and soft breaks remain supported', () => {
  const html = render('<details>\n<summary>**Outer**</summary>\n<details>\n<summary>*Inner*\nlabel</summary>\n</details>\n</details>', { breaks: true });
  assert.ok(html.includes('<summary><strong>Outer</strong></summary>'));
  assert.ok(html.includes('<summary><em>Inner</em><br>label</summary>'));
});

test('compare blocks render summary Markdown while keeping the source literal', () => {
  const html = renderMarkdownWithCompareBlocks(':::compare\n<details>\n<summary># Slide 0 > 30</summary>\n\nBody\n</details>\n:::');
  assert.ok(html.includes('&lt;summary&gt;# Slide 0 &gt; 30&lt;/summary&gt;'));
  assert.ok(html.includes('<summary><h1 style="display: inline; margin: 0">Slide 0 &gt; 30</h1></summary>'));
});
