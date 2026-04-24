import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';

test.describe('metadata routes on the with-metadata fixture', () => {
  test.use({ fixtureName: 'with-metadata' });

  const DOC_ID = '2026_01_01_10_00_[General]_intro';
  const ENCODED = encodeURIComponent(DOC_ID);

  test('GET /api/metadata/:docId reports status=unchanged + accuracy=1', async ({
    request,
    ld,
  }) => {
    const res = await request.get(`${ld.baseURL}/api/metadata/${ENCODED}`);
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as {
      items: Array<{ path: string; status: string }>;
      accuracy: number;
    };
    expect(body.items).toHaveLength(1);
    expect(body.items[0].status).toBe('unchanged');
    expect(body.accuracy).toBe(1);
  });

  test('GET /api/metadata/:docId flips to status=modified after editing the source file', async ({
    request,
    ld,
  }) => {
    fs.writeFileSync(
      path.resolve(ld.parent, 'src/sample.ts'),
      'export const x = 42; // drift\n',
    );
    const res = await request.get(`${ld.baseURL}/api/metadata/${ENCODED}`);
    const body = (await res.json()) as {
      items: Array<{ status: string }>;
      accuracy: number;
      modified: number;
    };
    expect(body.items[0].status).toBe('modified');
    expect(body.modified).toBe(1);
    expect(body.accuracy).toBe(0);
  });

  test('GET /api/metadata/:docId reports status=missing when the source file is deleted', async ({
    request,
    ld,
  }) => {
    fs.unlinkSync(path.resolve(ld.parent, 'src/sample.ts'));
    const res = await request.get(`${ld.baseURL}/api/metadata/${ENCODED}`);
    const body = (await res.json()) as {
      items: Array<{ status: string }>;
      missing: number;
    };
    expect(body.items[0].status).toBe('missing');
    expect(body.missing).toBe(1);
  });

  test('POST /api/metadata/:docId adds a new source-file entry', async ({ request, ld }) => {
    fs.writeFileSync(path.resolve(ld.parent, 'src/second.ts'), 'export const y = 1;\n');
    const res = await request.post(`${ld.baseURL}/api/metadata/${ENCODED}`, {
      data: { path: 'second.ts' },
    });
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { items: Array<{ path: string }> };
    expect(body.items.map((i) => i.path).sort()).toEqual(['sample.ts', 'second.ts']);
  });

  test('POST /api/metadata/:docId rejects a path that escapes sourceRoot', async ({
    request,
    ld,
  }) => {
    const res = await request.post(`${ld.baseURL}/api/metadata/${ENCODED}`, {
      data: { path: '../../etc/passwd' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/metadata/:docId rejects a missing path field', async ({ request, ld }) => {
    const res = await request.post(`${ld.baseURL}/api/metadata/${ENCODED}`, { data: {} });
    expect(res.status()).toBe(400);
  });

  test('DELETE /api/metadata/:docId removes the entry for a given source path', async ({
    request,
    ld,
  }) => {
    const res = await request.delete(`${ld.baseURL}/api/metadata/${ENCODED}`, {
      data: { path: 'sample.ts' },
    });
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { items: Array<unknown> };
    expect(body.items).toHaveLength(0);
  });

  test('POST /api/metadata/:docId/refresh re-baselines modified entries back to unchanged', async ({
    request,
    ld,
  }) => {
    fs.writeFileSync(
      path.resolve(ld.parent, 'src/sample.ts'),
      'export const x = 99;\n',
    );
    const before = await request.get(`${ld.baseURL}/api/metadata/${ENCODED}`);
    expect(((await before.json()) as { items: [{ status: string }] }).items[0].status).toBe(
      'modified',
    );

    const refresh = await request.post(
      `${ld.baseURL}/api/metadata/${ENCODED}/refresh`,
      { data: {} },
    );
    expect(refresh.ok()).toBe(true);
    const after = (await refresh.json()) as { items: Array<{ status: string }>; accuracy: number };
    expect(after.items[0].status).toBe('unchanged');
    expect(after.accuracy).toBe(1);
  });
});
