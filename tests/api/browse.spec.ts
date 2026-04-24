import fs from 'fs';
import path from 'path';
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
  expect(dirs).toContain(path.join('a', 'b'));
  expect(dirs).toContain(path.join('a', 'b', 'c'));
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
