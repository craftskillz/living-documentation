import { test, expect } from '../helpers/ld-fixture';
import type { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
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

  await expect(page.getByRole('heading', { name: 'AI orientation' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'AI rules' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'MCP explorer' })).toBeVisible();
  await expect(page.locator('#mcpEndpoint')).toContainText('POST /mcp');
  await expect(page.locator('#mcpToolList')).toContainText('create_document');
  const panelOrder = await page.evaluate(() => {
    const rules = document.querySelector('[data-i18n="context.rules_title"]')?.getBoundingClientRect();
    const mcp = document.querySelector('[data-i18n="context.mcp_title"]')?.getBoundingClientRect();
    const addRule = document.querySelector('[data-i18n="context.add_rule_title"]')?.getBoundingClientRect();
    return {
      mcpBelowRules: Boolean(rules && mcp && mcp.top > rules.top),
      addRuleRightOfMcp: Boolean(mcp && addRule && addRule.left > mcp.right),
    };
  });
  expect(panelOrder.mcpBelowRules).toBe(true);
  expect(panelOrder.addRuleRightOfMcp).toBe(true);
  const createDocumentTool = page.locator('#mcpToolList details').filter({
    has: page.locator('summary').getByText('create_document', { exact: true }),
  });
  await createDocumentTool.locator('summary').click();
  await expect(createDocumentTool).toContainText('Input schema');
  await expect(createDocumentTool).toContainText('"title"');
  const listDocumentsTool = page.locator('#mcpToolList details').filter({
    has: page.locator('summary').getByText('list_documents', { exact: true }),
  });
  await listDocumentsTool.locator('summary').click();
  await listDocumentsTool.getByRole('button', { name: 'Run tool' }).click();
  await expect(listDocumentsTool.locator('[data-mcp-result]')).toContainText('Saved to:');
  await expect(listDocumentsTool.locator('[data-mcp-result] a')).toContainText('AI/MCP/');
  const readDocumentTool = page.locator('#mcpToolList details').filter({
    has: page.locator('summary').getByText('read_document', { exact: true }),
  });
  await readDocumentTool.locator('summary').click();
  await readDocumentTool.locator('[data-mcp-args]').fill(JSON.stringify({ id: 'missing-doc' }, null, 2));
  await readDocumentTool.getByRole('button', { name: 'Run tool' }).click();
  await expect(readDocumentTool.locator('[data-mcp-error]')).toContainText('MCP call returned an error.');
  await expect(readDocumentTool.locator('[data-mcp-result] pre')).toContainText('Document not found: missing-doc');
  const createAdrPrompt = page.locator('#mcpPromptList details').filter({
    has: page.locator('summary').getByText('create-adr', { exact: true }),
  });
  await createAdrPrompt.locator('summary').click();
  await expect(createAdrPrompt).toContainText('Arguments');
  await expect(createAdrPrompt).toContainText('featureSummary');
  await createAdrPrompt.getByRole('button', { name: 'Get prompt' }).click();
  await expect(createAdrPrompt.locator('[data-mcp-result]')).toContainText('Saved to:');
  await expect(createAdrPrompt.locator('[data-mcp-result] a')).toContainText('AI/MCP/');
  await expect(page.getByRole('heading', { name: 'Project commands' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Roots' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Add AI instruction file' }).click();
  await expect(page.locator('#instructionBrowseList')).toContainText('AGENTS.md');
  await page.locator('#instructionBrowseList').getByRole('button', { name: '+ Add' }).click();
  await expect(page.locator('#instructionList')).toContainText('AI/AGENTS.md');
  await expect(page.locator('#instructionList a', { hasText: 'AI/AGENTS.md' })).toHaveAttribute(
    'href',
    '/?doc=AI%252FAGENTS',
  );
  await page.locator('#instructionList').getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('Remove "AGENTS.md" from AI instructions?')).toBeVisible();
  await page.locator('#confirm-modal').getByRole('button', { name: 'Remove' }).click();
  await expect(page.locator('#instructionList')).not.toContainText('AI/AGENTS.md');

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

  await expect(page.locator('#ruleList')).toContainText('Avoid magic numbers');
  await expect(page.locator('#ruleList')).toContainText('AI/rules/avoid-magic-numbers.md');
  await expect(page.locator('#ruleList a', { hasText: 'Avoid magic numbers' })).toHaveAttribute(
    'href',
    '/?doc=AI%252Frules%252Favoid-magic-numbers',
  );
  await expect(page.locator('#ruleList a', { hasText: 'AI/rules/avoid-magic-numbers.md' })).toHaveAttribute(
    'href',
    '/?doc=AI%252Frules%252Favoid-magic-numbers',
  );
  await expectNoHorizontalOverflow(page);
  await page.waitForTimeout(500);

  expect(configRequestCount).toBe(1);
});
