import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyViewerAnnotations } from '../../src/lib/htmlAnnotations';
import { fillHtmlTemplate } from '../../src/lib/htmlDocument';
import { renderMarkdownWithCompareBlocks } from '../../src/lib/compareBlock';

function annotate(markdown: string): string {
  return applyViewerAnnotations(renderMarkdownWithCompareBlocks(markdown, {}, { tagMarkers: true }));
}

test('quote-type turns a blockquote into a callout of the canonical type', () => {
  assert.match(annotate('<!-- quote-type: warning -->\n> Texte'), /<blockquote class="ld-callout ld-callout-warning">/);
  assert.match(annotate('<!-- quote-type: tip -->\n\n> Texte'), /<blockquote class="ld-callout ld-callout-success">/);
});

test('an unknown quote-type alone leaves a plain blockquote', () => {
  assert.match(annotate('<!-- quote-type: nope -->\n> Texte'), /<blockquote>/);
});

test('quote-title adds an escaped header, without type', () => {
  const html = annotate('<!-- quote-title: A <b> & C -->\n> Texte');
  assert.match(html, /<blockquote class="ld-callout">/);
  assert.ok(html.includes('<div class="ld-callout-header"><span class="ld-callout-title">A &lt;b&gt; &amp; C</span></div>'), html);
});

test('an isolated tag in quote-title stays literal text', () => {
  const html = annotate('<!-- quote-title: <reformule cette phrase> -->\n> Texte');
  assert.ok(html.includes('<span class="ld-callout-title">&lt;reformule cette phrase&gt;</span>'), html);
});

test('quote-icon with a title goes in the header', () => {
  const html = annotate('<!-- quote-type: error -->\n<!-- quote-title: Stop -->\n<!-- quote-icon -->\n> Texte');
  assert.match(html, /<div class="ld-callout-header"><span class="ld-callout-icon"><svg[\s\S]*?<\/svg><\/span><span class="ld-callout-title">Stop<\/span><\/div>/);
});

test('quote-icon alone goes inline at the start of the first paragraph', () => {
  const html = annotate('<!-- quote-icon -->\n> Texte');
  assert.match(html, /<p><span class="ld-callout-icon ld-callout-icon-inline"><svg[\s\S]*?<\/svg><\/span>Texte<\/p>/);
  assert.ok(!html.includes('ld-callout-header'));
});

test('image-width and image-align set the classes of the image that follows', () => {
  const html = annotate('<!-- image-width: 1/2 -->\n<!-- image-align: right -->\n![a](images/x.png)\n\n![b](images/y.png)');
  assert.match(html, /<img class="ld-image-width-half ld-image-align-right" src="images\/x.png"/);
  assert.match(html, /<img src="images\/y.png"/);
});

test('an invalid image-width leaves the image untouched', () => {
  assert.match(annotate('<!-- image-width: 7/8 -->\n![a](x.png)'), /<img src="x.png"/);
});

test('an image comment does not reach an image further in the text', () => {
  assert.match(annotate('<!-- image-width: 1/2 -->\n\nTexte ![a](x.png)'), /<img src="x.png"/);
});

test('annotations written in code stay literal', () => {
  const html = annotate('```md\n<!-- quote-type: info -->\n> code\n<!-- image-width: 1/2 -->\n![a](x.png)\n```');
  assert.ok(!html.includes('ld-callout'));
  assert.ok(!html.includes('ld-image-width'));
  assert.ok(html.includes('&lt;!-- quote-type: info --&gt;'));
});

test('annotations also apply in the rendered side of a compare block', () => {
  const html = annotate(':::compare\n<!-- quote-type: info -->\n> dedans\n:::');
  assert.match(html, /<div class="ld-compare-render"[^>]*>\s*<blockquote class="ld-callout ld-callout-info">/);
});

test('every generated page receives the annotation styles once', () => {
  const page = fillHtmlTemplate('<html><head><style>a{}</style></head><body>{{content}}</body></html>', {
    title: 'T', toc: '', content: '</head>', language: 'fr',
  });
  assert.equal(page.match(/\.ld-callout-header/g)?.length, 1);
  assert.ok(page.indexOf('.ld-callout-header') < page.indexOf('</head>'));
  assert.ok(page.endsWith('<body></head></body></html>'));
});
