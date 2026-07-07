import { test, expect } from '../helpers/ld-fixture';
import type { Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

// The saved-result link renders as "📄 <relative path>" — strip the emoji prefix.
async function savedResultPath(result: Locator): Promise<string> {
  const text = (await result.locator('a').first().textContent())?.trim() ?? '';
  return text.replace(/^📄\s*/, '').trim();
}

test('AI Context page shows orientation and creates an AI rule', async ({ page, ld }) => {
  let configRequestCount = 0;
  fs.writeFileSync(path.join(ld.parent, 'AGENTS.md'), '# Agent rules\n', 'utf-8');

  page.on('request', (request) => {
    if (request.url() === `${ld.baseURL}/api/config`) {
      configRequestCount += 1;
    }
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${ld.baseURL}/context`);

  // ── Panels render ──────────────────────────────────────────────────────────
  await expect(page.getByRole('heading', { name: 'AI orientation' })).toBeVisible();
  await expect(page.getByTestId('rules-title')).toHaveText('AI rules');
  await expect(page.getByTestId('mcp-title')).toHaveText('MCP explorer');
  await expect(page.getByTestId('mcp-endpoint')).toContainText('POST /mcp');
  await expect(page.getByTestId('mcp-tool-list')).toContainText('create_document');

  // ── Layout: MCP explorer sits below the rules; add-rule aside is to the right ─
  const rulesBox = await page.getByTestId('rules-title').boundingBox();
  const mcpBox = await page.getByTestId('mcp-title').boundingBox();
  const addRuleBox = await page.getByTestId('add-rule-title').boundingBox();
  expect(rulesBox && mcpBox && mcpBox.y > rulesBox.y).toBe(true);
  expect(rulesBox && addRuleBox && addRuleBox.x > rulesBox.x).toBe(true);

  // ── create_document: schema is exposed ──────────────────────────────────────
  const toolList = page.getByTestId('mcp-tool-list');
  const createDocumentTool = toolList.locator('details').filter({
    has: page.locator('summary').getByText('create_document', { exact: true }),
  });
  await createDocumentTool.locator('summary').click();
  await expect(createDocumentTool).toContainText('Input schema');
  await expect(createDocumentTool).toContainText('"title"');

  // ── get_server_guide: run + persisted markdown ──────────────────────────────
  const guideTool = toolList.locator('details').filter({
    has: page.locator('summary').getByText('get_server_guide', { exact: true }),
  });
  await guideTool.locator('summary').click();
  await guideTool.getByRole('button', { name: 'Run tool' }).click();
  await expect(guideTool.getByTestId('mcp-result')).toContainText('Saved to:');
  const guideResultPath = await savedResultPath(guideTool.getByTestId('mcp-result'));
  expect(guideResultPath).toBeTruthy();
  const guideResultMd = fs.readFileSync(path.join(ld.docsAbs, guideResultPath), 'utf-8');
  expect(guideResultMd).toContain('## Résultat\n\n# Living Documentation');
  expect(guideResultMd).not.toContain('## Résultat\n\n```text');

  // ── list_documents: run + persisted markdown shape ──────────────────────────
  const listDocumentsTool = toolList.locator('details').filter({
    has: page.locator('summary').getByText('list_documents', { exact: true }),
  });
  await listDocumentsTool.locator('summary').click();
  await listDocumentsTool.getByRole('button', { name: 'Run tool' }).click();
  await expect(listDocumentsTool.getByTestId('mcp-result')).toContainText('Saved to:');
  await expect(listDocumentsTool.getByTestId('mcp-result').locator('a')).toContainText('AI/MCP/');
  const toolResultPath = await savedResultPath(listDocumentsTool.getByTestId('mcp-result'));
  expect(toolResultPath).toBeTruthy();
  const toolResultMd = fs.readFileSync(path.join(ld.docsAbs, toolResultPath), 'utf-8');
  expect(toolResultMd).toContain('# MCP tool: `list_documents`');
  expect(toolResultMd).toContain('## Description');
  expect(toolResultMd).toContain("## Schéma d'entrée");
  expect(toolResultMd).toContain('## Requête effectuée');
  expect(toolResultMd).toContain('"method": "tools/call"');
  expect(toolResultMd).toContain('"name": "list_documents"');
  expect(toolResultMd).toContain('## Résultat');
  expect(toolResultMd).toContain('"title": "Quickstart"');

  // ── read_document with a bad id surfaces the MCP error ───────────────────────
  const readDocumentTool = toolList.locator('details').filter({
    has: page.locator('summary').getByText('read_document', { exact: true }),
  });
  await readDocumentTool.locator('summary').click();
  await readDocumentTool.getByTestId('mcp-args').fill(JSON.stringify({ id: 'missing-doc' }, null, 2));
  await readDocumentTool.getByRole('button', { name: 'Run tool' }).click();
  await expect(readDocumentTool.getByTestId('mcp-error')).toContainText('MCP call returned an error.');
  await expect(readDocumentTool.getByTestId('mcp-result').locator('pre')).toContainText('Document not found: missing-doc');

  // ── create-adr prompt: arguments + get prompt persists ──────────────────────
  const promptList = page.getByTestId('mcp-prompt-list');
  const createAdrPrompt = promptList.locator('details').filter({
    has: page.locator('summary').getByText('create-adr', { exact: true }),
  });
  await createAdrPrompt.locator('summary').click();
  await expect(createAdrPrompt).toContainText('Arguments');
  await expect(createAdrPrompt).toContainText('featureSummary');
  await createAdrPrompt.getByRole('button', { name: 'Get prompt' }).click();
  await expect(createAdrPrompt.getByTestId('mcp-result')).toContainText('Saved to:');
  await expect(createAdrPrompt.getByTestId('mcp-result').locator('a')).toContainText('AI/MCP/');

  // Sections that were dropped in the unified UI must not reappear.
  await expect(page.getByRole('heading', { name: 'Project commands' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Roots' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  // ── Instruction files: add then remove AGENTS.md ────────────────────────────
  await page.getByRole('button', { name: 'Add AI instruction file' }).click();
  await expect(page.getByTestId('instruction-browse-list')).toContainText('AGENTS.md');
  await page.getByTestId('instruction-browse-list').getByRole('button', { name: '+ Add' }).click();
  await expect(page.getByTestId('instruction-list')).toContainText('AI/AGENTS.md');
  await expect(
    page.getByTestId('instruction-list').getByRole('link', { name: 'AI/AGENTS.md' }),
  ).toHaveAttribute('href', '/?doc=AI%252FAGENTS');

  await page.getByTestId('instruction-list').getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('Remove "AGENTS.md" from AI instructions?')).toBeVisible();
  await page.getByTestId('confirm-modal').getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByTestId('instruction-list')).not.toContainText('AI/AGENTS.md');

  // ── Create an AI rule ───────────────────────────────────────────────────────
  await page.getByPlaceholder('Avoid magic numbers').fill('Avoid magic numbers');
  await page
    .getByPlaceholder('Name domain constants instead of repeating raw values.')
    .fill('Name domain constants instead of repeating raw values.');
  await page.getByPlaceholder('code-quality, maintainability').fill('code-quality');
  await page.getByPlaceholder('src/**/*.ts, src/frontend/**/*.js').fill('src/**/*.ts');
  await page
    .getByPlaceholder('Numeric constants with domain meaning should be named.')
    .fill('Numeric constants with domain meaning should be named.');
  await page.getByRole('button', { name: 'Add rule' }).click();

  const ruleList = page.getByTestId('rule-list');
  await expect(ruleList).toContainText('Avoid magic numbers');
  await expect(ruleList).toContainText('AI/rules/avoid-magic-numbers.md');
  await expect(ruleList.getByRole('link', { name: 'Avoid magic numbers' })).toHaveAttribute(
    'href',
    '/?doc=AI%252Frules%252Favoid-magic-numbers',
  );
  await expect(ruleList.getByRole('link', { name: 'AI/rules/avoid-magic-numbers.md' })).toHaveAttribute(
    'href',
    '/?doc=AI%252Frules%252Favoid-magic-numbers',
  );
  await expectNoHorizontalOverflow(page);
  await page.waitForTimeout(500);

  expect(configRequestCount).toBe(1);
});
