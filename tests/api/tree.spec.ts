import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

interface TreeNode {
  kind: 'folder' | 'doc';
  name: string;
  path: string;
  hidden?: boolean;
  reserved?: boolean;
  linked?: boolean;
  children?: TreeNode[];
}

async function getTree(request: import('@playwright/test').APIRequestContext, baseURL: string): Promise<TreeNode[]> {
  const res = await request.get(`${baseURL}/api/tree`);
  expect(res.ok()).toBe(true);
  return (await res.json()) as TreeNode[];
}

/** Names of the listed entries, reserved files left out. */
function names(nodes: TreeNode[] | undefined): string[] {
  return (nodes ?? []).filter((n) => !n.reserved).map((n) => n.name);
}

function allNames(nodes: TreeNode[] | undefined): string[] {
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

test('reserved files are listed first in their folder, flagged reserved, but never as documents', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'guide/a.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'liv-doc-main.md'), '---\norder: []\n---\n');
  fs.writeFileSync(path.join(ld.docsAbs, 'guide/liv-doc-main.md'), '---\norder: []\n---\n');
  fs.writeFileSync(path.join(ld.docsAbs, 'guide/log.md'), '# Log\n');
  fs.writeFileSync(path.join(ld.docsAbs, 'guide/index.md'), '# Index\n');

  const tree = await getTree(request, ld.baseURL);
  expect(allNames(tree).slice(0, 3)).toEqual(['index.md', 'log.md', 'liv-doc-main.md']);
  expect(tree[2]).toMatchObject({ kind: 'doc', path: 'liv-doc-main.md', reserved: true });
  const guide = tree.find((n) => n.name === 'guide');
  expect(allNames(guide?.children)).toEqual(['index.md', 'log.md', 'liv-doc-main.md', 'a.md']);
  expect(guide?.children?.[2]).toMatchObject({ id: encodeURIComponent('guide/liv-doc-main'), reserved: true });
  expect(guide?.children?.[3].reserved).toBeUndefined();

  const docs = (await (await request.get(`${ld.baseURL}/api/documents`)).json()) as Array<{ filename: string }>;
  expect(docs.map((d) => d.filename).filter((f) => /(liv-doc-main|index|log)\.md$/.test(f))).toEqual([]);
});

test('GET /api/documents/:id serves a reserved file read-only, frontmatter shown as YAML', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'guide/a.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'guide/liv-doc-main.md'), '---\norder:\n  - a.md\nhidden:\n  - b.md\n---\n\nGuide folder.\n');

  const res = await request.get(`${ld.baseURL}/api/documents/${encodeURIComponent('guide/liv-doc-main')}`);
  expect(res.ok()).toBe(true);
  const doc = (await res.json()) as { reserved?: boolean; html: string };
  expect(doc.reserved).toBe(true);
  expect(doc.html).toContain('language-yaml');
  expect(doc.html).toContain('hidden:');
  expect(doc.html).toContain('Guide folder.');

  const normal = (await (await request.get(`${ld.baseURL}/api/documents/${encodeURIComponent('guide/a')}`)).json()) as { reserved?: boolean };
  expect(normal.reserved).toBeUndefined();
});

