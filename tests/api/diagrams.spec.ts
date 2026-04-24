import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';

test.describe('diagrams CRUD on the with-diagrams fixture', () => {
  test.use({ fixtureName: 'with-diagrams' });

  test('GET /api/diagrams returns id+title tuples from .diagrams.json', async ({
    request,
    ld,
  }) => {
    const res = await request.get(`${ld.baseURL}/api/diagrams`);
    expect(res.ok()).toBe(true);
    const diagrams = (await res.json()) as Array<{ id: string; title: string }>;
    expect(diagrams).toEqual([{ id: 'diag-1', title: 'Sample Diagram' }]);
  });

  test('GET /api/diagrams/:id returns the full diagram including nodes and edges', async ({
    request,
    ld,
  }) => {
    const res = await request.get(`${ld.baseURL}/api/diagrams/diag-1`);
    expect(res.ok()).toBe(true);
    const diagram = (await res.json()) as {
      id: string;
      nodes: Array<{ id: string }>;
      edges: Array<{ id: string }>;
    };
    expect(diagram.id).toBe('diag-1');
    expect(diagram.nodes.map((n) => n.id).sort()).toEqual(['n1', 'n2']);
    expect(diagram.edges.map((e) => e.id)).toEqual(['e1']);
  });

  test('GET /api/diagrams/:id returns 404 for an unknown id', async ({ request, ld }) => {
    const res = await request.get(`${ld.baseURL}/api/diagrams/not-found`);
    expect(res.status()).toBe(404);
  });

  test('PUT /api/diagrams/:id updates an existing diagram', async ({ request, ld }) => {
    const res = await request.put(`${ld.baseURL}/api/diagrams/diag-1`, {
      data: { title: 'Updated', nodes: [], edges: [] },
    });
    expect(res.ok()).toBe(true);
    const stored = JSON.parse(
      fs.readFileSync(path.join(ld.docsAbs, '.diagrams.json'), 'utf-8'),
    ) as Array<{ id: string; title: string }>;
    const entry = stored.find((d) => d.id === 'diag-1');
    expect(entry?.title).toBe('Updated');
  });

  test('PUT /api/diagrams/:id creates a new diagram if the id does not exist yet', async ({
    request,
    ld,
  }) => {
    const res = await request.put(`${ld.baseURL}/api/diagrams/diag-new`, {
      data: {
        title: 'Fresh',
        nodes: [{ id: 'x', label: 'x', shapeType: 'box', colorKey: 'c-red' }],
        edges: [],
      },
    });
    expect(res.ok()).toBe(true);
    const stored = JSON.parse(
      fs.readFileSync(path.join(ld.docsAbs, '.diagrams.json'), 'utf-8'),
    ) as Array<{ id: string }>;
    expect(stored.some((d) => d.id === 'diag-new')).toBe(true);
  });

  test('DELETE /api/diagrams/:id removes the entry', async ({ request, ld }) => {
    const res = await request.delete(`${ld.baseURL}/api/diagrams/diag-1`);
    expect(res.ok()).toBe(true);
    const listRes = await request.get(`${ld.baseURL}/api/diagrams`);
    const diagrams = (await listRes.json()) as Array<{ id: string }>;
    expect(diagrams.find((d) => d.id === 'diag-1')).toBeUndefined();
  });
});
