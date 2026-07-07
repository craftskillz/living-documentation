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
  await expect(input).toHaveValue('204_CONNAISSANCE_PERSONNE_deja');

  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('#new-folder-name')).toBeHidden();

  expect(fs.existsSync(path.join(ld.docsAbs, '204_CONNAISSANCE_PERSONNE_deja'))).toBe(true);
  expect(fs.existsSync(path.join(ld.docsAbs, '204_CONNAISSANCE PERSONNE déjà!'))).toBe(false);
});