test('reserved files cannot be written, deleted or moved through the documents API', async ({ request, ld }) => {
  const manifest = '---\norder: []\n---\n';
  fs.mkdirSync(path.join(ld.docsAbs, 'guide'), { recursive: true });
  fs.mkdirSync(path.join(ld.docsAbs, 'notes'), { recursive: true });
  fs.writeFileSync(path.join(ld.docsAbs, 'guide/liv-doc-main.md'), manifest);
  fs.writeFileSync(path.join(ld.docsAbs, 'INDEX.md'), '# Index\n');
  const id = encodeURIComponent('guide/liv-doc-main');

  expect((await request.put(`${ld.baseURL}/api/documents/${id}`, { data: { content: 'x' } })).status()).toBe(400);
  expect((await request.put(`${ld.baseURL}/api/documents/INDEX`, { data: { content: 'x' } })).status()).toBe(400);
  expect((await request.delete(`${ld.baseURL}/api/documents/${id}`)).status()).toBe(400);
  expect((await request.post(`${ld.baseURL}/api/documents/${id}/move`, { data: { folder: 'notes' } })).status()).toBe(400);

  expect(fs.readFileSync(path.join(ld.docsAbs, 'guide/liv-doc-main.md'), 'utf-8')).toBe(manifest);
  expect(fs.readFileSync(path.join(ld.docsAbs, 'INDEX.md'), 'utf-8')).toBe('# Index\n');
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

test('entries listed in the manifest hidden are flagged hidden in the tree', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'guide/a.md');
  writeDoc(ld.docsAbs, 'guide/b.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'guide/liv-doc-main.md'), '---\norder: []\nhidden:\n  - b.md\n---\n');

  const guide = (await getTree(request, ld.baseURL)).find((n) => n.name === 'guide');
  const children = guide?.children ?? [];
  expect(children.find((n) => n.name === 'a.md')?.hidden).toBeUndefined();
  expect(children.find((n) => n.name === 'b.md')?.hidden).toBe(true);
});

test('PUT /api/tree/hidden hides then shows an entry through the parent manifest', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'guide/a.md');
  const manifest = path.join(ld.docsAbs, 'guide/liv-doc-main.md');

  const hide = await request.put(`${ld.baseURL}/api/tree/hidden`, { data: { path: 'guide/a.md', hidden: true } });
  expect(hide.ok()).toBe(true);
  expect(fs.readFileSync(manifest, 'utf-8')).toContain('hidden:\n  - a.md\n');
  const guide = (await getTree(request, ld.baseURL)).find((n) => n.name === 'guide');
  expect(guide?.children?.find((n) => n.name === 'a.md')?.hidden).toBe(true);

  const show = await request.put(`${ld.baseURL}/api/tree/hidden`, { data: { path: 'guide/a.md', hidden: false } });
  expect(show.ok()).toBe(true);
  expect(fs.readFileSync(manifest, 'utf-8')).toContain('hidden: []');
});

test('PUT /api/tree/hidden keeps the manifest order and body', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'a.md');
  writeDoc(ld.docsAbs, 'b.md');
  const manifest = path.join(ld.docsAbs, 'liv-doc-main.md');
  fs.writeFileSync(manifest, '---\norder:\n  - b.md\nhidden: []\n---\n\nRoot folder.\n');

  const res = await request.put(`${ld.baseURL}/api/tree/hidden`, { data: { path: 'a.md', hidden: true } });
  expect(res.ok()).toBe(true);
  const content = fs.readFileSync(manifest, 'utf-8');
  expect(content).toContain('order:\n  - b.md\n');
  expect(content).toContain('hidden:\n  - a.md\n');
  expect(content).toContain('Root folder.');
});

test('PUT /api/tree/hidden rejects unknown, reserved or escaping paths', async ({ request, ld }) => {
  const put = (data: unknown) => request.put(`${ld.baseURL}/api/tree/hidden`, { data });
  expect((await put({ path: 'missing.md', hidden: true })).status()).toBe(404);
  expect((await put({ path: '../outside.md', hidden: true })).status()).toBe(400);
  expect((await put({ path: '', hidden: true })).status()).toBe(400);
  expect((await put({ path: 'liv-doc-main.md', hidden: true })).status()).toBe(400);
  writeDoc(ld.docsAbs, 'a.md');
  expect((await put({ path: 'a.md', hidden: 'yes' })).status()).toBe(400);
});

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, unknown>;
}

async function move(
  request: import('@playwright/test').APIRequestContext,
  baseURL: string,
  data: Record<string, unknown>,
) {
  return request.post(`${baseURL}/api/tree/move`, { data });
}

test('POST /api/tree/move reorders inside the same folder through the manifest only', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'guide/a.md');
  writeDoc(ld.docsAbs, 'guide/b.md');
  writeDoc(ld.docsAbs, 'guide/c.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'guide/liv-doc-main.md'), '---\norder:\n  - gone.md\n---\n\nGuide folder.\n');

  const res = await move(request, ld.baseURL, { source: 'guide/c.md', targetFolder: 'guide', index: 1 });

  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ path: 'guide/c.md', id: encodeURIComponent('guide/c') });
  const guide = (await getTree(request, ld.baseURL)).find((n) => n.name === 'guide');
  expect(names(guide?.children)).toEqual(['a.md', 'c.md', 'b.md']);
  expect(fs.existsSync(path.join(ld.docsAbs, 'guide/c.md'))).toBe(true);
  const manifest = fs.readFileSync(path.join(ld.docsAbs, 'guide/liv-doc-main.md'), 'utf-8');
  expect(manifest).not.toContain('gone.md');
  expect(manifest).toContain('Guide folder.');
});

