import { readOkf } from '../helpers/okf';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';
import { defined } from '../helpers/assert';

// The minimal fixture has: Intro (General), Quickstart (Guide), Advanced (Guide).
const INTRO_ID = encodeURIComponent('2026_01_01_10_00_[General]_intro');
const QUICKSTART_ID = encodeURIComponent('2026_01_02_10_00_[Guide]_quickstart');

test('GET /api/documents returns the three minimal fixture docs', async ({ request, ld }) => {
  const res = await request.get(`${ld.baseURL}/api/documents`);
  expect(res.ok()).toBe(true);
  const docs = (await res.json()) as Array<{ title: string }>;
  expect(docs.map((d) => d.title).sort()).toEqual(['Advanced', 'Intro', 'Quickstart']);
  expect(docs[0]).not.toHaveProperty('category');
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
  expect(readOkf(onDisk).fields).toMatchObject({ type: 'Document', title: 'Quickstart' });
  expect(readOkf(onDisk).body).toBe('# Edited\n\nNew body.');
});

test('PUT /api/documents/:id rejects a missing content field', async ({ request, ld }) => {
  const res = await request.put(`${ld.baseURL}/api/documents/${INTRO_ID}`, { data: {} });
  expect(res.status()).toBe(400);
});

test('POST /api/documents names the file after the title slug and stores title and timestamp in the frontmatter', async ({
  request,
  ld,
}) => {
  const res = await request.post(`${ld.baseURL}/api/documents`, {
    data: { title: 'Mon guide' },
  });
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { filename: string; id: string; title: string; date: string | null };
  expect(body.filename).toBe('mon-guide.md');
  expect(body.id).toBe('mon-guide');
  expect(body.title).toBe('Mon guide');
  expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  const content = fs.readFileSync(path.join(ld.docsAbs, 'mon-guide.md'), 'utf-8');
  expect(content).toMatch(/^title: Mon guide$/m);
  expect(content).toMatch(/^timestamp: /m);
});

test('POST /api/documents requires a title', async ({ request, ld }) => {
  const res = await request.post(`${ld.baseURL}/api/documents`, { data: {} });
  expect(res.status()).toBe(400);
});

test('POST /api/documents rejects the reserved "images" folder name', async ({ request, ld }) => {
  const res = await request.post(`${ld.baseURL}/api/documents`, {
    data: { title: 'X', folder: 'images' },
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
    data: { title: 'Evil', folder: '../../etc' },
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
  expect(counts[defined(introKey)]).toBe(1);
});

test('GET /api/documents/file-counts ignores placeholder file-link examples', async ({
  request,
  ld,
}) => {
  fs.writeFileSync(
    path.join(ld.docsAbs, '2026_01_01_10_00_[General]_intro.md'),
    [
      '# Intro',
      '',
      '- Convention: `[name](./files/<filename>)`.',
      '- Concrete link: [attestation.pdf](/files/20260428093235_zped_attestation.pdf).',
      '',
    ].join('\n'),
  );

  const res = await request.get(`${ld.baseURL}/api/documents/file-counts`);
  expect(res.ok()).toBe(true);
  const counts = (await res.json()) as Record<string, number>;
  const introKey = Object.keys(counts).find((k) => decodeURIComponent(k).includes('intro'));
  expect(introKey).toBeDefined();
  expect(counts[defined(introKey)]).toBe(1);
});

test('POST /api/documents suffixes the slug when a document with that name already exists', async ({
  request,
  ld,
}) => {
  const first = await request.post(`${ld.baseURL}/api/documents`, { data: { title: 'Mon guide' } });
  const second = await request.post(`${ld.baseURL}/api/documents`, { data: { title: 'Mon guide' } });
  expect(((await first.json()) as { filename: string }).filename).toBe('mon-guide.md');
  expect(((await second.json()) as { filename: string }).filename).toBe('mon-guide-2.md');
});

test('POST /api/documents creates the target subfolder when it does not exist yet', async ({
  request,
  ld,
}) => {
  const res = await request.post(`${ld.baseURL}/api/documents`, {
    data: { title: 'Nested', folder: 'deep/nested' },
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

test('DELETE /api/documents/:id unlinks incoming links and purges metadata, favorites and diagram evidence', async ({
  request,
  ld,
}) => {
  fs.mkdirSync(path.join(ld.docsAbs, 'guide'), { recursive: true });
  fs.writeFileSync(path.join(ld.docsAbs, 'guide', 'x.md'), '# X\n');
  fs.writeFileSync(path.join(ld.docsAbs, 'home.md'), 'See [x](./guide/x.md) and [y](./guide/y.md).\n');
  fs.writeFileSync(path.join(ld.docsAbs, '.metadata.json'), JSON.stringify({ 'guide/x': [{ path: 'src/x.ts' }], home: [] }));
  const configFile = path.join(ld.docsAbs, '.living-doc.json');
  const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  fs.writeFileSync(configFile, JSON.stringify({ ...config, favorites: [{ id: encodeURIComponent('guide/x'), title: 'X' }] }));
  const diagramsFile = path.join(ld.docsAbs, '.diagrams.json');
  fs.writeFileSync(
    diagramsFile,
    JSON.stringify({ diagrams: [{ id: 'd1', nodes: [], edges: [{ id: 'e1', evidence: [{ documentId: encodeURIComponent('guide/x') }] }] }] }),
  );

  const res = await request.delete(`${ld.baseURL}/api/documents/${encodeURIComponent('guide/x')}`);

  expect(res.ok()).toBe(true);
  expect(fs.readFileSync(path.join(ld.docsAbs, 'home.md'), 'utf-8')).toBe('See x and [y](./guide/y.md).\n');
  expect(Object.keys(JSON.parse(fs.readFileSync(path.join(ld.docsAbs, '.metadata.json'), 'utf-8')))).toEqual(['home']);
  expect(JSON.parse(fs.readFileSync(configFile, 'utf-8')).favorites).toEqual([]);
  expect(JSON.parse(fs.readFileSync(diagramsFile, 'utf-8')).diagrams[0].edges[0].evidence).toEqual([]);
});

test('GET /api/documents skips a broken symlink instead of failing', async ({ request, ld }) => {
  fs.mkdirSync(path.join(ld.docsAbs, 'AI'), { recursive: true });
  fs.symlinkSync('../../MISSING.md', path.join(ld.docsAbs, 'AI', 'CLAUDE.md'));

  const res = await request.get(`${ld.baseURL}/api/documents`);
  expect(res.ok()).toBe(true);
  const docs = (await res.json()) as Array<{ id: string }>;
  expect(docs.length).toBeGreaterThan(0);
  expect(docs.map((d) => d.id).join(' ')).not.toContain('CLAUDE');
});
