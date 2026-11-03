import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

const ID = '2026_01_02_10_00_[Guide]_quickstart';
const FILE = `${ID}.md`;
const LINE_COUNT = 60;
const CHANGED_LINE = 30;

const git = (cwd: string, args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf-8' });

const documentWith = (changed: string) =>
  Array.from({ length: LINE_COUNT }, (_, index) => (index + 1 === CHANGED_LINE ? changed : `line ${index + 1}`)).join('\n');

test('Versions folds unchanged lines, expands them on demand and still restores a block', async ({ page, request, ld }) => {
  const file = path.join(ld.docsAbs, FILE);
  fs.writeFileSync(file, documentWith('original text'), 'utf-8');
  git(ld.parent, ['init']);
  git(ld.parent, ['config', 'user.email', 'tests@example.com']);
  git(ld.parent, ['config', 'user.name', 'Living Documentation Tests']);
  git(ld.parent, ['add', 'testdocs']);
  git(ld.parent, ['commit', '-m', 'initial docs']);
  fs.writeFileSync(file, documentWith('edited text'), 'utf-8');
  git(ld.parent, ['commit', '-am', 'edit line']);
  await request.put(`${ld.baseURL}/api/config`, {
    data: { gitIntegration: { mode: 'enabled', pushMode: 'never', pushEveryCommits: 1, commitMessage: 'docs' } },
  });

  await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(ID)}`);
  await page.getByTestId('versions-btn').click();
  const modal = page.getByTestId('versions-modal');
  const folds = modal.getByTestId('versions-fold');
  const hiddenLine = modal.getByText('line 5', { exact: true });

  // The change and its context are visible, far lines are not.
  await expect(modal).toContainText('edited text');
  await expect(modal).toContainText('line 27');
  await expect(modal).toContainText('line 33');
  await expect(folds).toHaveCount(2);
  await expect(hiddenLine).toHaveCount(0);

  await folds.first().click();
  await expect(hiddenLine).toHaveCount(2);
  await expect(folds.first()).toHaveAttribute('aria-expanded', 'true');
  await folds.first().click();
  await expect(hiddenLine).toHaveCount(0);

  const foldAll = modal.getByTestId('versions-fold-all');
  await foldAll.click();
  await expect(hiddenLine).toHaveCount(2);
  await expect(modal.getByText('line 58', { exact: true })).toHaveCount(2);
  await foldAll.click();
  await expect(hiddenLine).toHaveCount(0);

  // Restoring makes the versions identical: a single bar remains.
  await modal.getByRole('button', { name: '<' }).click();
  await expect(modal).toContainText(/unsaved|non enregistr/i);
  await expect(folds).toHaveCount(1);
  await expect(modal.getByText('edited text')).toHaveCount(0);
});