test('POST /api/tree/move moves a file to another folder at the given index', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'guide/a.md');
  writeDoc(ld.docsAbs, 'guide/b.md');
  writeDoc(ld.docsAbs, 'notes/x.md');
  writeDoc(ld.docsAbs, 'notes/y.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'guide/liv-doc-main.md'), '---\norder:\n  - b.md\n  - a.md\nhidden:\n  - a.md\n---\n');
  fs.writeFileSync(path.join(ld.docsAbs, 'notes/liv-doc-main.md'), '---\norder:\n  - y.md\n---\n');

  const res = await move(request, ld.baseURL, { source: 'guide/a.md', targetFolder: 'notes', index: 1 });

  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ path: 'notes/a.md', id: encodeURIComponent('notes/a') });
  expect(fs.existsSync(path.join(ld.docsAbs, 'guide/a.md'))).toBe(false);
  expect(fs.existsSync(path.join(ld.docsAbs, 'notes/a.md'))).toBe(true);
  const tree = await getTree(request, ld.baseURL);
  expect(names(tree.find((n) => n.name === 'notes')?.children)).toEqual(['y.md', 'a.md', 'x.md']);
  expect(fs.readFileSync(path.join(ld.docsAbs, 'guide/liv-doc-main.md'), 'utf-8')).not.toContain('a.md');
});

test('POST /api/tree/move moves a folder and migrates every doc id it contains', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'guide/sub/d.md');
  writeDoc(ld.docsAbs, 'guide/keep.md');
  const metadataFile = path.join(ld.docsAbs, '.metadata.json');
  const annotationsFile = path.join(ld.docsAbs, '.annotations.json');
  const configFile = path.join(ld.docsAbs, '.living-doc.json');
  fs.writeFileSync(metadataFile, JSON.stringify({ 'guide/sub/d': [{ path: 'x' }], 'guide/keep': [] }));
  fs.writeFileSync(annotationsFile, JSON.stringify({ 'guide/sub/d': [{ id: 'n1' }] }));
  const config = readJson(configFile);
  fs.writeFileSync(
    configFile,
    JSON.stringify({ ...config, favorites: [{ id: encodeURIComponent('guide/sub/d'), title: 'D' }] }),
  );

  const res = await move(request, ld.baseURL, { source: 'guide/sub', targetFolder: '', index: 0 });

  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ path: 'sub' });
  expect(fs.existsSync(path.join(ld.docsAbs, 'sub/d.md'))).toBe(true);
  expect(names(await getTree(request, ld.baseURL))[0]).toBe('sub');
  expect(Object.keys(readJson(metadataFile)).sort()).toEqual(['guide/keep', 'sub/d']);
  expect(Object.keys(readJson(annotationsFile))).toEqual(['sub/d']);
  expect(readJson(configFile).favorites).toEqual([{ id: encodeURIComponent('sub/d'), title: 'D' }]);
});

test('POST /api/tree/move rejects invalid moves without touching the disk', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'guide/sub/d.md');
  writeDoc(ld.docsAbs, 'notes/d.md');
  writeDoc(ld.docsAbs, 'guide/d.md');
  fs.mkdirSync(path.join(ld.docsAbs, 'images'), { recursive: true });

  const cases: [Record<string, unknown>, number][] = [
    [{ source: 'guide', targetFolder: 'guide', index: 0 }, 400],
    [{ source: 'guide', targetFolder: 'guide/sub', index: 0 }, 400],
    [{ source: 'guide/d.md', targetFolder: 'notes', index: 0 }, 409],
    [{ source: '../outside.md', targetFolder: '', index: 0 }, 403],
    [{ source: 'guide/d.md', targetFolder: '../..', index: 0 }, 403],
    [{ source: 'guide/d.md', targetFolder: 'images', index: 0 }, 400],
    [{ source: 'images', targetFolder: 'guide', index: 0 }, 400],
    [{ source: 'guide/liv-doc-main.md', targetFolder: 'notes', index: 0 }, 400],
    [{ source: 'guide/missing.md', targetFolder: 'notes', index: 0 }, 404],
    [{ source: 'guide/d.md', targetFolder: 'missing', index: 0 }, 404],
    [{ source: 'guide/d.md', targetFolder: 'notes', index: -1 }, 400],
    [{ source: 'guide/d.md', targetFolder: 'notes', index: 'x' }, 400],
  ];
  for (const [data, status] of cases) {
    const res = await move(request, ld.baseURL, data);
    expect(res.status(), JSON.stringify(data)).toBe(status);
  }
  expect(fs.existsSync(path.join(ld.docsAbs, 'guide/d.md'))).toBe(true);
  expect(fs.existsSync(path.join(ld.docsAbs, 'guide/sub/d.md'))).toBe(true);
  expect(fs.existsSync(path.join(ld.docsAbs, 'images'))).toBe(true);
});

