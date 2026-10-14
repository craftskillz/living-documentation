import { readOkf } from '../helpers/okf';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';
import type { APIRequestContext } from '@playwright/test';

test.describe('documents routes for extraFiles (path.isAbsolute branch)', () => {
  test.use({ fixtureName: 'with-extra-files' });

  async function findExternalDocId(request: APIRequestContext, baseURL: string): Promise<string> {
    const res = await request.get(`${baseURL}/api/documents`);
    const docs = (await res.json()) as Array<{ id: string; title: string }>;
    const external = docs.find((d) => d.title === 'External');
    if (!external) throw new Error('External doc not found in listing');
    return external.id;
  }

  test('GET /api/documents lists the extra file at the root', async ({ request, ld }) => {
    const res = await request.get(`${ld.baseURL}/api/documents`);
    const docs = (await res.json()) as Array<{ title: string; folder: string[] | null }>;
    const titles = docs.map((d) => d.title).sort();
    expect(titles).toEqual(['External', 'Inside']);
    expect(docs.find((d) => d.title === 'External')?.folder).toBeNull();
  });

  test('GET /api/documents/:id reads an extra file via its absolute-path id', async ({
    request,
    ld,
  }) => {
    const id = await findExternalDocId(request, ld.baseURL);
    const res = await request.get(`${ld.baseURL}/api/documents/${id}`);
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { content: string; html: string };
    expect(body.content).toContain('# External');
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
    expect(readOkf(onDisk).fields).toMatchObject({ type: 'Document', title: 'External' });
    expect(readOkf(onDisk).body).toBe('# Updated external\n');
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

test.describe('extraFiles folder entries', () => {
  test('a folder entry lists its .md files recursively, sorted by path, and only those are readable', async ({
    request,
    ld,
  }) => {
    const parent = path.dirname(ld.docsAbs);
    const folder = path.join(parent, '.agents');
    fs.mkdirSync(path.join(folder, 'a'), { recursive: true });
    fs.writeFileSync(path.join(folder, 'b.md'), '# Beta\n');
    fs.writeFileSync(path.join(folder, 'a', 'c.md'), '# Gamma\n');
    fs.writeFileSync(path.join(folder, 'notes.txt'), 'ignored');
    fs.writeFileSync(path.join(parent, 'outside.md'), '# Outside\n');

    const put = await request.put(`${ld.baseURL}/api/config`, {
      data: { extraFiles: ['../.agents'] },
    });
    expect(put.ok()).toBe(true);

    const docs = (await (await request.get(`${ld.baseURL}/api/documents`)).json()) as Array<{
      id: string;
      title: string;
      filename: string;
      folder: string[] | null;
    }>;
    const extras = docs.filter((d) => d.folder === null && ['c.md', 'b.md'].includes(d.filename));
    expect(extras.map((d) => d.filename)).toEqual(['c.md', 'b.md']);
    expect(docs.map((d) => d.filename)).not.toContain('outside.md');

    const read = await request.get(`${ld.baseURL}/api/documents/${extras[0].id}`);
    expect(read.ok()).toBe(true);
    expect(((await read.json()) as { content: string }).content).toContain('# Gamma');

    const outsideId = encodeURIComponent(path.join(parent, 'outside'));
    expect((await request.get(`${ld.baseURL}/api/documents/${outsideId}`)).status()).toBe(403);
  });
});
