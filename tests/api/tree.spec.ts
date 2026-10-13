import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

interface TreeNode {
  kind: 'folder' | 'doc';
  name: string;
  path: string;
  children?: TreeNode[];
}

async function getTree(request: import('@playwright/test').APIRequestContext, baseURL: string): Promise<TreeNode[]> {
  const res = await request.get(`${baseURL}/api/tree`);
  expect(res.ok()).toBe(true);
  return (await res.json()) as TreeNode[];
}

function names(nodes: TreeNode[] | undefined): string[] {
  return (nodes ?? []).map((n) => n.name);
}

function writeDoc(docsAbs: string, rel: string): void {
  const abs = path.join(docsAbs, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `---\ntype: Concept\ntitle: ${path.basename(rel, '.md')}\n---\n\nbody\n`);
}

test('without manifest, folders come first then files, each alphabetical', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'zeta/a.md');
  writeDoc(ld.docsAbs, 'Alpha/b.md');
  writeDoc(ld.docsAbs, 'beta.md');

  const tree = await getTree(request, ld.baseURL);

  expect(names(tree)).toEqual([
    'Alpha',
    'zeta',
    '2026_01_01_10_00_[General]_intro.md',
    '2026_01_02_10_00_[Guide]_quickstart.md',
    '2026_01_03_10_00_[Guide]_advanced.md',
    'beta.md',
  ]);
  const zeta = tree.find((n) => n.name === 'zeta');
  expect(zeta?.kind).toBe('folder');
  expect(zeta?.path).toBe('zeta');
  expect(names(zeta?.children)).toEqual(['a.md']);
  expect(zeta?.children?.[0]).toMatchObject({ kind: 'doc', path: 'zeta/a.md', id: encodeURIComponent('zeta/a') });
});

test('manifest order puts listed entries first, in order, then the rest by default order', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'guide/z.md');
  writeDoc(ld.docsAbs, 'guide/y.md');
  writeDoc(ld.docsAbs, 'guide/x.md');
  writeDoc(ld.docsAbs, 'guide/sub/s.md');
  writeDoc(ld.docsAbs, 'guide/other/o.md');
  fs.writeFileSync(
    path.join(ld.docsAbs, 'guide/liv-doc-main.md'),
    '---\norder:\n  - z.md\n  - other\n---\n\nGuide folder.\n',
  );

  const tree = await getTree(request, ld.baseURL);
  const guide = tree.find((n) => n.name === 'guide');

  expect(names(guide?.children)).toEqual(['z.md', 'other', 'sub', 'x.md', 'y.md']);
});

test('malformed manifest or unknown order entries fall back to the default order', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'broken/b.md');
  writeDoc(ld.docsAbs, 'broken/a.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'broken/liv-doc-main.md'), '---\norder: [b.md\n  - : :\n---\n');
  writeDoc(ld.docsAbs, 'stale/b.md');
  writeDoc(ld.docsAbs, 'stale/a.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'stale/liv-doc-main.md'), '---\norder:\n  - gone.md\n  - b.md\n---\n');

  const tree = await getTree(request, ld.baseURL);

  expect(names(tree.find((n) => n.name === 'broken')?.children)).toEqual(['a.md', 'b.md']);
  expect(names(tree.find((n) => n.name === 'stale')?.children)).toEqual(['b.md', 'a.md']);
});

test('liv-doc-main.md is never listed as a document', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'guide/a.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'liv-doc-main.md'), '---\norder: []\n---\n');
  fs.writeFileSync(path.join(ld.docsAbs, 'guide/liv-doc-main.md'), '---\norder: []\n---\n');

  const tree = await getTree(request, ld.baseURL);
  expect(names(tree)).not.toContain('liv-doc-main.md');
  expect(names(tree.find((n) => n.name === 'guide')?.children)).toEqual(['a.md']);

  const docs = (await (await request.get(`${ld.baseURL}/api/documents`)).json()) as Array<{ filename: string }>;
  expect(docs.map((d) => d.filename).filter((f) => f.endsWith('liv-doc-main.md'))).toEqual([]);
});

test('dot folders and dot Markdown files are listed; .git and node_modules are not', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, '.scratch/draft.md');
  writeDoc(ld.docsAbs, '.notes.md');
  fs.mkdirSync(path.join(ld.docsAbs, '.living-documentation'), { recursive: true });
  writeDoc(ld.docsAbs, '.git/HEAD.md');
  writeDoc(ld.docsAbs, 'node_modules/pkg/readme.md');
  fs.writeFileSync(path.join(ld.docsAbs, '.settings.json'), '{}');

  const tree = await getTree(request, ld.baseURL);

  expect(names(tree)).toContain('.scratch');
  expect(names(tree)).toContain('.living-documentation');
  expect(names(tree)).toContain('.notes.md');
  expect(names(tree.find((n) => n.name === '.scratch')?.children)).toEqual(['draft.md']);
  expect(names(tree)).not.toContain('.git');
  expect(names(tree)).not.toContain('node_modules');
  expect(names(tree)).not.toContain('.settings.json');
});

test('GET /api/documents lists dot-folder documents but nothing under .git or node_modules', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, '.scratch/draft.md');
  writeDoc(ld.docsAbs, '.notes.md');
  writeDoc(ld.docsAbs, '.git/HEAD.md');
  writeDoc(ld.docsAbs, 'node_modules/pkg/readme.md');

  const res = await request.get(`${ld.baseURL}/api/documents`);
  const files = ((await res.json()) as Array<{ filename: string }>).map((d) => d.filename);

  expect(files).toContain('.scratch/draft.md');
  expect(files).toContain('.notes.md');
  expect(files.filter((f) => f.startsWith('.git/') || f.startsWith('node_modules/'))).toEqual([]);
});
