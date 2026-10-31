import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect } from '../helpers/ld-fixture';

const ID = '2026_01_02_10_00_[Guide]_quickstart';
const FILE = `${ID}.md`;

const git = (cwd: string, args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf-8' });

// Lines 1-3 frontmatter, 6 Alpha, 8 Beta: the rendered blocks must report file lines.
const version = (alpha: string, beta: string) => `---\ntitle: History\n---\n# History\n\n${alpha}\n\n${beta}\n`;

async function selectText(page: Page, needle: string) {
  await page.evaluate((text) => {
    const root = document.querySelector('#doc-content');
    if (!root) throw new Error('no #doc-content');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = (node.textContent ?? '').indexOf(text);
      if (at < 0) continue;
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + text.length);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      return;
    }
    throw new Error(`text not found: ${text}`);
  }, needle);
}

test('Versions on a selection lists only the commits of its lines and shows only their diff', async ({ page, request, ld }) => {
  const file = path.join(ld.docsAbs, FILE);
  fs.writeFileSync(file, version('Alpha', 'Beta'), 'utf-8');
  git(ld.parent, ['init']);
  git(ld.parent, ['config', 'user.email', 'tests@example.com']);
  git(ld.parent, ['config', 'user.name', 'Living Documentation Tests']);
  git(ld.parent, ['add', 'testdocs']);
  git(ld.parent, ['commit', '-m', 'initial docs']);
  fs.writeFileSync(file, version('Alpha edited', 'Beta'), 'utf-8');
  git(ld.parent, ['commit', '-am', 'edit alpha']);
  fs.writeFileSync(file, version('Alpha edited', 'Beta edited'), 'utf-8');
  git(ld.parent, ['commit', '-am', 'edit beta']);
  await request.put(`${ld.baseURL}/api/config`, {
    data: { gitIntegration: { mode: 'enabled', pushMode: 'never', pushEveryCommits: 1, commitMessage: 'docs' } },
  });

  await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(ID)}`);
  await expect(page.locator('#doc-content')).toContainText('Beta edited');
  await selectText(page, 'Beta ed');
  await page.getByTestId('versions-btn').click();

  const modal = page.getByTestId('versions-modal');
  await expect(modal.getByTestId('versions-selection')).toContainText(/8\D+8/);
  await expect(modal).toContainText('edit beta');
  await expect(modal).toContainText('initial docs');
  await expect(modal).not.toContainText('edit alpha');
  await expect(modal).toContainText('Beta edited');
  await expect(modal).not.toContainText('Alpha');

  await modal.getByRole('button', { name: /whole document|tout le document/i }).click();
  await expect(modal.getByTestId('versions-selection')).toHaveCount(0);
  await expect(modal).toContainText('edit alpha');
});
