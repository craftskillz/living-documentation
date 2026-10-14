import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dropRequest, movedDocId } from '../../src/frontend-svelte/src/lib/home/treeDrop';
import type { ExplorerNode } from '../../src/frontend-svelte/src/lib/home/types';

const doc = (path: string, hidden = false): ExplorerNode => ({
  kind: 'doc',
  name: path.split('/').pop() as string,
  path,
  id: encodeURIComponent(path.slice(0, -3)),
  hidden,
});
const folder = (path: string, children: ExplorerNode[]): ExplorerNode => ({
  kind: 'folder',
  name: path.split('/').pop() as string,
  path,
  children,
});

const tree: ExplorerNode[] = [
  folder('guides', [doc('guides/a.md'), doc('guides/secret.md', true), doc('guides/b.md'), folder('guides/deep', [])]),
  doc('x.md'),
  doc('y.md'),
];

test('reordering within a folder counts hidden siblings and excludes the dragged entry', () => {
  assert.deepEqual(dropRequest(tree, 'guides/a.md', 'guides/b.md', 'after'), {
    source: 'guides/a.md',
    targetFolder: 'guides',
    index: 2,
  });
  assert.deepEqual(dropRequest(tree, 'y.md', 'guides', 'before'), { source: 'y.md', targetFolder: '', index: 0 });
});

test('dropping onto another folder appends at the end of its full list', () => {
  assert.deepEqual(dropRequest(tree, 'x.md', 'guides', 'inside'), { source: 'x.md', targetFolder: 'guides', index: 4 });
  assert.deepEqual(dropRequest(tree, 'guides/b.md', 'y.md', 'before'), {
    source: 'guides/b.md',
    targetFolder: '',
    index: 2,
  });
});

test('a drop that leaves the entry where it is yields no request', () => {
  assert.equal(dropRequest(tree, 'x.md', 'x.md', 'after'), null);
  assert.equal(dropRequest(tree, 'x.md', 'y.md', 'before'), null);
  assert.equal(dropRequest(tree, 'guides', 'guides', 'inside'), null);
});

test('the open document id follows its own move and the move of an ancestor folder', () => {
  const id = encodeURIComponent('guides/a');
  assert.equal(movedDocId(id, 'guides/a.md', 'b/a.md'), encodeURIComponent('b/a'));
  assert.equal(movedDocId(id, 'guides', 'archive/guides'), encodeURIComponent('archive/guides/a'));
  assert.equal(movedDocId(id, 'guid', 'other/guid'), null);
  assert.equal(movedDocId(id, 'x.md', 'guides/x.md'), null);
});

test('reserved files shown at the head of a folder do not shift the drop index', () => {
  const withReserved: ExplorerNode[] = [
    { ...doc('liv-doc-main.md'), reserved: true },
    doc('x.md'),
    doc('y.md'),
  ];
  assert.deepEqual(dropRequest(withReserved, 'y.md', 'x.md', 'before'), { source: 'y.md', targetFolder: '', index: 0 });
  assert.equal(dropRequest(withReserved, 'y.md', 'liv-doc-main.md', 'after'), null);
});
