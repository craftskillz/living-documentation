import type { TemplateFolder, DocumentTemplate } from '../../src/lib/documentTemplates';
import type { APIRequestContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

async function seed(request: APIRequestContext, baseURL: string) {
  const folder = await (await request.post(`${baseURL}/api/templates/folders`, { data: { name: 'Réunions' } })).json();
  const template = await (await request.post(`${baseURL}/api/templates/folders/${folder.id}/templates`, { data: { name: 'Réunion standard', content: '# Agenda\n\n- Decisions\n' } })).json();
  return { folder, template };
}

test('library manages folders, previews, edits and confirms deletions', async ({ page, ld }) => {
  await page.goto(ld.baseURL);
  await page.getByTestId('templates-menu').click();
  await page.getByTestId('manage-templates').click();
  await expect(page).toHaveURL(`${ld.baseURL}/templates`);
  const manager = page.getByTestId('templates-manager');
  await manager.getByRole('button', { name: 'New template folder', exact: true }).click();
  await manager.locator('#template-folder-input').fill('Réunions');
  await manager.getByTestId('template-add-folder').click();
  await manager.getByTestId('template-new').click();
  await manager.locator('#template-name').fill('Standard');
  await manager.locator('#template-content').fill('# Agenda\n\n- First item');
  await manager.getByTestId('template-save').click();
  await expect(page.frameLocator('iframe[title="Preview"]').getByRole('heading', { name: 'Agenda' })).toBeVisible();
  await manager.getByTestId('template-edit').click();
  await manager.locator('#template-name').fill('Cadrage');
  await manager.getByTestId('template-save').click();
  await manager.getByText('Folder actions', { exact: true }).click();
  await manager.getByRole('button', { name: 'Rename', exact: true }).click();
  await manager.locator('#template-folder-input').fill('Workshops');
  await manager.getByTestId('template-add-folder').click();
  await page.reload();
  await manager.getByRole('button', { name: /Workshops/ }).first().click();
  await manager.getByText('More actions', { exact: true }).click();
  await manager.locator('.more-actions').getByRole('button', { name: 'Remove', exact: true }).click();
  await page.getByTestId('confirm-modal-cancel').click();
  await expect(manager.locator('.detail-heading')).toContainText('Cadrage');
  await manager.getByText('Folder actions', { exact: true }).click();
  await manager.getByTestId('template-delete-folder').click();
  await expect(page.getByTestId('confirm-modal-detail')).toContainText('1 templates');
  await page.getByTestId('confirm-modal-ok').click();
  await expect(manager).toContainText('Your template library starts here');
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

test('French library validates folder names and preserves input', async ({ page, request, ld }) => {
  await request.put(`${ld.baseURL}/api/config`, { data: { language: 'fr' } });
  await page.goto(`${ld.baseURL}/templates`);
  const manager = page.getByTestId('templates-manager');
  await manager.getByRole('button', { name: 'Nouveau dossier de templates', exact: true }).click();
  await manager.locator('#template-folder-input').fill('Réunions');
  await manager.getByTestId('template-add-folder').click();
  await manager.getByRole('button', { name: '+ Dossier', exact: true }).click();
  await manager.locator('#template-folder-input').fill('Réunions');
  await manager.getByTestId('template-add-folder').click();
  await expect(manager.locator('#template-folder-error')).toContainText('Ce nom est déjà utilisé');
  await expect(manager.locator('#template-folder-input')).toHaveValue('Réunions');
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

test('library protects unsaved edits, survives failed saves, and supports search', async ({ page, request, ld }) => {
  await seed(request, ld.baseURL);
  await page.goto(`${ld.baseURL}/templates`);
  await page.getByTestId('template-edit').click();
  await page.locator('#template-content').fill('# Draft preserved');
  await page.locator('header.topbar a[href="/admin"]').click();
  await page.getByTestId('confirm-modal-cancel').click();
  await expect(page).toHaveURL(`${ld.baseURL}/templates`);
  await expect(page.locator('#template-content')).toHaveValue('# Draft preserved');
  await page.route('**/api/templates/*', route => route.request().method() === 'PUT' ? route.abort() : route.continue());
  await page.getByTestId('template-save').click();
  await expect(page.getByRole('alert').filter({ hasText: 'Connection failed' })).toBeVisible();
  await expect(page.locator('#template-content')).toHaveValue('# Draft preserved');
  await page.unroute('**/api/templates/*');
  await page.getByTestId('template-save').click();
  await expect(page.getByText('Template saved.', { exact: false })).toBeVisible();
  await page.locator('#template-search').fill('preserved');
  await expect(page.locator('.template-item')).toHaveCount(1);
  await page.locator('#template-search').fill('nothing matches');
  await expect(page.locator('.template-item')).toHaveCount(0);
});

test('duplicate and move templates without changing the original', async ({ page, request, ld }, testInfo) => {
  const { template } = await seed(request, ld.baseURL);
  const other = await (await request.post(`${ld.baseURL}/api/templates/folders`, { data: { name: 'Architecture' } })).json();
  await page.goto(`${ld.baseURL}/templates`);
  await page.getByText('More actions', { exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await page.locator('#template-name').fill('Copy');
  await page.locator('#template-destination').selectOption(other.id);
  await page.getByTestId('template-save').click();
  await page.getByTestId('template-edit').click();
  await page.locator('#template-destination').selectOption({ label: 'Réunions' });
  await page.getByTestId('template-save').click();
  const library = await (await request.get(`${ld.baseURL}/api/templates`)).json();
  expect(library.folders.find((f: TemplateFolder) => f.id === other.id).templates).toHaveLength(0);
  const items = library.folders.flatMap((f: TemplateFolder) => f.templates);
  expect(items).toHaveLength(2);
  expect(items.find((item: DocumentTemplate) => item.id === template.id).name).toBe('Réunion standard');
  await page.screenshot({ path: testInfo.outputPath('library-desktop.png') });
  await page.getByRole('button', { name: 'Create a document', exact: true }).click();
  await expect(page.locator('#new-doc-title')).toHaveValue('Copy');
});

test('stale edits cannot overwrite a newer library revision', async ({ page, request, ld }) => {
  const { template } = await seed(request, ld.baseURL);
  await page.goto(`${ld.baseURL}/templates`);
  await page.getByTestId('template-edit').click();
  await page.locator('#template-content').fill('# Local draft');
  await request.put(`${ld.baseURL}/api/templates/${template.id}`, { data: { name: template.name, content: '# Remote version' } });
  await page.getByTestId('template-save').click();
  await expect(page.getByRole('alert').filter({ hasText: 'another session' })).toBeVisible();
  await expect(page.locator('#template-content')).toHaveValue('# Local draft');
  const library = await (await request.get(`${ld.baseURL}/api/templates`)).json();
  expect(library.folders[0].templates[0].content).toBe('# Remote version');
});

test('mobile library opens details and returns to the list', async ({ page, request, ld }, testInfo) => {
  await seed(request, ld.baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${ld.baseURL}/templates`);
  await page.locator('.template-item').click();
  await expect(page.getByRole('button', { name: 'Create a document', exact: true })).toBeVisible();
  expect(await page.locator('.template-library').evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('library-mobile.png') });
  await page.getByRole('button', { name: 'Back to list', exact: false }).click();
  await expect(page.locator('.template-item')).toBeVisible();
});

test('moving a template checks destination uniqueness and preserves storage on errors', async ({ request, ld }) => {
  const { folder, template } = await seed(request, ld.baseURL);
  const other = await (await request.post(`${ld.baseURL}/api/templates/folders`, { data: { name: 'Other' } })).json();
  await request.post(`${ld.baseURL}/api/templates/folders/${other.id}/templates`, { data: { name: template.name, content: 'Existing' } });
  expect((await request.put(`${ld.baseURL}/api/templates/${template.id}`, { data: { name: template.name, content: 'Moved', folderId: other.id } })).status()).toBe(409);
  const response = await request.get(`${ld.baseURL}/api/templates`);
  const library = await response.json();
  expect(library.folders.find((f: TemplateFolder) => f.id === folder.id).templates[0].content).toBe(template.content);
  expect((await request.put(`${ld.baseURL}/api/templates/${template.id}`, { headers: { 'If-Match': '"stale"' }, data: { name: 'Overwrite', content: '' } })).status()).toBe(409);
});

test('browser back and keyboard confirmation preserve a dirty draft', async ({ page, request, ld }) => {
  await seed(request, ld.baseURL);
  await page.goto(ld.baseURL);
  await page.getByTestId('templates-menu').click();
  await page.getByTestId('manage-templates').click();
  await page.getByTestId('template-edit').click();
  await page.locator('#template-content').fill('# Keep me');
  let nativePrompt = false;
  page.once('dialog', async (dialog) => { nativePrompt = dialog.type() === 'beforeunload'; await dialog.dismiss(); });
  await page.evaluate(() => history.back());
  await expect.poll(async () => nativePrompt || await page.getByTestId('confirm-modal').isVisible()).toBeTruthy();
  if (!nativePrompt) await page.keyboard.press('Escape');
  await expect(page).toHaveURL(`${ld.baseURL}/templates`);
  await expect(page.locator('#template-content')).toHaveValue('# Keep me');
  await page.locator('header.topbar a[href="/admin"]').click();
  await page.getByTestId('confirm-modal-ok').click();
  await expect(page).toHaveURL(`${ld.baseURL}/admin`);
});
