import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderMarkdownWithSummaries as render } from '../../src/lib/summaryMarkdown';
import { renderMarkdownWithCompareBlocks } from '../../src/lib/compareBlock';

test('footnotes render formatted definitions at the end with repeated references and backlinks', () => {
  const html = render('[^skills]: An **open** format with a [link](https://agentskills.io/home).\n\n    Second paragraph.\n\nAgent Skills[^skills], again[^skills].\n\nLast paragraph.');
  assert.match(html, /<sup><a id="ld-fn-ref-skills" href="#ld-fn-skills"[^>]*>1<\/a><\/sup>/);
  assert.match(html, /id="ld-fn-ref-skills-2"/);
  assert.match(html, /href="#ld-fn-ref-skills-2"/);
  assert.match(html, /<strong>open<\/strong>/);
  assert.match(html, /<a href="https:\/\/agentskills.io\/home">link<\/a>/);
  assert.match(html, /<p>Second paragraph\./);
  assert.ok(html.indexOf('<section') > html.indexOf('Last paragraph.'));
});

test('undefined, escaped and code references stay literal and renders do not share definitions', () => {
  const html = render('Known[^1]. `[^1]` \\[^1] [^missing]\n\n```md\n[^1]: example\n```\n\n    [^1]: indented example\n\n[^1]: Real note');
  assert.equal((html.match(/<sup><a/g) ?? []).length, 1);
  assert.match(html, /<code>\[\^1\]<\/code>/);
  assert.match(html, /\[\^missing\]/);
  assert.match(html, /\[\^1\]: example/);
  assert.match(html, /\[\^1\]: indented example/);
  assert.equal(render('Unknown[^1].'), '<p>Unknown[^1].</p>\n');
  assert.match(render('New[^new].\n\n[^new]: Note'), /aria-describedby="ld-fn-label">1<\/a>/);
});

test('comparison previews and the main document have independent footnote anchors', () => {
  const sample = 'Text[^1].\n\n[^1]: Note';
  const html = renderMarkdownWithCompareBlocks(`${sample}\n\n:::compare\n${sample}\n:::\n\n:::compare\n${sample}\n:::`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const prefix of ['ld-fn-', 'ld-fn-compare-0-', 'ld-fn-compare-1-']) {
    assert.ok(html.includes(`href="#${prefix}1"`));
    assert.ok(html.includes(`id="${prefix}1"`));
  }
});
