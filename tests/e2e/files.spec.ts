import { test, expect } from '../helpers/ld-fixture';

const TEXT_B64 = Buffer.from('file page fixture').toString('base64');

async function upload(
  request: any,
  baseURL: string,
  name: string,
  documentId?: string,
): Promise<string> {
  const res = await request.post(`${baseURL}/api/files/upload`, {
    data: { data: TEXT_B64, name, documentId },
  });
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { filename: string };
  return body.filename;
}

test.describe('attached files page', () => {
  test.use({ fixtureName: 'with-subfolders' });

  test('filters attached files by files folder and descendants', async ({ page, request, ld }) => {
    await upload(request, ld.baseURL, 'root.txt');
    await upload(
      request,
      ld.baseURL,
      'nested.txt',
      encodeURIComponent('tutorials/2026_01_02_10_00_[Guide]_nested'),
    );
    await upload(
      request,
      ld.baseURL,
      'deep.txt',
      encodeURIComponent('tutorials/advanced/2026_01_03_10_00_[Guide]_deep'),
    );

    await page.goto(`${ld.baseURL}/files`);
    await expect(page.getByText('root.txt')).toBeVisible();
    await expect(page.getByText('nested.txt')).toBeVisible();
    await expect(page.getByText('deep.txt')).toBeVisible();

    const filter = page.getByTestId('files-folder-filter');
    await expect(filter).toBeVisible();
    await filter.selectOption('tutorials');
    await expect(page.getByText('root.txt')).toBeHidden();
    await expect(page.getByText('nested.txt')).toBeVisible();
    await expect(page.getByText('deep.txt')).toBeVisible();

    await filter.selectOption('tutorials/advanced');
    await expect(page.getByText('nested.txt')).toBeHidden();
    await expect(page.getByText('deep.txt')).toBeVisible();
  });
});
