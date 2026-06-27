import { test, expect } from '../helpers/ld-fixture';

// Select all blocks (rubber-band in drag mode) then click the cluster tool.
// The blueprint canvas listens to pointer events with setPointerCapture, which
// rejects synthetic pointerIds — stub it before dispatching.
const SELECT_ALL_AND_GROUP = `async () => {
  const c = document.querySelector('canvas');
  c.setPointerCapture = () => {}; c.releasePointerCapture = () => {};
  let rail = [...document.querySelectorAll('.rail .tool-button')];
  rail[1].click(); // enable drag / select mode
  await new Promise((r) => setTimeout(r, 120));
  const pe = (t, x, y) => new PointerEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: t === 'pointerup' ? 0 : 1, pointerId: 1, isPrimary: true, shiftKey: true, view: window });
  c.dispatchEvent(pe('pointerdown', 60, 60));
  c.dispatchEvent(pe('pointermove', window.innerWidth - 60, window.innerHeight - 60));
  c.dispatchEvent(pe('pointerup', window.innerWidth - 60, window.innerHeight - 60));
  await new Promise((r) => setTimeout(r, 150));
  rail = [...document.querySelectorAll('.rail .tool-button')];
  const groupButton = rail[2];
  const grouped = !!groupButton && !groupButton.disabled;
  groupButton?.click(); // create cluster from selection
  await new Promise((r) => setTimeout(r, 150));
  return { hadSelection: grouped };
}`;

// Enable drag mode and rubber-band every block — without grouping.
const SELECT_ALL = `async () => {
  const c = document.querySelector('canvas');
  c.setPointerCapture = () => {}; c.releasePointerCapture = () => {};
  const rail = [...document.querySelectorAll('.rail .tool-button')];
  if (!rail[1].classList.contains('active')) rail[1].click();
  await new Promise((r) => setTimeout(r, 120));
  const pe = (t, x, y) => new PointerEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: t === 'pointerup' ? 0 : 1, pointerId: 1, isPrimary: true, shiftKey: true, view: window });
  c.dispatchEvent(pe('pointerdown', 60, 60));
  c.dispatchEvent(pe('pointermove', window.innerWidth - 60, window.innerHeight - 60));
  c.dispatchEvent(pe('pointerup', window.innerWidth - 60, window.innerHeight - 60));
  await new Promise((r) => setTimeout(r, 150));
  return true;
}`;

test.describe('blueprint visual clusters', () => {
  test.use({ fixtureName: 'blueprint-edit' });

  async function clusters(request: import('@playwright/test').APIRequestContext, baseURL: string) {
    return (await request.get(`${baseURL}/api/blueprint/clusters`).then((r) => r.json())) as Array<{ label: string; members: string[] }>;
  }

  test('group a selection into a cluster, rename it, then delete it', async ({ page, ld, request }) => {
    await page.goto(`${ld.baseURL}/blueprint`);
    await page.waitForFunction(() => {
      const c = document.querySelector('canvas');
      return !!c && c.width > 300;
    });

    // Create a cluster from the selected blocks.
    const res = (await page.evaluate(`(${SELECT_ALL_AND_GROUP})()`)) as { hadSelection: boolean };
    expect(res.hadSelection).toBe(true);

    const tag = page.locator('.cluster-tag');
    await expect(tag).toBeVisible();
    await expect(page.locator('.cluster-tag-label')).toHaveText('Cluster');
    await expect.poll(async () => (await clusters(request, ld.baseURL)).length).toBe(1);

    // Rename via the label overlay input.
    await page.locator('.cluster-tag-label').click();
    await page.locator('.cluster-tag-input').fill('Backend');
    await page.locator('.cluster-tag-input').press('Enter');
    await expect(page.locator('.cluster-tag-label')).toHaveText('Backend');
    await expect.poll(async () => (await clusters(request, ld.baseURL))[0]?.label).toBe('Backend');

    // Delete via the × button.
    await page.locator('.cluster-tag-del').click();
    await expect(tag).toBeHidden();
    await expect.poll(async () => (await clusters(request, ld.baseURL)).length).toBe(0);
  });

  test('add the current selection to an existing cluster via the + button', async ({ page, ld, request }) => {
    // Seed a cluster that already contains one block.
    await request.put(`${ld.baseURL}/api/blueprint/clusters`, {
      data: [{ id: 'seed', label: 'Seed', members: ['alpha'] }],
    });

    await page.goto(`${ld.baseURL}/blueprint`);
    await page.waitForFunction(() => {
      const c = document.querySelector('canvas');
      return !!c && c.width > 300;
    });

    // Drag mode + select every block (alpha + beta).
    await page.evaluate(`(${SELECT_ALL})()`);

    // The "+" appears on the cluster tag (drag mode + active selection) and
    // merges the selection into the cluster's membership.
    const add = page.locator('.cluster-tag-add');
    await expect(add).toBeVisible();
    await add.click();

    await expect
      .poll(async () => {
        const m = (await clusters(request, ld.baseURL))[0]?.members ?? [];
        return [...m].sort().join(',');
      })
      .toBe('alpha,beta');
  });
});
