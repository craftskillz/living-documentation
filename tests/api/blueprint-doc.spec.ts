import { test, expect } from '../helpers/ld-fixture';

test.use({ fixtureName: 'blueprint-edit' });

type Lookup = { found: boolean; doc?: { id: string; filename: string } };

test('a legacy `_[NAME]_` blueprint document is still found by its source folder', async ({ request, ld }) => {
  const res = await request.get(`${ld.baseURL}/api/blueprint/blueprint-adr?folder=alpha`);
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as Lookup;
  expect(body.found).toBe(true);
  expect(body.doc?.filename).toBe('BLUEPRINT/2026_01_01_10_00_[ALPHA]_alpha.md');
});

test('a new blueprint document is named after its source folder, not its title', async ({ request, ld }) => {
  const created = await request.post(`${ld.baseURL}/api/documents`, {
    data: { title: 'Bloc Beta', name: 'beta', folder: 'BLUEPRINT' },
  });
  expect(created.ok()).toBeTruthy();
  expect(((await created.json()) as { filename: string }).filename).toBe('BLUEPRINT/beta.md');

  const body = (await (await request.get(`${ld.baseURL}/api/blueprint/blueprint-adr?folder=beta`)).json()) as Lookup;
  expect(body.found).toBe(true);
  expect(body.doc?.filename).toBe('BLUEPRINT/beta.md');

  const missing = (await (await request.get(`${ld.baseURL}/api/blueprint/blueprint-adr?folder=gamma`)).json()) as Lookup;
  expect(missing.found).toBe(false);
});
