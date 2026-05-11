import { test, expect } from '../helpers/ld-fixture';

function sniffZipMagic(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05);
}

test('POST /api/export/html returns a zip when folders are selected (notion mode)', async ({
  request,
  ld,
}) => {
  const res = await request.post(`${ld.baseURL}/api/export/html`, {
    data: { folders: ['General'], mode: 'notion' },
  });
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toMatch(/application\/zip/);
  const buf = Buffer.from(await res.body());
  expect(sniffZipMagic(buf)).toBe(true);
  expect(buf.length).toBeGreaterThan(100);
});

test('POST /api/export/html supports confluence mode', async ({ request, ld }) => {
  const res = await request.post(`${ld.baseURL}/api/export/html`, {
    data: { folders: ['General'], mode: 'confluence' },
  });
  expect(res.ok()).toBe(true);
  const buf = Buffer.from(await res.body());
  expect(sniffZipMagic(buf)).toBe(true);
});

test('POST /api/export/html rejects an empty folder list', async ({ request, ld }) => {
  const res = await request.post(`${ld.baseURL}/api/export/html`, {
    data: { folders: [], mode: 'notion' },
  });
  expect(res.status()).toBe(400);
});

test('POST /api/export/html returns 404 when selected folders contain no docs', async ({
  request,
  ld,
}) => {
  const res = await request.post(`${ld.baseURL}/api/export/html`, {
    data: { folders: ['__nonexistent__'], mode: 'notion' },
  });
  expect(res.status()).toBe(404);
});

test('POST /api/export/markdown returns a zip of all documents', async ({ request, ld }) => {
  const res = await request.post(`${ld.baseURL}/api/export/markdown`, { data: {} });
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toMatch(/application\/zip/);
  const buf = Buffer.from(await res.body());
  expect(sniffZipMagic(buf)).toBe(true);
});
