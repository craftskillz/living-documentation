import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';

// The minimal fixture has: Intro (General), Quickstart (Guide), Advanced (Guide).
const INTRO_ID = encodeURIComponent('2026_01_01_10_00_[General]_intro');
const QUICKSTART_ID = encodeURIComponent('2026_01_02_10_00_[Guide]_quickstart');

test('GET /api/documents returns the three minimal fixture docs', async ({ request, ld }) => {
  const res = await request.get(`${ld.baseURL}/api/documents`);
  expect(res.ok()).toBe(true);
  const docs = (await res.json()) as Array<{ title: string; category: string }>;
  expect(docs.map((d) => d.title).sort()).toEqual(['Advanced', 'Intro', 'Quickstart']);
  expect(docs.find((d) => d.title === 'Intro')?.category).toBe('General');
});

test('GET /api/documents/:id returns parsed metadata, content, and rendered HTML', async ({
  request,
  ld,
}) => {
  const res = await request.get(`${ld.baseURL}/api/documents/${INTRO_ID}`);
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { title: string; content: string; html: string };
  expect(body.title).toBe('Intro');
  expect(body.content).toContain('# Introduction');
  expect(body.html).toContain('<h1');
  expect(body.html).toContain('Introduction');
});

test('GET /api/documents/:id returns 404 for an unknown doc id', async ({ request, ld }) => {
  const res = await request.get(`${ld.baseURL}/api/documents/does_not_exist`);
  expect(res.status()).toBe(404);
});

test('PUT /api/documents/:id persists new markdown to disk', async ({ request, ld }) => {
  const res = await request.put(`${ld.baseURL}/api/documents/${QUICKSTART_ID}`, {
    data: { content: '# Edited\n\nNew body.' },
  });
  expect(res.ok()).toBe(true);
  const onDisk = fs.readFileSync(
    path.join(ld.docsAbs, '2026_01_02_10_00_[Guide]_quickstart.md'),
    'utf-8',
  );
  expect(onDisk).toBe('# Edited\n\nNew body.');
});

test('PUT /api/documents/:id rejects a missing content field', async ({ request, ld }) => {
  const res = await request.put(`${ld.baseURL}/api/documents/${INTRO_ID}`, { data: {} });
  expect(res.status()).toBe(400);
});

test('POST /api/documents creates a new .md file with a filename matching the pattern', async ({
  request,
  ld,
}) => {
  const res = await request.post(`${ld.baseURL}/api/documents`, {
    data: { title: 'Brand New Doc', category: 'Release' },
  });
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { filename?: string; id?: string };
  const created = fs
    .readdirSync(ld.docsAbs)
    .filter((f) => f.includes('brand_new_doc') && f.endsWith('.md'));
  expect(created.length).toBe(1);
  expect(created[0]).toMatch(/\[RELEASE\]/);
  expect(body.id || body.filename).toBeDefined();
});

test('POST /api/documents requires a title', async ({ request, ld }) => {
  const res = await request.post(`${ld.baseURL}/api/documents`, { data: {} });
  expect(res.status()).toBe(400);
});

test('POST /api/documents rejects the reserved "images" folder name', async ({ request, ld }) => {
  const res = await request.post(`${ld.baseURL}/api/documents`, {
    data: { title: 'X', category: 'Test', folder: 'images' },
  });
  expect(res.status()).toBe(400);
  const body = (await res.json()) as { error?: string };
  expect(body.error).toMatch(/reserved/i);
});

test('POST /api/documents blocks path traversal via the folder argument', async ({
  request,
  ld,
}) => {
  const res = await request.post(`${ld.baseURL}/api/documents`, {
    data: { title: 'Evil', category: 'Test', folder: '../../etc' },
  });
  expect(res.status()).toBe(403);
});

test('DELETE /api/documents/:id removes the file from disk', async ({ request, ld }) => {
  const docPath = path.join(ld.docsAbs, '2026_01_03_10_00_[Guide]_advanced.md');
  expect(fs.existsSync(docPath)).toBe(true);
  const res = await request.delete(
    `${ld.baseURL}/api/documents/${encodeURIComponent('2026_01_03_10_00_[Guide]_advanced')}`,
  );
  expect(res.ok()).toBe(true);
  expect(fs.existsSync(docPath)).toBe(false);
});

