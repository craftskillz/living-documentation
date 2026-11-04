import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fillHtmlTemplate, structureHtml } from '../../src/lib/htmlDocument';
import { getDocumentHtmlTemplate, setDocumentHtmlTemplate } from '../../src/lib/htmlTemplateField';

test('the leading h1 becomes the title and leaves the content', () => {
  const { title, content } = structureHtml('<h1>Fiche <em>client</em></h1>\n<p>Intro</p>', 'Fallback');
  assert.equal(title, 'Fiche client');
  assert.equal(content, '<div class="ld-lead"><p>Intro</p></div>');
});

test('without a leading h1 the fallback title is escaped', () => {
  const { title } = structureHtml('<p>Intro</p>', 'A <b> & C');
  assert.equal(title, 'A &lt;b&gt; &amp; C');
});

test('each top-level h2 opens a section with a unique anchor listed in the toc', () => {
  const { content, toc } = structureHtml('<h2>L&#39;essentiel</h2><p>a</p><h2>Été</h2><p>b</p><h2>Été</h2>', 'T');
  assert.match(content, /<section class="ld-section" id="l-essentiel"><h2>L&#39;essentiel<\/h2><p>a<\/p><\/section>/);
  assert.match(content, /<section class="ld-section" id="ete"><h2>Été<\/h2><p>b<\/p><\/section>/);
  assert.match(content, /<section class="ld-section" id="ete-2"><h2>Été<\/h2><\/section>/);
  assert.match(toc, /<a href="#ete-2">Été<\/a>/);
});

test('a nested h2 does not open a section', () => {
  const html = '<h2>A</h2><div class="ld-compare"><h2>Nested</h2><br><img src="x"></div><p>end</p>';
  const { content } = structureHtml(html, 'T');
  assert.equal(content.match(/<section/g)?.length, 1);
  assert.ok(content.endsWith('<p>end</p></section>'));
});

test('h2 markup inside a code block stays text', () => {
  const { content } = structureHtml('<pre><code>&lt;h2&gt;x&lt;/h2&gt;</code></pre>', 'T');
  assert.equal(content.includes('<section'), false);
});

test('in-document links keep working from the generated page', () => {
  const { content } = structureHtml('<p><a href="?doc=a%2Fb">x</a></p>', 'T');
  assert.match(content, /href="\/\?doc=a%2Fb"/);
});

test('fillHtmlTemplate fills once and does not reinterpret the content', () => {
  const out = fillHtmlTemplate('<html lang="{{language}}"><title>{{title}}</title>{{toc}}{{content}}</html>', {
    title: 'T',
    language: 'fr',
    toc: '<nav></nav>',
    content: '<p>{{title}} $& $1</p>',
  });
  assert.equal(out, '<html lang="fr"><title>T</title><nav></nav><p>{{title}} $& $1</p></html>');
});

test('the html template field is read and written in the frontmatter', () => {
  const doc = '---\ntype: Document\ntitle: Fiche\n---\n\n# Corps\n';
  const set = setDocumentHtmlTemplate(doc, 'interview-sheet');
  assert.equal(set, '---\ntype: Document\ntitle: Fiche\nhtml_template: interview-sheet\n---\n\n# Corps\n');
  assert.equal(getDocumentHtmlTemplate(set), 'interview-sheet');
  const changed = setDocumentHtmlTemplate(set, 'other');
  assert.equal(changed, '---\ntype: Document\ntitle: Fiche\nhtml_template: other\n---\n\n# Corps\n');
});

test('a document without frontmatter receives one', () => {
  const set = setDocumentHtmlTemplate('# Corps\n', 'interview-sheet');
  assert.equal(set, '---\nhtml_template: interview-sheet\n---\n\n# Corps\n');
  assert.equal(getDocumentHtmlTemplate('# Corps\n'), null);
});