test('POST /api/tree/move rewrites incoming links and the relative links of the moved document', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'notes/y.md');
  writeDoc(ld.docsAbs, 'archive/old/z.md');
  fs.mkdirSync(path.join(ld.docsAbs, 'guide'), { recursive: true });
  fs.writeFileSync(path.join(ld.docsAbs, 'guide/a.md'), '[home](../home.md) [y](../notes/y.md#s) [w](https://w.org)\n');
  fs.writeFileSync(path.join(ld.docsAbs, 'home.md'), '[a](./guide/a.md) [y](notes/y.md)\n');

  const res = await move(request, ld.baseURL, { source: 'guide/a.md', targetFolder: 'archive/old', index: 0 });

  expect(res.status()).toBe(200);
  expect(fs.readFileSync(path.join(ld.docsAbs, 'home.md'), 'utf-8')).toBe('[a](./archive/old/a.md) [y](notes/y.md)\n');
  expect(fs.readFileSync(path.join(ld.docsAbs, 'archive/old/a.md'), 'utf-8')).toBe(
    '[home](../../home.md) [y](../../notes/y.md#s) [w](https://w.org)\n',
  );
});

async function rename(
  request: import('@playwright/test').APIRequestContext,
  baseURL: string,
  data: Record<string, unknown>,
) {
  return request.put(`${baseURL}/api/tree/rename`, { data });
}

test('PUT /api/tree/rename renames a file in place, its stores and incoming links following', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'guide/a.md');
  writeDoc(ld.docsAbs, 'guide/b.md');
  writeDoc(ld.docsAbs, 'guide/c.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'guide/liv-doc-main.md'), '---\norder:\n  - c.md\n  - a.md\n  - b.md\nhidden: []\n---\n\nGuide body\n');
  fs.writeFileSync(path.join(ld.docsAbs, 'home.md'), '[a](./guide/a.md#top) [abs](/guide/a.md) [b](guide/b.md)\n\n```\n[code](./guide/a.md)\n```\n');
  const metadataFile = path.join(ld.docsAbs, '.metadata.json');
  fs.writeFileSync(metadataFile, JSON.stringify({ 'guide/a': [{ path: 'src/x.ts' }] }));

  const res = await rename(request, ld.baseURL, { path: 'guide/a.md', newName: 'alpha' });

  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ path: 'guide/alpha.md', id: encodeURIComponent('guide/alpha') });
  expect(fs.existsSync(path.join(ld.docsAbs, 'guide/a.md'))).toBe(false);
  expect(fs.readFileSync(path.join(ld.docsAbs, 'guide/alpha.md'), 'utf-8')).toContain('title: a');
  const tree = await getTree(request, ld.baseURL);
  expect(names(tree.find((n) => n.name === 'guide')?.children)).toEqual(['c.md', 'alpha.md', 'b.md']);
  expect(fs.readFileSync(path.join(ld.docsAbs, 'guide/liv-doc-main.md'), 'utf-8')).toContain('Guide body');
  expect(fs.readFileSync(path.join(ld.docsAbs, 'home.md'), 'utf-8')).toBe(
    '[a](./guide/alpha.md#top) [abs](/guide/alpha.md) [b](guide/b.md)\n\n```\n[code](./guide/a.md)\n```\n',
  );
  expect(Object.keys(readJson(metadataFile))).toEqual(['guide/alpha']);
  expect(fs.readFileSync(path.join(ld.docsAbs, 'guide/index.md'), 'utf-8')).toContain('(./alpha.md)');
});

