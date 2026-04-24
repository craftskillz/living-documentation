import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const CLI = path.resolve(__dirname, '../../dist/bin/cli.js');

test('CLI rejects an absolute docs folder argument', () => {
  const result = spawnSync('node', [CLI, '/tmp/abs-path'], { encoding: 'utf-8' });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toMatch(/must be a relative path/i);
});

test('CLI rejects a tilde-prefixed docs folder argument', () => {
  const result = spawnSync('node', [CLI, '~/foo'], { encoding: 'utf-8' });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toMatch(/must be a relative path/i);
});

test('CLI --help mentions the relative-path requirement', () => {
  const result = spawnSync('node', [CLI, '--help'], { encoding: 'utf-8' });
  expect(result.status).toBe(0);
  expect(result.stdout).toMatch(/relative path/i);
});
