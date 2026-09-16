import type { APIRequestContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

async function seed(request: APIRequestContext, baseURL: string) {
  const folder = await (await request.post(`${baseURL}/api/templates/folders`, { data: { name: 'Réunions' } })).json();
  const template = await (await request.post(`${baseURL}/api/templates/folders/${folder.id}/templates`, { data: { name: 'Réunion standard', content: '# Agenda\n\n- Decisions\n' } })).json();
  return { folder, template };
}

test('manage folders and Markdown templates, persistence and confirmed deletion', async ({ page, ld }) => {
  await page.goto(ld.baseURL);
  await page.getByTestId('templates-menu').click();
  await expect(page.getByTestId('templates-dropdown')).toContainText('No template folders');
  await page.getByTestId('manage-templates').click();
  const manager = page.getByTestId('templates-manager');
  await manager.locator('#template-new-folder').fill('Réunions');
  await manager.getByTestId('template-add-folder').click();
  await manager.getByTestId('template-new').click();
  await manager.locator('#template-name').fill('Standard');
  await manager.locator('#template-content').fill('# Agenda\n\n- First item');
  await manager.getByTestId('template-save').click();
  await manager.getByRole('button', { name: 'Standard', exact: true }).click();
  await manager.locator('#template-name').fill('Cadrage');
  await manager.locator('#template-content').fill('# Cadrage\n\n**Goals**');
  await manager.getByTestId('template-save').click();
  await manager.locator('#template-folder-name').fill('Workshops');
  await manager.getByTestId('template-rename-folder').click();
  await manager.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await page.getByTestId('templates-menu').click();
  await page.getByTestId('templates-dropdown').getByRole('button', { name: /Workshops/ }).click();
  await expect(page.getByTestId('templates-dropdown').getByRole('button', { name: 'Cadrage', exact: true })).toBeVisible();
  await page.getByTestId('manage-templates').click();
  await manager.getByRole('button', { name: /Workshops/ }).click();
  await manager.getByRole('button', { name: 'Remove Cadrage', exact: true }).click();
  await page.getByTestId('confirm-modal-cancel').click();
  await expect(manager.getByRole('button', { name: 'Cadrage', exact: true })).toBeVisible();
  await manager.getByRole('button', { name: 'Remove Cadrage', exact: true }).click();
  await page.getByTestId('confirm-modal-ok').click();
  await expect(manager.getByRole('button', { name: 'Cadrage', exact: true })).toBeHidden();
  await manager.getByTestId('template-new').click();
  await manager.locator('#template-name').fill('Remaining template');
  await manager.locator('#template-content').fill('# Remaining');
  await manager.getByTestId('template-save').click();
  await manager.getByTestId('template-delete-folder').click();
  await expect(page.getByTestId('confirm-modal-detail')).toContainText('All templates');
  await page.getByTestId('confirm-modal-cancel').click();
  await expect(manager.getByRole('button', { name: 'Remaining template', exact: true })).toBeVisible();
  await manager.getByTestId('template-delete-folder').click();
  await page.getByTestId('confirm-modal-ok').click();
  await expect(manager).toContainText('No template folders');
});

test('menu opens prefilled form from another route and creates independent document', async ({ page, request, ld }) => {
  const { folder } = await seed(request, ld.baseURL);
  await page.goto(`${ld.baseURL}/admin`);
  await page.getByTestId('templates-menu').click();
  await page.getByTestId('templates-dropdown').getByRole('button', { name: /Réunions/ }).click();
  await page.getByRole('button', { name: 'Réunion standard', exact: true }).click();
  await expect(page.locator('#new-doc-title')).toHaveValue('Réunion standard');
  await page.locator('#new-doc-title').fill('Planning meeting');
  await page.getByRole('button', { name: /Browse/ }).click();
  await page.getByPlaceholder('New folder name').fill('meetings');
  await page.getByRole('button', { name: '+ Create', exact: true }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page).toHaveURL(/\?doc=/);
  const created = { id: new URL(page.url()).searchParams.get("doc") || "" };
  const file = path.join(ld.docsAbs, `${decodeURIComponent(created.id)}.md`);
  expect(fs.readFileSync(file, 'utf8')).toContain('- Decisions');
  expect(fs.readFileSync(file, 'utf8')).toContain('title: Planning meeting');
  await request.delete(`${ld.baseURL}/api/templates/folders/${folder.id}?confirm=true`);
  expect(fs.readFileSync(file, 'utf8')).toContain('- Decisions');
});

test('standard document dialog selects templates and can return to blank creation', async ({ page, request, ld }) => {
  const { folder, template } = await seed(request, ld.baseURL);
  const before = await (await request.get(`${ld.baseURL}/api/documents`)).json();
  await page.goto(ld.baseURL);
  await page.getByTitle('New document', { exact: true }).click();
  await page.locator('#new-doc-template-folder').selectOption(folder.id);
  await page.locator('#new-doc-template').selectOption(template.id);
  await expect(page.locator('#new-doc-title')).toHaveValue('Réunion standard');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect((await (await request.get(`${ld.baseURL}/api/documents`)).json()).length).toBe(before.length);
  await page.getByTitle('New document', { exact: true }).click();
  await page.locator('#new-doc-template-folder').selectOption(folder.id);
  await page.locator('#new-doc-template').selectOption(template.id);
  await page.locator('#new-doc-title').fill('From normal dialog');
  let response = page.waitForResponse((r) => r.url().endsWith('/api/documents') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const created = await (await response).json();
  expect(fs.readFileSync(path.join(ld.docsAbs, `${decodeURIComponent(created.id)}.md`), 'utf8')).toContain('- Decisions');
  await page.getByTitle('New document', { exact: true }).click();
  await page.locator('#new-doc-template-folder').selectOption(folder.id);
  await page.locator('#new-doc-template').selectOption(template.id);
  await page.locator('#new-doc-template-folder').selectOption('');
  await page.locator('#new-doc-title').fill('Blank document');
  response = page.waitForResponse((r) => r.url().endsWith('/api/documents') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const blank = await (await response).json();
  expect(fs.readFileSync(path.join(ld.docsAbs, `${decodeURIComponent(blank.id)}.md`), 'utf8')).not.toContain('- Decisions');
});

test('API validates names, protects nonempty folders, and reports missing templates', async ({ request, ld }) => {
  const { folder, template } = await seed(request, ld.baseURL);
  expect((await request.post(`${ld.baseURL}/api/templates/folders`, { data: { name: 'réunions' } })).status()).toBe(409);
  expect((await request.post(`${ld.baseURL}/api/templates/folders`, { data: { name: ' ' } })).status()).toBe(400);
  expect((await request.post(`${ld.baseURL}/api/templates/folders/${folder.id}/templates`, { data: { name: template.name, content: '' } })).status()).toBe(409);
  expect((await request.delete(`${ld.baseURL}/api/templates/folders/${folder.id}`)).status()).toBe(409);
  expect((await request.post(`${ld.baseURL}/api/documents`, { data: { title: 'Missing', folder: 'not-created', templateId: 'missing' } })).status()).toBe(404);
  expect(fs.existsSync(path.join(ld.docsAbs, 'not-created'))).toBe(false);
  expect((await request.post(`${ld.baseURL}/api/documents`, { data: { title: 'Ambiguous', templateId: template.id, content: 'other' } })).status()).toBe(400);
  expect((await request.delete(`${ld.baseURL}/api/templates/folders/${folder.id}?confirm=true`)).ok()).toBe(true);
  expect((await request.get(`${ld.baseURL}/api/templates`)).ok()).toBe(true);
});

test('template copies Markdown but resets identity and source provenance', async ({ request, ld }) => {
  const { template } = await seed(request, ld.baseURL);
  await request.put(`${ld.baseURL}/api/templates/${template.id}`, { data: { name: 'ADR', content: '---\ntype: ADR\ntitle: Old title\ntimestamp: 2020-01-01T00:00:00Z\nsources:\n  - path: old.ts\n    hash: stale\nresource:\n  commit: old\ntags:\n  - meeting\n---\n# Literal heading\n\n{{no-substitution}}\n' } });
  const response = await request.post(`${ld.baseURL}/api/documents`, { data: { title: 'New decision', folder: 'meetings', templateId: template.id } });
  expect(response.ok()).toBe(true);
  const created = await response.json();
  const text = fs.readFileSync(path.join(ld.docsAbs, `${decodeURIComponent(created.id)}.md`), 'utf8');
  expect(text).toContain('title: New decision');
  expect(text).toContain('type: ADR');
  expect(text).toContain('{{no-substitution}}');
  expect(text).toContain('# Literal heading');
  expect(text).not.toContain('old.ts');
  expect(text).not.toContain('commit: old');
  expect(text).not.toContain('2020-01-01');
});

test('corrupt library fails closed without overwriting data', async ({ request, ld }) => {
  const file = path.join(ld.docsAbs, '.document-templates.json');
  fs.writeFileSync(file, '{broken');
  expect((await request.get(`${ld.baseURL}/api/templates`)).status()).toBe(500);
  expect((await request.post(`${ld.baseURL}/api/templates/folders`, { data: { name: 'Overwrite' } })).status()).toBe(500);
  expect(fs.readFileSync(file, 'utf8')).toBe('{broken');
});

test('French template management reports duplicate names without losing edits', async ({ page, request, ld }) => {
  await request.put(`${ld.baseURL}/api/config`, { data: { language: 'fr' } });
  await page.addInitScript(() => localStorage.setItem('ld-lang', 'fr'));
  await page.goto(ld.baseURL);
  await page.getByTestId('templates-menu').click();
  await page.getByRole('button', { name: 'Gérer les templates' }).click();
  const manager = page.getByTestId('templates-manager');
  await expect(manager).toContainText('Nouveau dossier de templates');
  await manager.locator('#template-new-folder').fill('Réunions');
  await manager.getByTestId('template-add-folder').click();
  await expect(manager.locator('#template-folder-name')).toHaveValue('Réunions');
  await manager.locator('#template-new-folder').fill('Réunions');
  await manager.getByTestId('template-add-folder').click();
  await expect(manager.getByRole('alert')).toContainText('Ce nom est déjà utilisé');
  await expect(manager.locator('#template-new-folder')).toHaveValue('Réunions');
});

test('a template deleted while the creation form is open cannot silently create a blank document', async ({ page, request, ld }) => {
  const { template } = await seed(request, ld.baseURL);
  const before = await (await request.get(`${ld.baseURL}/api/documents`)).json();
  await page.goto(ld.baseURL);
  await page.getByTestId('templates-menu').click();
  await page.getByTestId('templates-dropdown').getByRole('button', { name: /Réunions/ }).click();
  await page.getByRole('button', { name: 'Réunion standard', exact: true }).click();
  await expect(page.locator('#new-doc-title')).toHaveValue('Réunion standard');
  await request.delete(`${ld.baseURL}/api/templates/${template.id}`);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByText('Error: This template no longer exists.', { exact: true })).toBeVisible();
  expect((await (await request.get(`${ld.baseURL}/api/documents`)).json()).length).toBe(before.length);
});
