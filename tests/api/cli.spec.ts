import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { coverageEnv } from '../helpers/coverage';
import { pickFreePort, spawnLD, killLD } from '../helpers/server';

const CLI = path.resolve(__dirname, '../../dist/bin/cli.js');

function runCli(args: string[], cwd?: string) {
  return spawnSync('node', [CLI, ...args], {
    encoding: 'utf-8',
    env: coverageEnv(),
    cwd,
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

test('CLI exits 1 when the folder does not exist', () => {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-cli-')));
  const result = runCli(['./does-not-exist-anywhere'], tmp);
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/Folder not found/i);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CLI exits 1 when the given path is a file, not a directory', () => {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-cli-')));
  fs.writeFileSync(path.join(tmp, 'notadir'), 'content');
  const result = runCli(['./notadir'], tmp);
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/Not a directory/i);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CLI exits 1 when --init is run on a non-empty folder', () => {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-cli-')));
  fs.mkdirSync(path.join(tmp, 'docs'));
  fs.writeFileSync(path.join(tmp, 'docs', 'existing.md'), 'x');
  const result = runCli(['./docs', '--init'], tmp);
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/Folder is not empty/i);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CLI exits 1 on an invalid port', () => {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-cli-')));
  fs.mkdirSync(path.join(tmp, 'docs'));
  const result = runCli(['./docs', '--port', '99999'], tmp);
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/Invalid port/i);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CLI --help mentions the relative-path requirement', () => {
  const result = runCli(['--help']);
  expect(result.status).toBe(0);
  expect(result.stdout).toMatch(/relative path/i);
});

test('CLI --init on an empty folder scaffolds starting-doc and boots the server', async () => {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-cli-init-')));
  const dirAbs = path.join(parent, 'freshdocs');
  fs.mkdirSync(dirAbs);
  const port = await pickFreePort();
  const proc = await spawnLD({
    cwd: parent,
    docsArg: './freshdocs',
    port,
    extraArgs: ['--init'],
  });
  try {
    // The starting-doc template includes .living-doc.json — verify it was copied.
    expect(fs.existsSync(path.join(dirAbs, '.living-doc.json'))).toBe(true);
    // At least one markdown file should have been scaffolded.
    const files = fs.readdirSync(dirAbs);
    expect(files.some((f) => f.endsWith('.md'))).toBe(true);
  } finally {
    await killLD(proc);
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
