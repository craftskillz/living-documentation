import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  countExplorerDocs,
  countExplorerEntries,
  filterExplorerTree,
  withoutHiddenEntries,
} from '../../src/frontend-svelte/src/lib/home/tree';
import { dropRequest } from '../../src/frontend-svelte/src/lib/home/treeDrop';
import type { ExplorerNode } from '../../src/frontend-svelte/src/lib/home/types';

const doc = (path: string): ExplorerNode => ({
  kind: 'doc',
  name: path.split('/').pop() as string,
  path,
  id: encodeURIComponent(path.slice(0, -3)),
});
const file = (path: string): ExplorerNode => ({ kind: 'file', name: path.split('/').pop() as string, path });

const guides: ExplorerNode = {
  kind: 'folder',
  name: 'guides',
  path: 'guides',
  children: [
    { ...doc('guides/index.md'), reserved: true },
    { kind: 'folder', name: 'deep', path: 'guides/deep', children: [doc('guides/deep/b.md'), file('guides/deep/c.pdf')] },
    doc('guides/a.md'),
    file('guides/logo.png'),
  ],
};

test('countExplorerEntries counts documents and other files, reserved files left out', () => {
  assert.equal(countExplorerEntries(guides), 4);
});

test('countExplorerDocs still counts documents only', () => {
  assert.equal(countExplorerDocs(guides), 2);
  assert.equal(countExplorerDocs(guides, () => true), 2);
});

test('other files leave the tree when hidden entries are not revealed, so the count drops with them', () => {
  const [visible] = withoutHiddenEntries([guides]);
  assert.deepEqual(visible.children?.map((n) => n.name), ['deep', 'a.md']);
  assert.equal(countExplorerEntries(visible), 2);
});

test('a search never matches an other file', () => {
  const [found] = filterExplorerTree([guides], new Set([doc('guides/a.md').id as string]));
  assert.deepEqual(found.children?.map((n) => n.name), ['a.md']);
});

test('other files do not shift the index of a drop, the server does not order them', () => {
  const tree: ExplorerNode[] = [guides, doc('x.md'), file('notes.txt')];
  assert.deepEqual(dropRequest(tree, 'guides/a.md', '', 'inside'), { source: 'guides/a.md', targetFolder: '', index: 2 });
  assert.deepEqual(dropRequest(tree, 'x.md', 'guides', 'inside'), { source: 'x.md', targetFolder: 'guides', index: 2 });
});