test('PUT /api/tree/rename renames a folder: doc ids below it and links into it follow', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'guide/sub/d.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'liv-doc-main.md'), '---\norder:\n  - guide\nhidden: []\n---\n');
  fs.writeFileSync(path.join(ld.docsAbs, 'home.md'), '[d](./guide/sub/d.md)\n');
  const annotationsFile = path.join(ld.docsAbs, '.annotations.json');
  fs.writeFileSync(annotationsFile, JSON.stringify({ 'guide/sub/d': [{ id: 'n1' }] }));

  const res = await rename(request, ld.baseURL, { path: 'guide', newName: 'manual' });

  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ path: 'manual' });
  expect(fs.existsSync(path.join(ld.docsAbs, 'manual/sub/d.md'))).toBe(true);
  expect(names(await getTree(request, ld.baseURL))[0]).toBe('manual');
  expect(fs.readFileSync(path.join(ld.docsAbs, 'home.md'), 'utf-8')).toBe('[d](./manual/sub/d.md)\n');
  expect(Object.keys(readJson(annotationsFile))).toEqual(['manual/sub/d']);
});

test('PUT /api/tree/rename rejects invalid names, taken names and protected entries without touching the disk', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'guide/a.md');
  writeDoc(ld.docsAbs, 'guide/b.md');
  writeDoc(ld.docsAbs, 'guide/secret.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'guide/liv-doc-main.md'), '---\norder: []\nhidden:\n  - secret.md\n---\n');
  fs.mkdirSync(path.join(ld.docsAbs, 'images'), { recursive: true });

  const cases: [Record<string, unknown>, number][] = [
    [{ path: 'guide/a.md', newName: '' }, 400],
    [{ path: 'guide/a.md', newName: '   ' }, 400],
    [{ path: 'guide/a.md', newName: 'x/y' }, 400],
    [{ path: 'guide/a.md', newName: '..' }, 400],
    [{ path: 'guide', newName: '.' }, 400],
    [{ path: 'guide/a.md', newName: 'index' }, 400],
    [{ path: 'guide/a.md', newName: 'liv-doc-main.md' }, 400],
    [{ path: 'guide', newName: 'images' }, 400],
    [{ path: 'images', newName: 'pictures' }, 400],
    [{ path: 'guide/liv-doc-main.md', newName: 'x' }, 400],
    [{ path: 'guide/secret.md', newName: 'public' }, 400],
    [{ path: 'guide/a.md', newName: 'b' }, 409],
    [{ path: 'guide/a.md', newName: 'b.md' }, 409],
    [{ path: 'guide/missing.md', newName: 'x' }, 404],
    [{ path: '../outside.md', newName: 'x' }, 403],
    [{ path: 'guide/a.md' }, 400],
  ];
  for (const [data, status] of cases) {
    const res = await rename(request, ld.baseURL, data);
    expect(res.status(), JSON.stringify(data)).toBe(status);
  }
  expect(fs.readdirSync(path.join(ld.docsAbs, 'guide')).filter((n) => n !== 'index.md').sort()).toEqual([
    'a.md',
    'b.md',
    'liv-doc-main.md',
    'secret.md',
  ]);
  expect(fs.existsSync(path.join(ld.docsAbs, 'images'))).toBe(true);
});

test('a symlink to a Markdown file is listed as a linked document; a broken one is skipped', async ({ request, ld }) => {
  fs.writeFileSync(path.join(ld.parent, 'CLAUDE.md'), '# Claude\n');
  fs.mkdirSync(path.join(ld.docsAbs, 'AI'), { recursive: true });
  fs.symlinkSync('../../CLAUDE.md', path.join(ld.docsAbs, 'AI', 'CLAUDE.md'));
  fs.symlinkSync('../../MISSING.md', path.join(ld.docsAbs, 'AI', 'BROKEN.md'));

  const ai = (await getTree(request, ld.baseURL)).find((n) => n.name === 'AI');
  expect(names(ai?.children)).toEqual(['CLAUDE.md']);
  expect(ai?.children?.find((n) => n.name === 'CLAUDE.md')).toMatchObject({ kind: 'doc', linked: true });
});

