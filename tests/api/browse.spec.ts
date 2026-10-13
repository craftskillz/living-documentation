import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

test('GET /api/browse returns dirs and .md files at a given path', async ({ request, ld }) => {
  const res = await request.get(
    `${ld.baseURL}/api/browse?path=${encodeURIComponent(ld.docsAbs)}`,
  );
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as {
    dirs: Array<{ name: string }>;
    files: Array<{ name: string }>;
    current: string;
  };
  const fileNames = body.files.map((f) => f.name).sort();
  expect(fileNames).toContain('2026_01_01_10_00_[General]_intro.md');
  expect(fileNames).toContain('2026_01_02_10_00_[Guide]_quickstart.md');
  expect(fileNames).toContain('2026_01_03_10_00_[Guide]_advanced.md');
});

test('GET /api/browse returns 400 for an unreadable path', async ({ request, ld }) => {
  const res = await request.get(
    `${ld.baseURL}/api/browse?path=${encodeURIComponent('/this/really/does/not/exist')}`,
  );
  expect(res.status()).toBe(400);
});

test('GET /api/browse/alldirs recursively lists subdirectories', async ({ request, ld }) => {
  // Create a nested subfolder tree inside docs.
  fs.mkdirSync(path.join(ld.docsAbs, 'a/b/c'), { recursive: true });
  const res = await request.get(
    `${ld.baseURL}/api/browse/alldirs?path=${encodeURIComponent(ld.docsAbs)}`,
  );
  expect(res.ok()).toBe(true);
  const dirs = (await res.json()) as string[];
  expect(dirs).toContain('a');
  expect(dirs).toContain('a/b');
  expect(dirs).toContain('a/b/c');
  expect(dirs).not.toContain('a\\b');
  expect(dirs).not.toContain('a\\b\\c');
});

test('POST /api/browse/mkdir creates a directory', async ({ request, ld }) => {
  const newDir = path.join(ld.docsAbs, 'created_by_test');
  const res = await request.post(`${ld.baseURL}/api/browse/mkdir`, {
    data: { path: newDir },
  });
  expect(res.ok()).toBe(true);
  expect(fs.existsSync(newDir)).toBe(true);
  expect(fs.statSync(newDir).isDirectory()).toBe(true);
});

test('POST /api/browse/mkdir normalizes spaces, accents, and special characters', async ({
  request,
  ld,
}) => {
  const rawDir = path.join(ld.docsAbs, '204_CONNAISSANCE PERSONNE déjà!');
  const normalizedDir = path.join(ld.docsAbs, '204_CONNAISSANCE_PERSONNE_deja');
  const res = await request.post(`${ld.baseURL}/api/browse/mkdir`, {
    data: { path: rawDir },
  });
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { created: string };
  expect(body.created).toBe(normalizedDir);
  expect(fs.existsSync(normalizedDir)).toBe(true);
  expect(fs.existsSync(rawDir)).toBe(false);
});

test('POST /api/browse/mkdir rejects the reserved "files" folder at docs root', async ({
  request,
  ld,
}) => {
  const res = await request.post(`${ld.baseURL}/api/browse/mkdir`, {
    data: { path: path.join(ld.docsAbs, 'files') },
  });
  expect(res.status()).toBe(400);
});

test('POST /api/browse/mkdir rejects a missing path', async ({ request, ld }) => {
  const res = await request.post(`${ld.baseURL}/api/browse/mkdir`, { data: {} });
  expect(res.status()).toBe(400);
});

test('GET /api/browse/alldirs lists dot folders inside the docs folder, but not .git or node_modules', async ({ request, ld }) => {
  for (const dir of ['.scratch/inner', '.git/objects', 'node_modules/pkg']) {
    fs.mkdirSync(path.join(ld.docsAbs, dir), { recursive: true });
  }
  const res = await request.get(`${ld.baseURL}/api/browse/alldirs?path=${encodeURIComponent(ld.docsAbs)}`);
  const dirs = (await res.json()) as string[];
  expect(dirs).toContain('.scratch');
  expect(dirs).toContain('.scratch/inner');
  expect(dirs.filter((d) => d.startsWith('.git') || d.startsWith('node_modules'))).toEqual([]);

  const browse = await request.get(`${ld.baseURL}/api/browse?path=${encodeURIComponent(ld.docsAbs)}`);
  const names = ((await browse.json()) as { dirs: Array<{ name: string }> }).dirs.map((d) => d.name);
  expect(names).toContain('.scratch');
  expect(names).not.toContain('.git');
});

test('POST /api/browse/mkdir creates a liv-doc-main.md manifest in the new docs folder', async ({ request, ld }) => {
  const newDir = path.join(ld.docsAbs, 'guide');
  const res = await request.post(`${ld.baseURL}/api/browse/mkdir`, { data: { path: newDir } });
  expect(res.ok()).toBe(true);
  const manifest = fs.readFileSync(path.join(newDir, 'liv-doc-main.md'), 'utf-8');
  expect(manifest).toMatch(/^---\norder: \[\]\nhidden: \[\]\n---\n/);
});

test('POST /api/browse/mkdir appends the new folder to a non-empty parent order', async ({ request, ld }) => {
  const parent = path.join(ld.docsAbs, 'parent');
  fs.mkdirSync(parent);
  fs.writeFileSync(path.join(parent, 'liv-doc-main.md'), '---\norder:\n  - a.md\nhidden: []\n---\n\nParent folder.\n');
  const res = await request.post(`${ld.baseURL}/api/browse/mkdir`, { data: { path: path.join(parent, 'child') } });
  expect(res.ok()).toBe(true);
  const manifest = fs.readFileSync(path.join(parent, 'liv-doc-main.md'), 'utf-8');
  expect(manifest).toContain('order:\n  - a.md\n  - child\n');
  expect(manifest).toContain('Parent folder.');
});

test('POST /api/browse/mkdir leaves an empty parent order untouched', async ({ request, ld }) => {
  const parent = path.join(ld.docsAbs, 'parent');
  fs.mkdirSync(parent);
  const original = '---\norder: []\nhidden: []\n---\n';
  fs.writeFileSync(path.join(parent, 'liv-doc-main.md'), original);
  await request.post(`${ld.baseURL}/api/browse/mkdir`, { data: { path: path.join(parent, 'child') } });
  expect(fs.readFileSync(path.join(parent, 'liv-doc-main.md'), 'utf-8')).toBe(original);
});

test('POST /api/browse/mkdir does not create a manifest outside the docs folder', async ({ request, ld }) => {
  const outside = path.join(path.dirname(ld.docsAbs), `outside_${Date.now()}`);
  const res = await request.post(`${ld.baseURL}/api/browse/mkdir`, { data: { path: outside } });
  expect(res.ok()).toBe(true);
  expect(fs.existsSync(path.join(outside, 'liv-doc-main.md'))).toBe(false);
  fs.rmSync(outside, { recursive: true, force: true });
});
