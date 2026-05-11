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
  expect(body.files).toBe(3); // minimal fixture has 3 .md files
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
