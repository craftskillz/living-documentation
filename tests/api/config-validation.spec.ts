import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

const LEGACY_NOMENCLATURE_KEYS = ['filenamePattern', 'sidebarSort', 'exclusiveCategoryExpansion'];

test('legacy nomenclature keys are ignored on start and never written back', async ({ request, ld }) => {
  // The minimal fixture still stores filenamePattern and exclusiveCategoryExpansion.
  const cfg = (await (await request.get(`${ld.baseURL}/api/config`)).json()) as Record<string, unknown>;
  for (const key of LEGACY_NOMENCLATURE_KEYS) expect(cfg).not.toHaveProperty(key);

  const res = await request.put(`${ld.baseURL}/api/config`, {
    data: { title: 'Renamed', filenamePattern: '[Category]_title', sidebarSort: 'oldest', exclusiveCategoryExpansion: true },
  });
  expect(res.ok()).toBeTruthy();
  const stored = JSON.parse(fs.readFileSync(path.join(ld.docsAbs, '.living-doc.json'), 'utf-8')) as Record<string, unknown>;
  expect(stored.title).toBe('Renamed');
  for (const key of LEGACY_NOMENCLATURE_KEYS) expect(stored).not.toHaveProperty(key);
});

test('PUT /api/config silently drops an invalid language', async ({ request, ld }) => {
  const res = await request.put(`${ld.baseURL}/api/config`, {
    data: { language: 'de' },
  });
  expect(res.ok()).toBe(true);
  const cfg = await (await request.get(`${ld.baseURL}/api/config`)).json();
  expect(['en', 'fr']).toContain(cfg.language);
});

test('PUT /api/config rejects a negative codeBlockMaxHeight', async ({ request, ld }) => {
  const res = await request.put(`${ld.baseURL}/api/config`, {
    data: { codeBlockMaxHeight: -10 },
  });
  expect(res.status()).toBe(400);
});

test('PUT /api/config clamps codeBlockMaxHeight to the 5000 upper bound', async ({
  request,
  ld,
}) => {
  const res = await request.put(`${ld.baseURL}/api/config`, {
    data: { codeBlockMaxHeight: 99999 },
  });
  expect(res.ok()).toBe(true);
  const cfg = await (await request.get(`${ld.baseURL}/api/config`)).json();
  expect(cfg.codeBlockMaxHeight).toBe(5000);
});

test('PUT /api/config rejects blockedFileExtensions when not an array', async ({
  request,
  ld,
}) => {
  const res = await request.put(`${ld.baseURL}/api/config`, {
    data: { blockedFileExtensions: 'exe sh' },
  });
  expect(res.status()).toBe(400);
});

test('PUT /api/config normalises blockedFileExtensions (strips dots, lowercases, filters garbage)', async ({
  request,
  ld,
}) => {
  const res = await request.put(`${ld.baseURL}/api/config`, {
    data: { blockedFileExtensions: ['.EXE', 'sh', 'bad stuff', 'msi!', 'com'] },
  });
  expect(res.ok()).toBe(true);
  const cfg = await (await request.get(`${ld.baseURL}/api/config`)).json();
  expect(cfg.blockedFileExtensions).toEqual(['exe', 'sh', 'com']);
});

test('PUT /api/config accepts a custom diagramNodePalette array', async ({ request, ld }) => {
  const palette = Array(15).fill('#123456');
  const res = await request.put(`${ld.baseURL}/api/config`, {
    data: { diagramNodePalette: palette },
  });
  expect(res.ok()).toBe(true);
  const cfg = await (await request.get(`${ld.baseURL}/api/config`)).json();
  expect(cfg.diagramNodePalette).toEqual(palette);
});

test('PUT /api/config silently ignores a non-array diagramEdgePalette', async ({
  request,
  ld,
}) => {
  const before = await (await request.get(`${ld.baseURL}/api/config`)).json();
  const res = await request.put(`${ld.baseURL}/api/config`, {
    data: { diagramEdgePalette: 'not-an-array' },
  });
  expect(res.ok()).toBe(true);
  const after = await (await request.get(`${ld.baseURL}/api/config`)).json();
  expect(after.diagramEdgePalette).toEqual(before.diagramEdgePalette);
});
