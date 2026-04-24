import { test, expect } from '../helpers/ld-fixture';

// These tests exercise the server's parser module (src/lib/parser.ts) end-to-end,
// via GET /api/documents which calls parseFilename on every .md file. Running through
// the spawned server avoids the Playwright TS-loader transform that otherwise masks
// dist/ files from V8 coverage when they're imported directly from a test spec.

test.describe('parser fallback branches via /api/documents', () => {
  test.use({ fixtureName: 'parser-fallbacks' });

  test('default pattern with a date-only filename uses the DATE_ONLY_PAT branch', async ({
    request,
    ld,
  }) => {
    const res = await request.get(`${ld.baseURL}/api/documents`);
    const docs = (await res.json()) as Array<{ title: string; category: string; date: string | null }>;
    const noCat = docs.find((d) => d.title === 'No Category');
    expect(noCat).toBeDefined();
    expect(noCat!.category).toBe('General'); // fallback category
    expect(noCat!.date).toBe('2026-01-15T09:30');
  });

  test('a filename that matches no pattern falls back to the raw-title branch', async ({
    request,
    ld,
  }) => {
    const res = await request.get(`${ld.baseURL}/api/documents`);
    const docs = (await res.json()) as Array<{ title: string; category: string; date: string | null }>;
    const random = docs.find((d) => d.title === 'Random file');
    expect(random).toBeDefined();
    expect(random!.category).toBe('General');
    expect(random!.date).toBeNull();
  });
});

test.describe('parser hasDate-only pattern via buildPatternsFromFormat', () => {
  test.use({ fixtureName: 'parser-date-only-pattern' });

  test('pattern "YYYY_MM_DD_title" parses date + title but assigns General category', async ({
    request,
    ld,
  }) => {
    const res = await request.get(`${ld.baseURL}/api/documents`);
    const docs = (await res.json()) as Array<{ title: string; category: string; date: string | null }>;
    expect(docs).toHaveLength(1);
    expect(docs[0].title).toBe('Simple Note');
    expect(docs[0].category).toBe('General');
    expect(docs[0].date).toBe('2026-01-15');
  });
});

test.describe('parser hasCategory-only pattern via buildPatternsFromFormat', () => {
  test.use({ fixtureName: 'parser-cat-only-pattern' });

  test('pattern "[Category]_title" parses category + title with no date', async ({
    request,
    ld,
  }) => {
    const res = await request.get(`${ld.baseURL}/api/documents`);
    const docs = (await res.json()) as Array<{ title: string; category: string; date: string | null }>;
    expect(docs).toHaveLength(1);
    expect(docs[0].title).toBe('Sample Doc');
    expect(docs[0].category).toBe('Topic');
    expect(docs[0].date).toBeNull();
  });
});
