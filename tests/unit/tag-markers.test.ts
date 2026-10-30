import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderMarkdownWithSummaries } from '../../src/lib/summaryMarkdown';
import { renderMarkdownWithCompareBlocks } from '../../src/lib/compareBlock';

const on = { tagMarkers: true };
const render = (source: string) => renderMarkdownWithSummaries(source, {}, on);
const marker = (name: string) => `<mark class="ld-tag-marker" title="&lt;${name}&gt;" data-tag="${name}">b</mark>`;

test('an inline lone opening tag becomes a highlighted marker', () => {
  assert.equal(render('Before <add-footnote> after.'), `<p>Before ${marker('add-footnote')} after.</p>\n`);
});

test('a lone tag on its own line becomes a marker', () => {
  assert.match(render('<rewrite-section>\n\nText'), new RegExp(marker('rewrite-section')));
});

test('several different names each get a marker, keeping their case', () => {
  const html = render('A <one> B <Two-X> C <three3>.');
  for (const n of ['one', 'Two-X', 'three3']) assert.ok(html.includes(marker(n)), n);
});

test('markers are off by default', () => {
  assert.equal(renderMarkdownWithSummaries('A <foo> B'), '<p>A <foo> B</p>\n');
});

test('tags with a closing tag, void elements and attributes stay untouched', () => {
  const html = render('<details>\n<summary>S</summary>\n\nBody\n\n</details>\n\nline<br>break <img> <a href="x">l</a> <foo bar="1">');
  assert.ok(!html.includes('ld-tag-marker'));
  assert.match(html, /<details>/);
  assert.match(html, /<br>/);
});

test('inline code and fenced code stay literal', () => {
  const html = render('Use `<foo>` here.\n\n```html\n<bar>\n```');
  assert.ok(!html.includes('ld-tag-marker'));
  assert.match(html, /<code>&lt;foo&gt;<\/code>/);
  assert.match(html, /&lt;bar&gt;/);
});

test('HTML comments and raw code regions are not rewritten', () => {
  const html = render('<!-- <foo> -->\n\n<pre>\n<bar>\n</pre>\n\nok <baz>');
  assert.ok(html.includes('<!-- <foo> -->'));
  assert.ok(html.includes('<pre>\n<bar>'));
  assert.ok(html.includes(marker('baz')));
  assert.ok(!html.includes(marker('foo')) && !html.includes(marker('bar')));
});

test('summary rewriting still works next to a marker', () => {
  const html = render('<details>\n<summary># Title <todo></summary>\n\nBody\n\n</details>');
  assert.match(html, /<summary><h1 style="display: inline; margin: 0">Title /);
  assert.ok(html.includes(marker('todo')));
});

test('compare blocks forward the flag to outer and inner renders', () => {
  const src = 'Outer <a-tag>\n\n:::compare\nInner <b-tag>\n:::\n';
  const html = renderMarkdownWithCompareBlocks(src, {}, on);
  assert.ok(html.includes(marker('a-tag')));
  assert.ok(html.includes(marker('b-tag')));
  assert.ok(!renderMarkdownWithCompareBlocks(src).includes('ld-tag-marker'));
});

test('a tag followed by free text becomes a marker showing the whole tag', () => {
  const html = render('A <generate-image : montrer les sections que peut contenir le fichier skill.md> B');
  assert.ok(html.includes('title="&lt;generate-image : montrer les sections que peut contenir le fichier skill.md&gt;" data-tag="generate-image">b</mark>'), html);
});

test('free text that is not valid HTML (accents, quotes) still becomes a marker', () => {
  const html = render('A <generate-image l\'image d\'été "x"> B');
  assert.ok(html.includes('title="&lt;generate-image l\'image d\'été &quot;x&quot;&gt;" data-tag="generate-image">b</mark>'), html);
  assert.ok(!html.replace(/title="[^"]*"/, '').includes('&lt;generate-image'), html);
});

test('a tag with free text alone on its line becomes a marker', () => {
  assert.match(render('<rewrite-section en trois parties>\n\nText'), /data-tag="rewrite-section"/);
});
