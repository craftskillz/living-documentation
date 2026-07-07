import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { test, expect } from '../helpers/ld-fixture';
import { callTool } from '../helpers/mcp';

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' });
}

function initRepo(parent: string): void {
  git(parent, ['init']);
  git(parent, ['config', 'user.email', 'tests@example.com']);
  git(parent, ['config', 'user.name', 'Living Documentation Tests']);
  git(parent, ['add', '.']);
  git(parent, ['commit', '-m', 'initial']);
}

interface BuildContextResult {
  task: string;
  workspace: { sourceRoot: string; docsFolder: string; gitRoot: string | null };
  git: { branch: string | null; headCommit: string | null; dirty: boolean | null } | null;
  changes: {
    base: string;
    totalFiles: number;
    truncated: boolean;
    files: Array<{ path: string; status: string; untracked: boolean; staged: boolean; diff: string | null; diffTruncated: boolean }>;
  };
  source: { skipped: string | null; files: Array<{ path: string; content: string; size: number; truncated: boolean }> };
  documentation: { relatedDocuments: Array<{ id: string; title: string; category: string; folder: string | null; matchedPaths: string[]; accuracy: number }> };
  metadata: { generatedAt: string; options: Record<string, unknown> };
}

test.describe('build_context MCP tool on the with-metadata fixture', () => {
  test.use({ fixtureName: 'with-metadata' });

  const DOC_ID = '2026_01_01_10_00_[General]_intro';

  test('reports the diff and full content of a modified tracked source file', async ({ request, ld }) => {
    initRepo(ld.parent);
    fs.writeFileSync(path.resolve(ld.parent, 'src/sample.ts'), 'export const x = 42; // drift\n');

    const body = await callTool<BuildContextResult>(request, ld.baseURL, 'build_context', { task: 'code-review' });

    expect(body.git).not.toBeNull();
    expect(body.git?.dirty).toBe(true);
    expect(body.changes.files).toHaveLength(1);
    expect(body.changes.files[0].path).toBe('sample.ts');
    expect(body.changes.files[0].status).toBe('M');
    expect(body.changes.files[0].untracked).toBe(false);
    expect(body.changes.files[0].diff).toContain('drift');
    expect(body.source.skipped).toBeNull();
    expect(body.source.files).toHaveLength(1);
    expect(body.source.files[0].path).toBe('sample.ts');
    expect(body.source.files[0].content).toContain('drift');
  });

  test('surfaces docs already bound to a changed file, with their accuracy', async ({ request, ld }) => {
    initRepo(ld.parent);
    fs.writeFileSync(path.resolve(ld.parent, 'src/sample.ts'), 'export const x = 42; // drift\n');

    const body = await callTool<BuildContextResult>(request, ld.baseURL, 'build_context', { task: 'code-review' });

    const doc = body.documentation.relatedDocuments.find((d) => decodeURIComponent(d.id) === DOC_ID);
    expect(doc).toBeDefined();
    expect(doc?.matchedPaths).toContain('sample.ts');
    expect(doc?.accuracy).toBe(0);
  });

  test('reports an untracked new source file without a diff', async ({ request, ld }) => {
    initRepo(ld.parent);
    fs.writeFileSync(path.resolve(ld.parent, 'src/second.ts'), 'export const y = 1;\n');

    const body = await callTool<BuildContextResult>(request, ld.baseURL, 'build_context', { task: 'code-review' });

    const file = body.changes.files.find((f) => f.path === 'second.ts');
    expect(file).toBeDefined();
    expect(file?.untracked).toBe(true);
    expect(file?.diff).toBeNull();
    expect(body.source.files.map((f) => f.path)).toContain('second.ts');
  });

  test('rejects a missing task parameter', async ({ request, ld }) => {
    initRepo(ld.parent);
    await expect(callTool(request, ld.baseURL, 'build_context', {})).rejects.toThrow();
  });
});

test.describe("build_context MCP tool on the minimal fixture (sourceRoot defaults to the docs folder's parent)", () => {
  test.use({ fixtureName: 'minimal' });

  test('skips source content when only a Markdown doc changed', async ({ request, ld }) => {
    initRepo(ld.parent);
    fs.appendFileSync(
      path.resolve(ld.parent, 'testdocs/2026_01_01_10_00_[General]_intro.md'),
      '\nExtra line.\n',
    );

    const body = await callTool<BuildContextResult>(request, ld.baseURL, 'build_context', { task: 'documentation' });

    expect(body.source.skipped).toBe('docs-only change');
    expect(body.source.files).toHaveLength(0);
    expect(body.changes.files.map((f) => f.path)).toContain('testdocs/2026_01_01_10_00_[General]_intro.md');
  });

  test('degrades gracefully when sourceRoot is not a git repository', async ({ request, ld }) => {
    const body = await callTool<BuildContextResult>(request, ld.baseURL, 'build_context', { task: 'code-review' });

    expect(body.git).toBeNull();
    expect(body.workspace.gitRoot).toBeNull();
    expect(body.changes.files).toHaveLength(0);
    expect(body.source.files).toHaveLength(0);
  });
});
