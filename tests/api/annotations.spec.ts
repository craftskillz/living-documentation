import { test, expect } from '../helpers/ld-fixture';

test.describe('annotations on the with-annotations fixture', () => {
  test.use({ fixtureName: 'with-annotations' });

  const DOC_ID = '2026_01_01_10_00_[General]_intro';
  const ENCODED = encodeURIComponent(DOC_ID);

  test('GET /api/annotations returns per-doc counts', async ({ request, ld }) => {
    const res = await request.get(`${ld.baseURL}/api/annotations`);
    const counts = (await res.json()) as Record<string, number>;
    const matchingKey = Object.keys(counts).find((k) => k.includes('intro'));
    expect(matchingKey).toBeDefined();
    expect(counts[matchingKey!]).toBe(1);
  });

  test('GET /api/annotations/:docId returns the fixture annotation', async ({ request, ld }) => {
    const res = await request.get(`${ld.baseURL}/api/annotations/${ENCODED}`);
    const items = (await res.json()) as Array<{ id: string; note: string }>;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('ann-fixture-1');
    expect(items[0].note).toBe('Greeting');
  });

  test('POST /api/annotations/:docId appends a new annotation', async ({ request, ld }) => {
    const res = await request.post(`${ld.baseURL}/api/annotations/${ENCODED}`, {
      data: { selectedText: 'document', note: 'Subject of the text' },
    });
    expect(res.ok()).toBe(true);
    const created = (await res.json()) as { id: string; note: string };
    expect(created.id).toBeDefined();

    const listRes = await request.get(`${ld.baseURL}/api/annotations/${ENCODED}`);
    const items = (await listRes.json()) as Array<{ id: string }>;
    expect(items.length).toBe(2);
    expect(items.some((a) => a.id === created.id)).toBe(true);
  });

  test('POST /api/annotations/:docId requires selectedText and note', async ({ request, ld }) => {
    const res = await request.post(`${ld.baseURL}/api/annotations/${ENCODED}`, {
      data: { selectedText: 'x' },
    });
    expect(res.status()).toBe(400);
  });

  test('DELETE /api/annotations/:docId/:id removes the annotation', async ({ request, ld }) => {
    const res = await request.delete(
      `${ld.baseURL}/api/annotations/${ENCODED}/ann-fixture-1`,
    );
    expect(res.ok()).toBe(true);
    const listRes = await request.get(`${ld.baseURL}/api/annotations/${ENCODED}`);
    const items = (await listRes.json()) as Array<{ id: string }>;
    expect(items.find((a) => a.id === 'ann-fixture-1')).toBeUndefined();
  });
});
