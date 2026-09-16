import { test, expect } from '../helpers/ld-fixture';

test('GET /api/wordcloud returns text from all matching files under a path', async ({
  request,
  ld,
}) => {
  const res = await request.get(
    `${ld.baseURL}/api/wordcloud?path=${encodeURIComponent(ld.docsAbs)}&ext=md`,
  );
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as {
    files: number;
    fileTexts: Array<{ path: string; text: string }>;
  };
  expect(body.fileTexts.map((file) => file.path).sort()).toEqual([
    '2026_01_01_10_00_[General]_intro.md',
    '2026_01_02_10_00_[Guide]_quickstart.md',
    '2026_01_03_10_00_[Guide]_advanced.md',
    'index.md',
    'log.md',
  ]);
  expect(body.files).toBe(body.fileTexts.length);
  const combined = body.fileTexts.map((f) => f.text).join('\n');
  expect(combined).toContain('Welcome to the test documentation');
  expect(combined).toContain('Quickstart');
});

test('GET /api/wordcloud returns 400 for a non-existent path', async ({ request, ld }) => {
  const res = await request.get(
    `${ld.baseURL}/api/wordcloud?path=${encodeURIComponent('/really/not/here')}`,
  );
  expect(res.status()).toBe(400);
});

test('GET /api/wordcloud filters by requested extensions only', async ({ request, ld }) => {
  const res = await request.get(
    `${ld.baseURL}/api/wordcloud?path=${encodeURIComponent(ld.docsAbs)}&ext=ts`,
  );
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { files: number };
  expect(body.files).toBe(0);
});
