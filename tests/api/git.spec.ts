import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';

const QUICKSTART_ID = encodeURIComponent('2026_01_02_10_00_[Guide]_quickstart');

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' });
}

function initRepo(parent: string): void {
  git(parent, ['init']);
  git(parent, ['config', 'user.email', 'tests@example.com']);
  git(parent, ['config', 'user.name', 'Living Documentation Tests']);
  git(parent, ['add', 'testdocs']);
  git(parent, ['commit', '-m', 'initial docs']);
}

test('GET /api/git/status reports the default unconfigured state', async ({ request, ld }) => {
  const res = await request.get(`${ld.baseURL}/api/git/status`);
  expect(res.ok()).toBe(true);
  const body = await res.json() as { mode: string; ok: boolean; message: string };
  expect(body.mode).toBe('unconfigured');
  expect(body.ok).toBe(true);
  expect(body.message).toContain('not configured');
});

test('enabled Git integration commits docsFolder changes inside a parent repository only', async ({
  request,
  ld,
}) => {
  initRepo(ld.parent);
  fs.writeFileSync(path.join(ld.parent, 'outside.txt'), 'outside dirty change\n', 'utf-8');

  const config = await request.put(`${ld.baseURL}/api/config`, {
    data: {
      gitIntegration: {
        mode: 'enabled',
        pushMode: 'never',
        pushEveryCommits: 1,
        commitMessage: 'docs: update living documentation',
      },
    },
  });
  expect(config.ok()).toBe(true);

  const save = await request.put(`${ld.baseURL}/api/documents/${QUICKSTART_ID}`, {
    data: { content: '# Edited by Git integration test\n' },
  });
  expect(save.ok()).toBe(true);

  const log = git(ld.parent, ['log', '--oneline', '--format=%s']);
  expect(log.split('\n').filter(Boolean).filter((line) => line === 'docs: update living documentation').length)
    .toBeGreaterThanOrEqual(2);

  const changedInLastCommit = git(ld.parent, ['show', '--name-only', '--format=', 'HEAD'])
    .split('\n')
    .filter(Boolean);
  expect(changedInLastCommit).toContain('testdocs/2026_01_02_10_00_[Guide]_quickstart.md');
  expect(changedInLastCommit).not.toContain('outside.txt');

  const status = git(ld.parent, ['status', '--porcelain']);
  expect(status).toContain('?? outside.txt');

  const gitStatus = await request.get(`${ld.baseURL}/api/git/status`);
  expect(gitStatus.ok()).toBe(true);
  const body = await gitStatus.json() as {
    mode: string;
    ok: boolean;
    repoRoot: string;
    docsPathspec: string;
    dirtyOutsideDocsCount: number;
  };
  expect(body.mode).toBe('enabled');
  expect(body.ok).toBe(true);
  expect(body.repoRoot).toBe(ld.parent);
  expect(body.docsPathspec).toBe('testdocs');
  expect(body.dirtyOutsideDocsCount).toBe(1);
});

test('GET /api/git/document-versions defaults to previous document commit versus HEAD', async ({
  request,
  ld,
}) => {
  initRepo(ld.parent);

  const quickstartPath = path.join(ld.docsAbs, '2026_01_02_10_00_[Guide]_quickstart.md');
  fs.writeFileSync(quickstartPath, '# Committed HEAD version\n', 'utf-8');
  git(ld.parent, ['add', 'testdocs/2026_01_02_10_00_[Guide]_quickstart.md']);
  git(ld.parent, ['commit', '-m', 'update quickstart']);

  const config = await request.put(`${ld.baseURL}/api/config`, {
    data: {
      gitIntegration: {
        mode: 'enabled',
        pushMode: 'never',
        pushEveryCommits: 1,
        commitMessage: 'docs: update living documentation',
      },
    },
  });
  expect(config.ok()).toBe(true);

  const res = await request.get(
    `${ld.baseURL}/api/git/document-versions?documentId=${encodeURIComponent(QUICKSTART_ID)}&sinceDays=30`,
  );
  expect(res.ok()).toBe(true);
  const body = await res.json() as {
    ok: boolean;
    relativePath: string;
    baseRef: string;
    baseContent: string;
    headRef: string;
    headContent: string;
    commits: Array<{ shortHash: string; subject: string }>;
  };
  expect(body.ok).toBe(true);
  expect(body.relativePath).toBe('testdocs/2026_01_02_10_00_[Guide]_quickstart.md');
  expect(body.baseRef).toBeTruthy();
  expect(body.baseRef).not.toBe('HEAD');
  expect(body.baseContent).toContain('# Quickstart');
  expect(body.baseContent).not.toContain('Committed HEAD version');
  expect(body.headRef).toBe('HEAD');
  expect(body.headContent).toContain('Committed HEAD version');
  expect(body.commits.some((commit) => commit.subject === 'initial docs')).toBe(true);
  expect(body.commits.some((commit) => commit.subject === 'update quickstart')).toBe(true);
});
