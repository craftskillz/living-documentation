import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';

test('GET /api/shape-libraries returns an empty store when none exists', async ({ request, ld }) => {
  const res = await request.get(`${ld.baseURL}/api/shape-libraries`);
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ libraries: [] });
});

test('PUT /api/shape-libraries persists sanitized custom shape libraries', async ({
  request,
  ld,
}) => {
  const res = await request.put(`${ld.baseURL}/api/shape-libraries`, {
    data: {
      libraries: [
        {
          id: 'aws services',
          name: 'AWS Services',
          shapes: [
            {
              id: 'lambda',
              name: 'Lambda',
              imageSrc: '/images/lambda.svg',
              width: 72,
              height: 72,
              labelPlacement: 'right',
              showInDiagram: false,
              anchors: [
                { id: 'top', x: 0.5, y: -1 },
                { id: 'right', x: 2, y: 0.5 },
              ],
            },
          ],
        },
      ],
    },
  });
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.libraries[0].id).toBe('aws-services');
  expect(body.libraries[0].shapes[0].labelPlacement).toBe('right');
  expect(body.libraries[0].shapes[0].showInDiagram).toBe(false);
  expect(body.libraries[0].shapes[0].anchors).toEqual([
    { id: 'top', x: 0.5, y: 0 },
    { id: 'right', x: 1, y: 0.5 },
  ]);

  const stored = JSON.parse(
    fs.readFileSync(path.join(ld.docsAbs, '.shape-libraries.json'), 'utf-8'),
  );
  expect(stored.libraries[0].shapes[0].name).toBe('Lambda');
});