test('linked documents cannot be moved or renamed through the tree API', async ({ request, ld }) => {
  fs.writeFileSync(path.join(ld.parent, 'CLAUDE.md'), '# Claude\n');
  writeDoc(ld.docsAbs, 'guide/a.md');
  fs.mkdirSync(path.join(ld.docsAbs, 'AI'), { recursive: true });
  fs.symlinkSync('../../CLAUDE.md', path.join(ld.docsAbs, 'AI', 'CLAUDE.md'));

  const move = await request.post(`${ld.baseURL}/api/tree/move`, {
    data: { source: 'AI/CLAUDE.md', targetFolder: 'guide', index: 0 },
  });
  expect(move.status()).toBe(400);
  const ren = await request.put(`${ld.baseURL}/api/tree/rename`, { data: { path: 'AI/CLAUDE.md', newName: 'X' } });
  expect(ren.status()).toBe(400);
  expect(fs.lstatSync(path.join(ld.docsAbs, 'AI', 'CLAUDE.md')).isSymbolicLink()).toBe(true);
});

test('DELETE /api/tree deletes a folder with its content, its manifest entry and its doc-keyed stores', async ({ request, ld }) => {
  fs.writeFileSync(path.join(ld.parent, 'CLAUDE.md'), '# Claude\n');
  writeDoc(ld.docsAbs, 'guide/a.md');
  writeDoc(ld.docsAbs, 'guide/sub/b.md');
  writeDoc(ld.docsAbs, 'guidebook/c.md');
  fs.symlinkSync('../../CLAUDE.md', path.join(ld.docsAbs, 'guide', 'CLAUDE.md'));
  fs.writeFileSync(path.join(ld.docsAbs, 'liv-doc-main.md'), '---\norder:\n  - guidebook\n  - guide\nhidden: []\n---\n\nRoot body\n');
  const metadataFile = path.join(ld.docsAbs, '.metadata.json');
  fs.writeFileSync(metadataFile, JSON.stringify({ 'guide/a': [{ path: 'src/x.ts' }], 'guidebook/c': [{ path: 'src/y.ts' }] }));
  const annotationsFile = path.join(ld.docsAbs, '.annotations.json');
  fs.writeFileSync(annotationsFile, JSON.stringify({ 'guide/sub/b': [{ id: 'n1' }], 'guidebook/c': [{ id: 'n2' }] }));

  const res = await request.delete(`${ld.baseURL}/api/tree`, { data: { path: 'guide' } });

  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ path: 'guide' });
  expect(fs.existsSync(path.join(ld.docsAbs, 'guide'))).toBe(false);
  expect(fs.readFileSync(path.join(ld.parent, 'CLAUDE.md'), 'utf-8')).toBe('# Claude\n');
  expect(names(await getTree(request, ld.baseURL)).filter((n) => !n.endsWith('.md'))).toEqual(['guidebook']);
  const manifest = fs.readFileSync(path.join(ld.docsAbs, 'liv-doc-main.md'), 'utf-8');
  expect(manifest).not.toMatch(/- guide\n/);
  expect(manifest).toContain('Root body');
  expect(Object.keys(readJson(metadataFile))).toEqual(['guidebook/c']);
  expect(Object.keys(readJson(annotationsFile))).toEqual(['guidebook/c']);
});

test('DELETE /api/tree rejects documents, protected folders and escaping paths without touching the disk', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'guide/a.md');
  writeDoc(ld.docsAbs, 'secret/s.md');
  fs.writeFileSync(path.join(ld.docsAbs, 'liv-doc-main.md'), '---\norder: []\nhidden:\n  - secret\n---\n');
  fs.mkdirSync(path.join(ld.docsAbs, 'images'), { recursive: true });
  fs.mkdirSync(path.join(ld.docsAbs, '.git'), { recursive: true });
  fs.symlinkSync('guide', path.join(ld.docsAbs, 'linked'));

  const cases: [Record<string, unknown>, number][] = [
    [{}, 400],
    [{ path: '' }, 400],
    [{ path: 'guide/a.md' }, 400],
    [{ path: 'images' }, 400],
    [{ path: '.git' }, 400],
    [{ path: 'secret' }, 400],
    [{ path: 'linked' }, 400],
    [{ path: 'missing' }, 404],
    [{ path: '.' }, 403],
    [{ path: '../outside' }, 403],
  ];
  for (const [data, status] of cases) {
    const res = await request.delete(`${ld.baseURL}/api/tree`, { data });
    expect(res.status(), JSON.stringify(data)).toBe(status);
  }
  for (const rel of ['guide/a.md', 'secret/s.md', 'images', '.git', 'linked']) {
    expect(fs.existsSync(path.join(ld.docsAbs, rel)), rel).toBe(true);
  }
});
