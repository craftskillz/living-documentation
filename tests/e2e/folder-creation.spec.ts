import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

test('Home new folder modal normalizes spaces and accents in folder names', async ({
  page,
  ld,
}) => {
  await page.goto(ld.baseURL);
  await page.getByTitle('New folder').click();

  const input = page.locator('#new-folder-name');
  await input.fill('204_CONNAISSANCE PERSONNE déjà!');
  await expect(page.getByTestId('new-folder-preview')).toHaveText('204_CONNAISSANCE_PERSONNE_deja');

  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('#new-folder-name')).toBeHidden();

  expect(fs.existsSync(path.join(ld.docsAbs, '204_CONNAISSANCE_PERSONNE_deja'))).toBe(true);
  expect(fs.existsSync(path.join(ld.docsAbs, '204_CONNAISSANCE PERSONNE déjà!'))).toBe(false);
});

test('Home new folder modal accepts spaces and special characters typed one key at a time', async ({
  page,
  ld,
}) => {
  await page.goto(ld.baseURL);
  await page.getByTitle('New folder').click();

  const input = page.locator('#new-folder-name');
  await input.pressSequentially('mon dossier & co');
  await expect(input).toHaveValue('mon dossier & co');
  await expect(page.getByTestId('new-folder-preview')).toHaveText('mon_dossier_co');

  await page.getByRole('button', { name: 'Create' }).click();
  await expect(input).toBeHidden();

  expect(fs.existsSync(path.join(ld.docsAbs, 'mon_dossier_co'))).toBe(true);
});

test('New document dialog accepts spaces and special characters typed in a new folder name', async ({
  page,
  ld,
}) => {
  await page.goto(ld.baseURL);
  await page.getByTitle('New document').click();
  await page.locator('#new-doc-title').fill('Compte rendu');
  await page.getByRole('button', { name: /Browse/ }).click();

  await page.getByPlaceholder('New folder name').pressSequentially('mon dossier & co');
  await page.getByRole('button', { name: '+ Create', exact: true }).click();
  await expect(page.getByTestId('new-doc-filename-preview')).toContainText('mon_dossier_co/');
});
