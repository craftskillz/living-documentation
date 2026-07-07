import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

// POST /api/documents/:id/move — moves a doc's .md file to another folder.
// The doc id encodes the relative path, so a move returns a NEW id.
const INTRO_ID = encodeURIComponent('2026_01_01_10_00_[General]_intro');

test.describe('documents move API', () => {
  test('moves a root doc into a subfolder and returns the new identity', async ({ request, ld }) => {
    const res = await request.post(`${ld.baseURL}/api/documents/${INTRO_ID}/move`, {
      data: { folder: 'Todo' },
    });
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { id: string; filename: string; folder: string[] | null };
    expect(decodeURIComponent(body.id)).toBe('Todo/2026_01_01_10_00_[General]_intro');
    expect(body.filename).toBe('Todo/2026_01_01_10_00_[General]_intro.md');
    expect(body.folder).toEqual(['Todo']);

    expect(fs.existsSync(path.join(ld.docsAbs, 'Todo/2026_01_01_10_00_[General]_intro.md'))).toBe(true);
    expect(fs.existsSync(path.join(ld.docsAbs, '2026_01_01_10_00_[General]_intro.md'))).toBe(false);
  });

  test('normalizes the target folder name (accents and spaces)', async ({ request, ld }) => {
    const res = await request.post(`${ld.baseURL}/api/documents/${INTRO_ID}/move`, {
      data: { folder: 'À faire' },
    });
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { folder: string[] | null };
    expect(body.folder).toEqual(['A_faire']);
    expect(fs.existsSync(path.join(ld.docsAbs, 'A_faire/2026_01_01_10_00_[General]_intro.md'))).toBe(true);
  });

  test('moving to the same folder is a no-op that returns the current identity', async ({ request, ld }) => {
    // First move into Todo, then "move" to Todo again.
    await request.post(`${ld.baseURL}/api/documents/${INTRO_ID}/move`, { data: { folder: 'Todo' } });
    const movedId = encodeURIComponent('Todo/2026_01_01_10_00_[General]_intro');
    const res = await request.post(`${ld.baseURL}/api/documents/${movedId}/move`, {
      data: { folder: 'Todo' },
    });
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { id: string; folder: string[] | null };
    expect(decodeURIComponent(body.id)).toBe('Todo/2026_01_01_10_00_[General]_intro');
    expect(body.folder).toEqual(['Todo']);
    expect(fs.existsSync(path.join(ld.docsAbs, 'Todo/2026_01_01_10_00_[General]_intro.md'))).toBe(true);
  });

  test('blocks path traversal via the folder argument', async ({ request, ld }) => {
    const res = await request.post(`${ld.baseURL}/api/documents/${INTRO_ID}/move`, {
      data: { folder: '../../etc' },
    });
    expect(res.status()).toBe(403);
    expect(fs.existsSync(path.join(ld.docsAbs, '2026_01_01_10_00_[General]_intro.md'))).toBe(true);
  });

  test('rejects the reserved "images" folder name', async ({ request, ld }) => {
    const res = await request.post(`${ld.baseURL}/api/documents/${INTRO_ID}/move`, {
      data: { folder: 'images' },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/reserved/i);
  });

  test('returns 409 when a document with the same name already exists in the target folder', async ({ request, ld }) => {
    const targetDir = path.join(ld.docsAbs, 'Todo');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, '2026_01_01_10_00_[General]_intro.md'),
      '# Already there\n',
      'utf-8',
    );

    const res = await request.post(`${ld.baseURL}/api/documents/${INTRO_ID}/move`, {
      data: { folder: 'Todo' },
    });
    expect(res.status()).toBe(409);
    // Source untouched.
    expect(fs.existsSync(path.join(ld.docsAbs, '2026_01_01_10_00_[General]_intro.md'))).toBe(true);
  });

  test('returns 400 when folder is missing', async ({ request, ld }) => {
    const res = await request.post(`${ld.baseURL}/api/documents/${INTRO_ID}/move`, {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('returns 404 for an unknown document id', async ({ request, ld }) => {
    const res = await request.post(
      `${ld.baseURL}/api/documents/${encodeURIComponent('2026_01_09_10_00_[General]_ghost')}/move`,
      { data: { folder: 'Todo' } },
    );
    expect(res.status()).toBe(404);
  });
});

test.describe('documents move API — metadata key migration', () => {
  test.use({ fixtureName: 'with-metadata' });

  test('renames the .metadata.json key to the new doc id', async ({ request, ld }) => {
    const res = await request.post(`${ld.baseURL}/api/documents/${INTRO_ID}/move`, {
      data: { folder: 'Todo' },
    });
    expect(res.ok()).toBe(true);

    const store = JSON.parse(
      fs.readFileSync(path.join(ld.docsAbs, '.metadata.json'), 'utf-8'),
    ) as Record<string, unknown[]>;
    expect(store['2026_01_01_10_00_[General]_intro']).toBeUndefined();
    expect(store['Todo/2026_01_01_10_00_[General]_intro']).toHaveLength(1);
    // Unrelated entries untouched.
    expect(store['2026_01_02_10_00_[ADR]_superseded']).toHaveLength(1);
  });
});
