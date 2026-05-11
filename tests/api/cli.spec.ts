import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import { createServer } from 'net';
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
    timeout: 5000,
  });
}

function listFilesRecursive(root: string, current = ''): string[] {
  const dir = path.join(root, current);
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = current ? path.join(current, entry.name) : entry.name;
    if (entry.isDirectory()) {
      return listFilesRecursive(root, relativePath);
    }
    return relativePath.split(path.sep).join('/');
  });
}

function expectSymlinkTo(linkPath: string, targetPath: string) {
  expect(fs.lstatSync(linkPath).isSymbolicLink()).toBe(true);
  const actualTarget = path.resolve(path.dirname(linkPath), fs.readlinkSync(linkPath));
  expect(actualTarget).toBe(targetPath);
}

function expectRegularFile(pathToFile: string) {
  const stat = fs.lstatSync(pathToFile);
  expect(stat.isFile()).toBe(true);
  expect(stat.isSymbolicLink()).toBe(false);
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

test('CLI exits 1 on an invalid port', () => {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-cli-')));
  fs.mkdirSync(path.join(tmp, 'docs'));
  const result = runCli(['./docs', '--port', '99999'], tmp);
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/Invalid port/i);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CLI prints the listen error when the port is already in use', async () => {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-cli-port-')));
  fs.mkdirSync(path.join(tmp, 'docs'));
  const port = await pickFreePort();
  const blocker = createServer();
  await new Promise<void>((resolve, reject) => {
    blocker.once('error', reject);
    blocker.listen(port, () => resolve());
  });
  try {
    const result = runCli(['./docs', '--port', String(port)], tmp);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/EADDRINUSE|address already in use/i);
  } finally {
    await new Promise<void>((resolve) => blocker.close(() => resolve()));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('CLI exits 1 on an invalid --starter-language', () => {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-cli-')));
  const result = spawnSync('node', [CLI, '--starter-language', 'de'], {
    encoding: 'utf-8',
    env: coverageEnv(),
    cwd: tmp,
    input: './docs\n',
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/Invalid init language/i);
  expect(fs.existsSync(path.join(tmp, 'docs'))).toBe(false);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CLI --help mentions the relative-path requirement', () => {
  const result = runCli(['--help']);
  expect(result.status).toBe(0);
  expect(result.stdout).toMatch(/relative path/i);
  expect(result.stdout).not.toMatch(/--init\b/);
});

test('CLI with an existing docs folder keeps the server process alive', async ({ request }) => {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-cli-existing-')));
  const dirAbs = path.join(parent, 'documentation');
  fs.mkdirSync(dirAbs);
  fs.writeFileSync(path.join(dirAbs, '2026_01_01_10_00_[General]_intro.md'), '# Intro\n');
  const port = await pickFreePort();
  const proc = await spawnLD({
    cwd: parent,
    docsArg: './documentation',
    port,
  });
  try {
    const res = await request.get(`http://localhost:${port}/api/documents`);
    expect(res.ok()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(proc.exitCode).toBeNull();
  } finally {
    await killLD(proc);
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('CLI without folder scaffolds starter-doc and boots the server', async () => {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-cli-init-')));
  const dirAbs = path.join(parent, 'freshdocs');
  fs.mkdirSync(dirAbs);
  const port = await pickFreePort();
  const proc = await spawnLD({
    cwd: parent,
    port,
    stdin: './freshdocs\n\n',
  });
  try {
    // The starter-doc template includes .living-doc.json — verify it was copied.
    expect(fs.existsSync(path.join(dirAbs, '.living-doc.json'))).toBe(true);
    // At least one markdown file should have been scaffolded, possibly nested.
    const files = listFilesRecursive(dirAbs);
    const config = JSON.parse(fs.readFileSync(path.join(dirAbs, '.living-doc.json'), 'utf-8'));
    expect(config.language).toBe('en');
    expect(files.some((f) => f.endsWith('.md'))).toBe(true);
    expect(files).toContain('AI/2026_01_01_how_to.md');
    expect(files).toContain('AI/PROJECT-INSTRUCTIONS.md');
    expect(files).toContain('AI/PROJECT-STACK.md');
    expect(files).toContain('AI/PROJECT-USEFUL-COMMANDS.md');
    expect(files).toContain('AI/AGENTS.md');
    expect(files).toContain('AI/CLAUDE.md');
    expect(files).toContain('AI/MEMORY.md');
    expect(files).not.toContain('AI/default/AGENTS.md');
    expect(fs.existsSync(path.join(dirAbs, 'AI', 'default'))).toBe(false);
    expect(files).toContain('ADRS/2026_01_01_[ADR]_example_architecture_decision.md');
    expectRegularFile(path.join(parent, 'AGENTS.md'));
    expectRegularFile(path.join(parent, 'CLAUDE.md'));
    expectRegularFile(path.join(parent, 'memory', 'MEMORY.md'));
    const agents = fs.readFileSync(path.join(parent, 'AGENTS.md'), 'utf-8');
    const projectInstructions = fs.readFileSync(path.join(dirAbs, 'AI', 'PROJECT-INSTRUCTIONS.md'), 'utf-8');
    expect(agents).toContain('freshdocs/AI/PROJECT-INSTRUCTIONS.md');
    expect(agents).toContain('freshdocs/AI/PROJECT-STACK.md');
    expect(agents).toContain('freshdocs/AI/PROJECT-USEFUL-COMMANDS.md');
    expect(agents).not.toContain('DOCS_FOLDER');
    expect(projectInstructions).toContain('freshdocs/AI/rules/*.md');
    expect(projectInstructions).not.toContain('DOCS_FOLDER');
    expectSymlinkTo(path.join(dirAbs, 'AI', 'AGENTS.md'), path.join(parent, 'AGENTS.md'));
    expectSymlinkTo(path.join(dirAbs, 'AI', 'CLAUDE.md'), path.join(parent, 'CLAUDE.md'));
    expectSymlinkTo(path.join(dirAbs, 'AI', 'MEMORY.md'), path.join(parent, 'memory', 'MEMORY.md'));
  } finally {
    await killLD(proc);
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('CLI without folder and --starter-language fr scaffolds the French starter', async () => {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-cli-init-fr-')));
  const dirAbs = path.join(parent, 'freshdocs');
  fs.mkdirSync(dirAbs);
  const port = await pickFreePort();
  const proc = await spawnLD({
    cwd: parent,
    port,
    extraArgs: ['--starter-language', 'fr'],
    stdin: './freshdocs\n',
  });
  try {
    const config = JSON.parse(fs.readFileSync(path.join(dirAbs, '.living-doc.json'), 'utf-8'));
    const howTo = fs.readFileSync(path.join(dirAbs, 'AI', '2026_01_01_how_to.md'), 'utf-8');
    expect(config.language).toBe('fr');
    expect(howTo).toContain('Fonctionnement du contexte IA');
    expect(fs.existsSync(path.join(dirAbs, 'AI', 'default'))).toBe(false);
  } finally {
    await killLD(proc);
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('CLI without folder creates a missing target folder', async () => {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-cli-init-missing-')));
  const dirAbs = path.join(parent, 'freshdocs');
  const port = await pickFreePort();
  const proc = await spawnLD({
    cwd: parent,
    port,
    extraArgs: ['--starter-language', 'en'],
    stdin: './freshdocs\n',
  });
  try {
    expect(fs.existsSync(path.join(dirAbs, '.living-doc.json'))).toBe(true);
  } finally {
    await killLD(proc);
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('CLI without folder exits 1 when target folder is not empty', () => {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-cli-')));
  fs.mkdirSync(path.join(tmp, 'docs'));
  fs.writeFileSync(path.join(tmp, 'docs', 'existing.md'), 'x');
  const result = spawnSync('node', [CLI, '--starter-language', 'en'], {
    encoding: 'utf-8',
    env: coverageEnv(),
    cwd: tmp,
    input: './docs\n',
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/Folder is not empty/i);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CLI without folder exits 1 when root AI entry point is non-empty', () => {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-cli-')));
  fs.writeFileSync(path.join(tmp, 'AGENTS.md'), '# Existing instructions\n');
  const result = spawnSync('node', [CLI, '--starter-language', 'en'], {
    encoding: 'utf-8',
    env: coverageEnv(),
    cwd: tmp,
    input: './docs\n',
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/AGENTS\.md already exists and is not empty/i);
  expect(fs.existsSync(path.join(tmp, 'docs'))).toBe(false);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CLI without folder replaces empty root files with starter copies and AI symlinks', async () => {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-cli-init-empty-links-')));
  const dirAbs = path.join(parent, 'freshdocs');
  fs.writeFileSync(path.join(parent, 'AGENTS.md'), '');
  fs.writeFileSync(path.join(parent, 'CLAUDE.md'), '');
  fs.mkdirSync(path.join(parent, 'memory'));
  fs.writeFileSync(path.join(parent, 'memory', 'MEMORY.md'), '');
  const port = await pickFreePort();
  const proc = await spawnLD({
    cwd: parent,
    port,
    extraArgs: ['--starter-language', 'en'],
    stdin: './freshdocs\n',
  });
  try {
    expectRegularFile(path.join(parent, 'AGENTS.md'));
    expectRegularFile(path.join(parent, 'CLAUDE.md'));
    expectRegularFile(path.join(parent, 'memory', 'MEMORY.md'));
    expect(fs.readFileSync(path.join(parent, 'AGENTS.md'), 'utf-8')).toContain('AGENTS.md');
    expect(fs.readFileSync(path.join(parent, 'CLAUDE.md'), 'utf-8')).toContain('CLAUDE.md');
    expect(fs.readFileSync(path.join(parent, 'memory', 'MEMORY.md'), 'utf-8')).toContain('Memory Index');
    expectSymlinkTo(path.join(dirAbs, 'AI', 'AGENTS.md'), path.join(parent, 'AGENTS.md'));
    expectSymlinkTo(path.join(dirAbs, 'AI', 'CLAUDE.md'), path.join(parent, 'CLAUDE.md'));
    expectSymlinkTo(path.join(dirAbs, 'AI', 'MEMORY.md'), path.join(parent, 'memory', 'MEMORY.md'));
  } finally {
    await killLD(proc);
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
