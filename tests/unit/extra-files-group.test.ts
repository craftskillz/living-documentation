import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withExtraFilesGroup } from '../../src/frontend-svelte/src/lib/home/tree';
import type { ExplorerNode } from '../../src/frontend-svelte/src/lib/home/types';

const docsFolderNode: ExplorerNode = { kind: 'doc', name: 'intro.md', path: 'intro.md', id: 'intro' };
const extraDoc = (abs: string) => ({
  id: encodeURIComponent(abs.slice(0, -3)),
  title: abs.split('/').pop() as string,
  filename: abs.split('/').pop() as string,
});

type Shape = [string, string, Shape[]?];
const shape = (n: ExplorerNode): Shape =>
  n.kind === 'folder' ? [n.kind, n.name, (n.children ?? []).map(shape)] : [n.kind, n.name];

test('extra entries keep their structure in a leading read-only group, in config order', () => {
  const docs = [
    extraDoc('/ext/README.md'),
    extraDoc('/ext/.agents/a/c.md'),
    extraDoc('/ext/.agents/b.md'),
    { id: 'intro', title: 'Intro', filename: 'intro.md' },
  ];

  const tree = withExtraFilesGroup([docsFolderNode], docs, ['/ext/.agents', '/ext/README.md'], 'General');

  assert.equal(tree.length, 2);
  const [group, rest] = tree;
  assert.deepEqual(shape(group), [
    'folder',
    'General',
    [
      ['folder', '.agents', [['folder', 'a', [['doc', 'c.md']]], ['doc', 'b.md']]],
      ['doc', 'README.md'],
    ],
  ]);
  const flatten = (n: ExplorerNode): ExplorerNode[] => [n, ...(n.children ?? []).flatMap(flatten)];
  assert.ok(flatten(group).every((n) => n.extra === true));
  assert.equal(new Set(flatten(group).map((n) => n.path)).size, flatten(group).length);
  assert.equal(flatten(group).find((n) => n.name === 'c.md')?.id, docs[1].id);
  assert.equal(rest, docsFolderNode);
});

test('no extra documents leaves the tree untouched', () => {
  const tree = [docsFolderNode];
  assert.equal(withExtraFilesGroup(tree, [{ id: 'intro', title: 'Intro' }], [], 'General'), tree);
});
