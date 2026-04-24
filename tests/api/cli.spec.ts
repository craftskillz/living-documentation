import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';
import { coverageEnv } from '../helpers/coverage';

const CLI = path.resolve(__dirname, '../../dist/bin/cli.js');

function runCli(args: string[]) {
  return spawnSync('node', [CLI, ...args], {
    encoding: 'utf-8',
    env: coverageEnv(),
  });
}

test('CLI rejects an absolute docs folder argument', () => {
  const result = runCli(['/tmp/abs-path']);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toMatch(/must be a relative path/i);
});

test('CLI rejects a tilde-prefixed docs folder argument', () => {
  const result = runCli(['~/foo']);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toMatch(/must be a relative path/i);
});

test('CLI --help mentions the relative-path requirement', () => {
  const result = runCli(['--help']);
  expect(result.status).toBe(0);
  expect(result.stdout).toMatch(/relative path/i);
});
