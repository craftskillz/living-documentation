import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

test('graph endpoint exposes concept links and serves its frontend route', async ({ request, ld }) => {
  fs.writeFileSync(path.join(ld.docsAbs, 'graph-a.md'), '---\ntype: Concept\ntitle: Graph A\n---\n[B](./graph-b.md)');
  fs.writeFileSync(path.join(ld.docsAbs, 'graph-b.md'), '---\ntype: Concept\ntitle: Graph B\n---\nbody');
  const response = await request.get(`${ld.baseURL}/api/graph`);
  expect(response.ok()).toBe(true);
  const graph = await response.json();
  expect(graph.nodes).toContainEqual({ id: 'graph-a', title: 'Graph A', type: 'Concept', folder: null });
  expect(graph.edges).toContainEqual({ from: 'graph-a', to: 'graph-b' });
  expect(graph.nodes.some((node: { id: string }) => ['index', 'log'].includes(node.id))).toBe(false);
  const page = await request.get(`${ld.baseURL}/graph`);
  expect(page.ok()).toBe(true);
  expect(await page.text()).toContain('<div id="app">');
});
