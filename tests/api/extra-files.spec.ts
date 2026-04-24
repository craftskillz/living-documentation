import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';

test.describe('documents routes for extraFiles (path.isAbsolute branch)', () => {
  test.use({ fixtureName: 'with-extra-files' });

  async function findExternalDocId(request: any, baseURL: string): Promise<string> {
    const res = await request.get(`${baseURL}/api/documents`);
    const docs = (await res.json()) as Array<{ id: string; title: string; category: string }>;
    const external = docs.find(
      (d) => d.title === 'External' && d.category === 'General',
    );
    if (!external) throw new Error('External doc not found in listing');
    return external.id;
  }

  test('GET /api/documents lists the extra file under General', async ({ request, ld }) => {
    const res = await request.get(`${ld.baseURL}/api/documents`);
    const docs = (await res.json()) as Array<{ title: string; category: string }>;
    const titles = docs.map((d) => d.title).sort();
    expect(titles).toEqual(['External', 'Inside']);
    expect(docs.find((d) => d.title === 'External')?.category).toBe('General');
  });

  test('GET /api/documents/:id reads an extra file via its absolute-path id', async ({
    request,
    ld,
  }) => {
    const id = await findExternalDocId(request, ld.baseURL);
    const res = await request.get(`${ld.baseURL}/api/documents/${id}`);
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { content: string; html: string; category: string };
    expect(body.content).toContain('# External');
    expect(body.category).toBe('General');
    expect(body.html).toContain('<h1');
  });

  test('GET /api/documents/:id returns 403 for an absolute id not in the whitelist', async ({
    request,
    ld,
  }) => {
    const fakeAbs = encodeURIComponent('/tmp/not-whitelisted-file');
    const res = await request.get(`${ld.baseURL}/api/documents/${fakeAbs}`);
    expect(res.status()).toBe(403);
  });

  test('GET /api/documents/:id returns 404 when the whitelisted file is missing on disk', async ({
    request,
    ld,
  }) => {
    // Capture the id while the file is still present — listDocs hides extraFiles
    // that don't exist on disk, so we must grab the id before unlinking.
    const id = await findExternalDocId(request, ld.baseURL);
    fs.unlinkSync(path.join(ld.parent, 'external.md'));
    const res = await request.get(`${ld.baseURL}/api/documents/${id}`);
    expect(res.status()).toBe(404);
  });

  test('PUT /api/documents/:id overwrites an extra file on disk', async ({ request, ld }) => {
    const id = await findExternalDocId(request, ld.baseURL);
    const res = await request.put(`${ld.baseURL}/api/documents/${id}`, {
      data: { content: '# Updated external\n' },
    });
    expect(res.ok()).toBe(true);
    const onDisk = fs.readFileSync(path.join(ld.parent, 'external.md'), 'utf-8');
    expect(onDisk).toBe('# Updated external\n');
  });

  test('PUT /api/documents/:id returns 403 for an absolute id not whitelisted', async ({
    request,
    ld,
  }) => {
    const fakeAbs = encodeURIComponent('/tmp/not-whitelisted');
    const res = await request.put(`${ld.baseURL}/api/documents/${fakeAbs}`, {
      data: { content: 'x' },
    });
    expect(res.status()).toBe(403);
  });

  test('DELETE /api/documents/:id removes the extra file from disk', async ({
    request,
    ld,
  }) => {
    const id = await findExternalDocId(request, ld.baseURL);
    const absPath = path.join(ld.parent, 'external.md');
    expect(fs.existsSync(absPath)).toBe(true);
    const res = await request.delete(`${ld.baseURL}/api/documents/${id}`);
    expect(res.ok()).toBe(true);
    expect(fs.existsSync(absPath)).toBe(false);
  });

  test('DELETE /api/documents/:id returns 404 when an extra file was already removed', async ({
    request,
    ld,
  }) => {
    const id = await findExternalDocId(request, ld.baseURL);
    fs.unlinkSync(path.join(ld.parent, 'external.md'));
    const res = await request.delete(`${ld.baseURL}/api/documents/${id}`);
    expect(res.status()).toBe(404);
  });

  test('DELETE /api/documents/:id returns 403 for an absolute id not whitelisted', async ({
    request,
    ld,
  }) => {
    const fakeAbs = encodeURIComponent('/tmp/not-whitelisted');
    const res = await request.delete(`${ld.baseURL}/api/documents/${fakeAbs}`);
    expect(res.status()).toBe(403);
  });
});
