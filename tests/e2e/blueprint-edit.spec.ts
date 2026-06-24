import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';

// The blueprint "D" badge is drawn on a <canvas>, so there is no DOM node to
// click. We locate the green (already-documented) badge by scanning the canvas
// pixels for its emerald colour, then synthesise the pointer gesture the canvas
// listens for. This stays robust to layout changes (no hard-coded coordinates).
const OPEN_ALPHA_DOC = `async () => {
  const c = document.querySelector('canvas');
  const ctx = c.getContext('2d');
  const r = c.getBoundingClientRect();
  // Boxes render asynchronously after the /api/blueprint fetch; retry the
  // emerald-pixel scan until the green "D" badge has been painted.
  let cx = 0, cy = 0, found = false;
  for (let attempt = 0; attempt < 40 && !found; attempt++) {
    const img = ctx.getImageData(0, 0, c.width, c.height).data;
    let sx = 0, sy = 0, n = 0;
    for (let py = 0; py < c.height; py += 2) {
      for (let px = 0; px < c.width; px += 2) {
        const i = (py * c.width + px) * 4;
        const R = img[i], G = img[i + 1], B = img[i + 2];
        if (G > 150 && R < 120 && B > 90 && B < 190 && G - R > 70 && G - B > 30) { sx += px; sy += py; n++; }
      }
    }
    if (n) { cx = r.left + (sx / n) * (r.width / c.width); cy = r.top + (sy / n) * (r.height / c.height); found = true; }
    else await new Promise((res) => setTimeout(res, 100));
  }
  if (!found) return { ok: false };
  const os = c.setPointerCapture, orl = c.releasePointerCapture;
  c.setPointerCapture = () => {}; c.releasePointerCapture = () => {};
  const pe = (type, x, y) => new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerdown' ? 1 : 0, pointerId: 1, isPrimary: true, view: window });
  c.dispatchEvent(pe('pointerdown', cx, cy));
  await new Promise((res) => setTimeout(res, 40));
  c.dispatchEvent(pe('pointerup', cx, cy));
  c.setPointerCapture = os; c.releasePointerCapture = orl;
  return { ok: true };
}`;

// Same approach for a block WITHOUT a doc: its "D+" badge is faint purple. In
// this fixture only the "beta" block is purple (alpha is green), so the purple
// centroid lands on beta's badge.
const OPEN_PURPLE_DOC = `async () => {
  const c = document.querySelector('canvas');
  const ctx = c.getContext('2d');
  const r = c.getBoundingClientRect();
  let cx = 0, cy = 0, found = false;
  for (let attempt = 0; attempt < 40 && !found; attempt++) {
    const img = ctx.getImageData(0, 0, c.width, c.height).data;
    let sx = 0, sy = 0, n = 0;
    for (let py = 0; py < c.height; py += 2) {
      for (let px = 0; px < c.width; px += 2) {
        const i = (py * c.width + px) * 4;
        const R = img[i], G = img[i + 1], B = img[i + 2];
        if (B > 110 && R > 40 && R < 160 && B > R + 30 && B > G + 30) { sx += px; sy += py; n++; }
      }
    }
    if (n) { cx = r.left + (sx / n) * (r.width / c.width); cy = r.top + (sy / n) * (r.height / c.height); found = true; }
    else await new Promise((res) => setTimeout(res, 100));
  }
  if (!found) return { ok: false };
  const os = c.setPointerCapture, orl = c.releasePointerCapture;
  c.setPointerCapture = () => {}; c.releasePointerCapture = () => {};
  const pe = (type, x, y) => new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerdown' ? 1 : 0, pointerId: 1, isPrimary: true, view: window });
  c.dispatchEvent(pe('pointerdown', cx, cy));
  await new Promise((res) => setTimeout(res, 40));
  c.dispatchEvent(pe('pointerup', cx, cy));
  c.setPointerCapture = os; c.releasePointerCapture = orl;
  return { ok: true };
}`;

