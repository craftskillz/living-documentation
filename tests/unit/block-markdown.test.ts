import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blockToMarkdown, sameIgnoringWhitespace, type BlockNode } from '../../src/frontend-svelte/src/lib/html-view/blockMarkdown';

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;
const text = (value: string): BlockNode => ({ nodeType: TEXT_NODE, nodeName: '#text', nodeValue: value, childNodes: [] });
const el = (name: string, attributes: Record<string, string>, ...children: BlockNode[]): BlockNode => ({
  nodeType: ELEMENT_NODE,
  nodeName: name.toUpperCase(),
  nodeValue: null,
  childNodes: children,
  getAttribute: (attribute) => attributes[attribute] ?? null,
});
const p = (...children: BlockNode[]) => el('p', {}, ...children);

test('a paragraph keeps its inline Markdown and its line breaks', () => {
  const block = p(text('a '), el('strong', {}, text('b')), text(' '), el('em', {}, text('c')), text(' '), el('code', {}, text('d')), text(' '), el('del', {}, text('e')), text('\nf'));
  assert.equal(blockToMarkdown(block), 'a **b** *c* `d` ~~e~~\nf');
});

test('headings h2 to h4 get their level back', () => {
  assert.equal(blockToMarkdown(el('h2', {}, text('Un'))), '## Un');
  assert.equal(blockToMarkdown(el('h4', {}, text('Trois '), el('em', {}, text('x')))), '#### Trois *x*');
});

test('other blocks are not convertible', () => {
  for (const name of ['h1', 'h5', 'ul', 'blockquote', 'pre']) assert.equal(blockToMarkdown(el(name, {}, text('x'))), null);
});

test('links, autolinks, document links and images find their source form', () => {
  assert.equal(blockToMarkdown(p(el('a', { href: 'https://x.io', title: 't' }, text('lien')))), '[lien](https://x.io "t")');
  assert.equal(blockToMarkdown(p(el('a', { href: 'https://x.io' }, text('https://x.io')))), 'https://x.io');
  assert.equal(blockToMarkdown(p(el('a', { href: '/?doc=autre' }, text('Autre')))), '[Autre](?doc=autre)');
  assert.equal(blockToMarkdown(p(el('img', { src: '/images/x.png', alt: 'a' }))), '![a](images/x.png)');
});

test('footnote references and tag markers find their source form', () => {
  const footnote = el('sup', {}, el('a', { href: '#ld-fn-note', 'data-ld-fn-ref': '' }, text('1')));
  const marker = el('mark', { class: 'ld-tag-marker', title: '<reformule cette phrase>' }, text('b'));
  assert.equal(blockToMarkdown(p(text('x'), footnote, text(' '), marker)), 'x[^note] <reformule cette phrase>');
});

test('a hard break follows the soft breaks setting', () => {
  const block = p(text('a'), el('br', {}), text('b'));
  assert.equal(blockToMarkdown(block), 'a  \nb');
  assert.equal(blockToMarkdown(block, { softBreaks: true }), 'a\nb');
});

test('an unknown inline element makes the block unconvertible', () => {
  assert.equal(blockToMarkdown(p(text('a'), el('u', {}, text('b')))), null);
  assert.equal(blockToMarkdown(p(el('sup', {}, text('2')))), null);
  assert.equal(blockToMarkdown(p(el('mark', {}, text('b')))), null);
  assert.equal(blockToMarkdown(p({ nodeType: 8, nodeName: '#comment', nodeValue: 'x', childNodes: [] })), null);
});

test('what a browser leaves when it replaces formatted text keeps its meaning or falls back on plain text', () => {
  assert.equal(blockToMarkdown(p(el('b', {}, text('a')), el('i', {}, text('b')), el('strike', {}, text('c')))), '**a***b*~~c~~');
  assert.equal(blockToMarkdown(p(el('font', { face: 'monospace' }, el('span', { style: 'x' }, text('a'))))), 'a');
});

test('the comparison ignores spaces and line breaks only', () => {
  assert.ok(sameIgnoringWhitespace('a b\nc', 'a  b c'));
  assert.ok(sameIgnoringWhitespace('a : b', 'a : b'));
  assert.ok(!sameIgnoringWhitespace('a * b', 'a \\* b'));
});
