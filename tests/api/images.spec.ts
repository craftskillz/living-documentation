import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';

// 1x1 transparent PNG (67 bytes) — reused across tests.
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

test('POST /api/images/upload saves a base64 image to DOCS/images/ and returns the filename', async ({
  request,
  ld,
}) => {
  const res = await request.post(`${ld.baseURL}/api/images/upload`, {
    data: { data: `data:image/png;base64,${TINY_PNG_B64}`, ext: 'png' },
  });
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { filename: string };
  expect(body.filename).toMatch(/^image_\d{4}_\d{2}_\d{2}_\d{6}_[a-z0-9]+\.png$/);
  expect(fs.existsSync(path.join(ld.docsAbs, 'images', body.filename))).toBe(true);
});

test('POST /api/images/upload rejects a missing data field', async ({ request, ld }) => {
  const res = await request.post(`${ld.baseURL}/api/images/upload`, { data: {} });
  expect(res.status()).toBe(400);
});

test('uploaded image is served statically at /images/<filename>', async ({ request, ld }) => {
  const upload = await request.post(`${ld.baseURL}/api/images/upload`, {
    data: { data: TINY_PNG_B64, ext: 'png' },
  });
  const { filename } = (await upload.json()) as { filename: string };
  const served = await request.get(`${ld.baseURL}/images/${filename}`);
  expect(served.ok()).toBe(true);
  expect(served.headers()['content-type']).toMatch(/image\/png/);
});
