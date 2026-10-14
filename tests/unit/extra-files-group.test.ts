import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withExtraFilesGroup } from '../../src/frontend-svelte/src/lib/home/tree';
import type { ExplorerNode } from '../../src/frontend-svelte/src/lib/home/types';

const docsFolderNode: ExplorerNode = { kind: 'doc', name: 'intro.md', path: 'intro.md', id: 'intro' };

test('extra documents (absolute ids) are grouped in a leading read-only folder, in listing order', () => {
  const docs = [
    { id: encodeURIComponent('/ext/.agents/a/c'), title: 'C', filename: 'c.md' },
    { id: encodeURIComponent('/ext/.agents/b'), title: 'B', filename: 'b.md' },
    { id: 'intro', title: 'Intro', filename: 'intro.md' },
  ];

  const tree = withExtraFilesGroup([docsFolderNode], docs, 'General');

  assert.equal(tree.length, 2);
  const [group, rest] = tree;
  assert.equal(group.kind, 'folder');
  assert.equal(group.name, 'General');
  assert.equal(group.extra, true);
  assert.deepEqual(
    group.children?.map((n) => [n.kind, n.name, n.id, n.extra]),
    [
      ['doc', 'c.md', docs[0].id, true],
      ['doc', 'b.md', docs[1].id, true],
    ],
  );
  assert.equal(rest, docsFolderNode);
});

test('no extra documents leaves the tree untouched', () => {
  const tree = [docsFolderNode];
  assert.equal(withExtraFilesGroup(tree, [{ id: 'intro', title: 'Intro' }], 'General'), tree);
});