test('DELETE /api/documents/:id returns 404 for an unknown id', async ({ request, ld }) => {
  const res = await request.delete(`${ld.baseURL}/api/documents/nope_nope_nope`);
  expect(res.status()).toBe(404);
});

test('GET /api/documents/search finds docs by content, returning an excerpt', async ({
  request,
  ld,
}) => {
  const res = await request.get(`${ld.baseURL}/api/documents/search?q=quickstart`);
  expect(res.ok()).toBe(true);
  const results = (await res.json()) as Array<{ title: string; excerpt: string }>;
  expect(results.length).toBeGreaterThan(0);
  expect(results.some((r) => r.title === 'Quickstart')).toBe(true);
});

test('GET /api/documents/search with empty q returns an empty array', async ({ request, ld }) => {
  const res = await request.get(`${ld.baseURL}/api/documents/search?q=`);
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual([]);
});

test.describe('metadata:// search', () => {
  test.use({ fixtureName: 'with-metadata' });

  test('GET /api/documents/search?q=metadata://sample.ts finds the doc with that entry', async ({
    request,
    ld,
  }) => {
    const res = await request.get(
      `${ld.baseURL}/api/documents/search?q=${encodeURIComponent('metadata://sample.ts')}`,
    );
    expect(res.ok()).toBe(true);
    const results = (await res.json()) as Array<{ title: string; excerpt: string }>;
    expect(results.some((r) => r.title === 'Intro')).toBe(true);
  });
});

test('GET /api/documents/file-counts returns attachment counts per doc', async ({
  request,
  ld,
}) => {
  // Add a file link to Intro to make the count non-zero.
  fs.writeFileSync(
    path.join(ld.docsAbs, '2026_01_01_10_00_[General]_intro.md'),
    '# Intro\n\n[attached](./files/foo.txt)\n',
  );
  const res = await request.get(`${ld.baseURL}/api/documents/file-counts`);
  expect(res.ok()).toBe(true);
  const counts = (await res.json()) as Record<string, number>;
  const introKey = Object.keys(counts).find((k) => decodeURIComponent(k).includes('intro'));
  expect(introKey).toBeDefined();
  expect(counts[introKey!]).toBe(1);
});

test('POST /api/documents returns 409 when a document with that slug already exists', async ({
  request,
  ld,
}) => {
  const first = await request.post(`${ld.baseURL}/api/documents`, {
    data: { title: 'Same Title', category: 'GENERAL' },
  });
  expect(first.ok()).toBe(true);
  const second = await request.post(`${ld.baseURL}/api/documents`, {
    data: { title: 'Same Title', category: 'GENERAL' },
  });
  expect(second.status()).toBe(409);
});

test('POST /api/documents creates the target subfolder when it does not exist yet', async ({
  request,
  ld,
}) => {
  const res = await request.post(`${ld.baseURL}/api/documents`, {
    data: { title: 'Nested', category: 'GENERAL', folder: 'deep/nested' },
  });
  expect(res.ok()).toBe(true);
  expect(fs.existsSync(path.join(ld.docsAbs, 'deep', 'nested'))).toBe(true);
  const files = fs.readdirSync(path.join(ld.docsAbs, 'deep', 'nested'));
  expect(files.some((f) => f.includes('nested.md'))).toBe(true);
});

test('DELETE /api/documents/:id also removes matching annotations from .annotations.json', async ({
  request,
  ld,
}) => {
  const docId = '2026_01_01_10_00_[General]_intro';
  // Pre-populate annotations store with an entry for this doc.
  fs.writeFileSync(
    path.join(ld.docsAbs, '.annotations.json'),
    JSON.stringify({
      [docId]: [{ id: 'a1', selectedText: 't', contextBefore: '', contextAfter: '', note: 'n', createdAt: '' }],
      'other-doc': [{ id: 'a2', selectedText: 't', contextBefore: '', contextAfter: '', note: 'keep', createdAt: '' }],
    }),
  );

  const res = await request.delete(
    `${ld.baseURL}/api/documents/${encodeURIComponent(docId)}`,
  );
  expect(res.ok()).toBe(true);

  const store = JSON.parse(
    fs.readFileSync(path.join(ld.docsAbs, '.annotations.json'), 'utf-8'),
  );
  expect(store[docId]).toBeUndefined();
  expect(store['other-doc']).toBeDefined(); // untouched
});
