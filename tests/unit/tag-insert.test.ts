import assert from 'node:assert/strict';
import { test } from 'node:test';
import { insertTagAt, locateTagInsertion, locateTagRemoval, removeTagAt } from '../../src/frontend-svelte/src/lib/home/tagInsert';
import { normalizeTagName } from '../../src/shared/tagName';

test('normalizeTagName strips brackets and whitespace and lowercases', () => {
  assert.equal(normalizeTagName('add-footnote'), 'add-footnote');
  assert.equal(normalizeTagName(' <Add-Footnote> '), 'add-footnote');
  assert.equal(normalizeTagName('h2'), 'h2');
});

test('normalizeTagName rejects invalid names', () => {
  for (const input of ['', '  ', '<>', '1abc', '-abc', 'a b', '<a href="x">', 'a_b', '<a>b>', 'é']) {
    assert.equal(normalizeTagName(input), null, input);
  }
});

test('a unique paragraph match gives the source offset of the clicked char and the tag is inserted there', () => {
  const content = '# Title\n\nHello brave new world.\n';
  const located = locateTagInsertion(content, 'Hello brave ', 'new world.');
  assert.deepEqual(located, { ok: true, index: content.indexOf('new world') });
  assert.equal(insertTagAt(content, content.indexOf('new world'), 'add-footnote'), '# Title\n\nHello brave <add-footnote>new world.\n');
});

test('clicking the first char of a text node (empty before) works', () => {
  const content = 'Intro\n\nUnique sentence here.\n';
  assert.deepEqual(locateTagInsertion(content, '', 'Unique sentence here.'), { ok: true, index: content.indexOf('Unique') });
});

test('whitespace runs in the rendered text match indentation and newlines in the source', () => {
  const content = '- foo\n  bar baz\n';
  assert.deepEqual(locateTagInsertion(content, 'foo ', 'bar baz'), { ok: true, index: content.indexOf('bar') });
});

test('several occurrences are ambiguous', () => {
  assert.deepEqual(locateTagInsertion('same text\n\nsame text\n', 'same ', 'text'), { ok: false, reason: 'ambiguous' });
  assert.deepEqual(locateTagInsertion('aaa', 'a', 'a'), { ok: false, reason: 'ambiguous' });
});

test('text absent from the source (entities, empty input) is not found', () => {
  assert.deepEqual(locateTagInsertion('Tom &amp; Jerry', 'Tom ', '& Jerry'), { ok: false, reason: 'not-found' });
  assert.deepEqual(locateTagInsertion('anything', '  ', ' '), { ok: false, reason: 'not-found' });
});

test('occurrences in fences, tables, inline code and frontmatter are ignored', () => {
  const content = [
    '---', 'title: target phrase', '---', '',
    '```mermaid', 'target phrase', '```', '',
    '~~~', 'target phrase', '~~~', '',
    '| a | b |', '|---|---|', '| target phrase | x |', '',
    'Use `target phrase` and then target phrase once.', '',
  ].join('\n');
  const located = locateTagInsertion(content, 'then ', 'target phrase once.');
  assert.deepEqual(located, { ok: true, index: content.indexOf('target phrase once') });
  assert.deepEqual(locateTagInsertion(content, 'and ', 'then'), { ok: true, index: content.indexOf('then') });
});

test('text found only in non-searchable zones is not found', () => {
  const content = '```\nonly in code\n```\n\n| only in table |\n\n`only inline`\n';
  assert.deepEqual(locateTagInsertion(content, 'only ', 'in code'), { ok: false, reason: 'not-found' });
  assert.deepEqual(locateTagInsertion(content, 'only ', 'in table'), { ok: false, reason: 'not-found' });
  assert.deepEqual(locateTagInsertion(content, 'only ', 'inline'), { ok: false, reason: 'not-found' });
});

test('removal: a single lone tag is located and removed, keeping the rest of the line', () => {
  const content = 'Hello <add-footnote>world.\n';
  const located = locateTagRemoval(content, 'add-footnote', 0, 1);
  assert.deepEqual(located, { ok: true, index: 6 });
  assert.equal(removeTagAt(content, 6, 'add-footnote'), 'Hello world.\n');
});

test('removal: the second of two occurrences is picked by occurrence index', () => {
  const content = 'a <x-y>b\n\nc <x-y>d\n';
  assert.deepEqual(locateTagRemoval(content, 'x-y', 1, 2), { ok: true, index: content.lastIndexOf('<x-y>') });
});

test('removal: occurrences in fenced code, inline code and frontmatter are ignored', () => {
  const content = '---\nk: <x-y>\n---\n\n```\n<x-y>\n```\n\nuse `<x-y>` here and <x-y>real\n';
  assert.deepEqual(locateTagRemoval(content, 'x-y', 0, 1), { ok: true, index: content.lastIndexOf('<x-y>') });
});

test('removal: a tag inside a table row is counted (unlike insertion)', () => {
  const content = '| a | <x-y>b |\n|---|---|\n';
  assert.deepEqual(locateTagRemoval(content, 'x-y', 0, 1), { ok: true, index: content.indexOf('<x-y>') });
  assert.deepEqual(locateTagInsertion('| a | b |\n', 'a | ', 'b'), { ok: false, reason: 'not-found' });
});

test('removal: count mismatch with the rendered doc is ambiguous', () => {
  assert.deepEqual(locateTagRemoval('<x-y>a <x-y>b', 'x-y', 0, 1), { ok: false, reason: 'ambiguous' });
  assert.deepEqual(locateTagRemoval('<x-y>a', 'x-y', 0, 2), { ok: false, reason: 'ambiguous' });
});

test('removal: no match or out-of-range occurrence is not-found', () => {
  assert.deepEqual(locateTagRemoval('nothing', 'x-y', 0, 0), { ok: false, reason: 'not-found' });
  assert.deepEqual(locateTagRemoval('<x-y>', 'x-y', 3, 1), { ok: false, reason: 'not-found' });
});

test('removal: name matching is case-insensitive and attributes do not match', () => {
  const content = 'a <Add-Footnote>b <add-footnote class="z">c';
  assert.deepEqual(locateTagRemoval(content, 'add-footnote', 0, 1), { ok: true, index: 2 });
  assert.equal(removeTagAt(content, 2, 'add-footnote'), 'a b <add-footnote class="z">c');
});

test('removal: removeTagAt throws when the text at index is not the tag', () => {
  assert.throws(() => removeTagAt('hello', 0, 'x-y'));
});
