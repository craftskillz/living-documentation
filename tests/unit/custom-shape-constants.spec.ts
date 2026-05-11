import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';

function readNumericConst(file: string, name: string): number {
  const source = fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf-8');
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\d+)`));
  if (!match) throw new Error(`Missing constant ${name} in ${file}`);
  return Number(match[1]);
}

test('custom shape default size stays aligned between backend and frontend', () => {
  const backend = readNumericConst(
    'src/routes/shape-libraries.ts',
    'CUSTOM_SHAPE_DEFAULT_SIZE',
  );
  const frontend = readNumericConst(
    'src/frontend/diagram/custom-shapes.js',
    'CUSTOM_SHAPE_DEFAULT_SIZE',
  );

  expect(backend).toBe(frontend);
});