test.describe('blueprint document editing reuses the Home editor', () => {
  test.use({ fixtureName: 'blueprint-edit' });

  const DOC_REL = '000_BLUEPRINT/2026_01_01_10_00_[ALPHA]_alpha.md';

  test('opens the alpha block doc and supports inline + full edit', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/blueprint`);
    await page.waitForFunction(() => {
      const c = document.querySelector('canvas');
      return !!c && c.width > 300 && window.innerWidth > 300;
    });

    // Open the alpha block's document (green "D"). OPEN_ALPHA_DOC is a function
    // source string; wrap as an IIFE so page.evaluate runs it (a bare string is
    // evaluated as an expression and never invoked).
    const opened = (await page.evaluate(`(${OPEN_ALPHA_DOC})()`)) as { ok: boolean };
    expect(opened.ok).toBe(true);

    // The modal renders the shared EditableMarkdown body, not a raw textarea.
    const content = page.locator('.bpadr-read #doc-content');
    await expect(content).toBeVisible();
    await expect(content).toContainText('Alpha block');

    // Inline snippet editing: right-click a rendered block opens the popup, and
    // it must layer above the modal overlay.
    await content.locator('p').first().click({ button: 'right' });
    const popup = page.locator('#inline-snippet-popup');
    await expect(popup).toBeVisible();
    const [popupZ, overlayZ] = await page.evaluate(() => [
      getComputedStyle(document.getElementById('inline-snippet-popup')).zIndex,
      getComputedStyle(document.querySelector('.bpadr-overlay')).zIndex,
    ]);
    expect(Number(popupZ)).toBeGreaterThan(Number(overlayZ));

    // Dismiss the inline popup with a neutral click, then enter full edit mode:
    // the Edit button swaps the body for the textarea editor.
    await page.locator('.bpadr-title').click();
    await expect(popup).toBeHidden();
    await page.getByTestId('bp-edit').click();
    const editor = page.locator('.bpadr-read #doc-editor');
    await expect(editor).toBeVisible();
    await expect(editor).toHaveValue(/Alpha block/);

    // Save persists the edited markdown to disk.
    const marker = '\n\nEdited from the blueprint modal.\n';
    await editor.focus();
    await editor.evaluate((el, m) => {
      const ta = el as HTMLTextAreaElement;
      ta.value = ta.value + m;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }, marker);
    await page.getByTestId('bp-save').click();

    const docPath = path.join(ld.docsAbs, DOC_REL);
    await expect.poll(() => fs.readFileSync(docPath, 'utf-8')).toContain('Edited from the blueprint modal.');

    // Delete (read mode): the trash button asks for confirmation, then removes
    // the document from disk and closes the modal.
    await expect(page.getByTestId('bp-delete')).toBeVisible();
    await page.getByTestId('bp-delete').click();
    await page.getByTestId('bp-delete-confirm').click();
    await expect(page.locator('.bpadr-overlay')).toBeHidden();
    await expect.poll(() => fs.existsSync(docPath)).toBe(false);
  });

  test('creation form (block without a doc yet) exposes the snippets button', async ({ page, ld }) => {
    await page.goto(`${ld.baseURL}/blueprint`);
    await page.waitForFunction(() => {
      const c = document.querySelector('canvas');
      return !!c && c.width > 300 && window.innerWidth > 300;
    });

    // Open the "beta" block (purple "D+", no document yet) → the creation form.
    const opened = (await page.evaluate(`(${OPEN_PURPLE_DOC})()`)) as { ok: boolean };
    expect(opened.ok).toBe(true);

    await expect(page.locator('.bpadr-form')).toBeVisible();
    await expect(page.locator('.bpadr-title')).toContainText('Folder');
    await expect(page.locator('.bpadr-title code')).toHaveText('/beta');

    // Parity with Home: the creation form offers the snippets inserter.
    await page.getByTestId('bp-form-snippets').click();
    await expect(page.locator('div.fixed.inset-0').first()).toBeVisible();
  });

  test('creating a blueprint doc keeps the folder title in the popup header only', async ({
    page,
    ld,
  }) => {
    await page.goto(`${ld.baseURL}/blueprint`);
    await page.waitForFunction(() => {
      const c = document.querySelector('canvas');
      return !!c && c.width > 300 && window.innerWidth > 300;
    });

    const opened = (await page.evaluate(`(${OPEN_PURPLE_DOC})()`)) as { ok: boolean };
    expect(opened.ok).toBe(true);

    await expect(page.locator('.bpadr-form')).toBeVisible();
    await expect(page.locator('#adr-title')).toHaveValue('beta');
    await expect(page.locator('#adr-content')).toHaveValue('');
    await expect(page.locator('.bpadr-title code')).toHaveText('/beta');
    await page.locator('.bpadr-form button[type="submit"]').click();

    await expect(page.locator('.bpadr-title')).toContainText('Folder');
    await expect(page.locator('.bpadr-title code')).toHaveText('/beta');
    await expect(page.locator('.bpadr-read #doc-content')).toContainText('beta');

    const created = fs
      .readdirSync(path.join(ld.docsAbs, '000_BLUEPRINT'))
      .find((f) => f.includes('[BETA]_beta') && f.endsWith('.md'));
    expect(created).toBeDefined();
    expect(fs.readFileSync(path.join(ld.docsAbs, '000_BLUEPRINT', created!), 'utf-8')).toBe(
      '# beta\n',
    );
  });
});
