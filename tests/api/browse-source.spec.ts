import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';

test.describe('browse-source under a real sourceRoot', () => {
  test.use({ fixtureName: 'with-metadata' });

  test('GET /api/browse-source returns dirs+files at sourceRoot', async ({ request, ld }) => {
    const res = await request.get(`${ld.baseURL}/api/browse-source`);
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as {
      sourceRoot: string;
      current: string;
      dirs: Array<{ name: string; path: string }>;
      files: Array<{ name: string; path: string }>;
    };
    expect(body.sourceRoot).toBe(path.resolve(ld.parent, 'src'));
    expect(body.files.map((f) => f.name)).toContain('sample.ts');
  });

  test('GET /api/browse-source filters ignored heavy directories (node_modules, .git)', async ({
    request,
    ld,
  }) => {
    const srcRoot = path.resolve(ld.parent, 'src');
    fs.mkdirSync(path.join(srcRoot, 'node_modules'), { recursive: true });
    fs.mkdirSync(path.join(srcRoot, '.git'), { recursive: true });
    fs.mkdirSync(path.join(srcRoot, 'regular_dir'), { recursive: true });

    const res = await request.get(`${ld.baseURL}/api/browse-source`);
    const body = (await res.json()) as { dirs: Array<{ name: string }> };
    const names = body.dirs.map((d) => d.name);
    expect(names).toContain('regular_dir');
    expect(names).not.toContain('node_modules');
    expect(names).not.toContain('.git');
  });

  test('GET /api/browse-source rejects a path that escapes sourceRoot', async ({
    request,
    ld,
  }) => {
    const res = await request.get(
      `${ld.baseURL}/api/browse-source?path=${encodeURIComponent('../../etc')}`,
    );
    expect(res.status()).toBe(400);
  });
});
