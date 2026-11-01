import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { test, expect } from "../helpers/ld-fixture";

const id = "autosave-test";
const body = `# Autosave\n\n## Target\n\nOriginal text.\n\n${"Keep this paragraph.\n\n".repeat(35)}## Following\n\nUntouched.\n`;
type Mode = "section" | "global";
const selectors = (mode: Mode) => mode === "section"
  ? { editor: "#section-markdown", save: "#section-editor .section-save", cancel: "#section-editor footer button:first-of-type" }
  : { editor: "#doc-editor", save: '[data-testid="edit-actions"] button:last-of-type', cancel: '[data-testid="edit-actions"] button:first-of-type' };

async function openEditor(page: Page, mode: Mode) {
  if (mode === "global") await page.getByTestId("edit-doc-btn").click();
  else {
    await page.locator("#doc-content h2").filter({ hasText: "Target" }).click({ button: "right" });
    await page.locator('[data-action="edit-section"]').click();
  }
  await expect(page.locator(selectors(mode).editor)).toBeVisible();
}

test.beforeEach(async ({ page, request, ld }) => {
  expect((await request.post(`${ld.baseURL}/api/documents`, { data: { title: "Autosave test", content: body } })).ok()).toBeTruthy();
  await request.put(`${ld.baseURL}/api/config`, { data: { language: "fr" } });
  await page.goto(`${ld.baseURL}/?doc=${id}`);
  await expect(page.locator("#doc-content h1")).toBeVisible();
  await page.clock.install();
});

for (const mode of ["section", "global"] as const) {
  test(`${mode}: autosave keeps the editor open, skips clean drafts and serializes writes while typing`, async ({ page, ld }) => {
    const file = path.join(ld.docsAbs, `${id}.md`);
    const original = fs.readFileSync(file, "utf8");
    const ui = selectors(mode);
    let writes = 0;
    let release: () => void = () => {};
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**/api/documents/${id}`, async route => {
      if (route.request().method() === "PUT") { writes++; if (writes === 1) await held; }
      await route.continue();
    });
    await openEditor(page, mode);
    await page.clock.fastForward(10_000);
    expect(writes).toBe(0);
    const editor = page.locator(ui.editor);
    const first = (await editor.inputValue()).replace("Original text.", "First saved text.");
    await editor.fill(first);
    await page.clock.fastForward(9_000);
    expect(writes).toBe(0);
    await page.clock.fastForward(1_000);
    await expect(page.locator(ui.save)).toBeDisabled();
    await expect.poll(() => page.locator(ui.save).evaluate(el => Number(getComputedStyle(el).opacity))).toBeLessThan(1);
    await page.screenshot({ path: `/tmp/ld-autosave-${mode}-saving.png` });
    await expect(editor).toBeEditable();
    const second = first.replace("First saved text.", "New text typed during save.");
    await editor.fill(second);
    await editor.press("Control+Enter");
    await page.clock.fastForward(10_000);
    expect(writes).toBe(1);
    release();
    await expect(page.locator(ui.save)).toBeEnabled();
    await expect(editor).toHaveValue(second);
    expect(fs.readFileSync(file, "utf8")).toBe(original.replace("Original text.", "First saved text."));
    await editor.evaluate((el: HTMLTextAreaElement) => { el.setSelectionRange(10, 10); el.scrollTop = 90; });
    const position = await editor.evaluate((el: HTMLTextAreaElement) => ({ caret: el.selectionStart, scroll: el.scrollTop }));
    await page.clock.fastForward(10_000);
    await expect.poll(() => fs.readFileSync(file, "utf8")).toBe(original.replace("Original text.", "New text typed during save."));
    await expect(page.locator(ui.save)).toBeEnabled();
    await expect(editor).toHaveValue(second);
    expect(await editor.evaluate((el: HTMLTextAreaElement) => ({ caret: el.selectionStart, scroll: el.scrollTop }))).toEqual(position);
    await page.clock.fastForward(20_000);
    expect(writes).toBe(2);
    await editor.fill(second.replace("New text typed during save.", "Manual final text."));
    await page.locator(ui.save).click();
    await expect(editor).toHaveCount(0);
    expect(fs.readFileSync(file, "utf8")).toBe(original.replace("Original text.", "Manual final text."));
    await page.clock.fastForward(20_000);
    expect(writes).toBe(3);
  });

  test(`${mode}: a failed autosave keeps edits and reenables the button for retry`, async ({ page, ld }) => {
    const ui = selectors(mode);
    const file = path.join(ld.docsAbs, `${id}.md`);
    const original = fs.readFileSync(file, "utf8");
    await openEditor(page, mode);
    const editor = page.locator(ui.editor);
    const draft = (await editor.inputValue()).replace("Original text.", "Retry this text.");
    await editor.fill(draft);
    await page.route(`**/api/documents/${id}`, async route => {
      if (route.request().method() === "PUT") await route.fulfill({ status: 500, body: "Temporary save failure" });
      else await route.continue();
    });
    await page.clock.fastForward(10_000);
    await expect(page.getByText(/Temporary save failure/)).toBeVisible();
    await expect(page.locator(ui.save)).toBeEnabled();
    await expect(editor).toHaveValue(draft);
    expect(fs.readFileSync(file, "utf8")).toBe(original);
    await page.unroute(`**/api/documents/${id}`);
    await page.clock.fastForward(10_000);
    await expect.poll(() => fs.readFileSync(file, "utf8")).toContain("Retry this text.");
    await expect(editor).toBeVisible();
    await expect(page.locator(ui.save)).toBeEnabled();
  });

  test(`${mode}: closing an editor stops its timer and leaves later drafts unsaved`, async ({ page, ld }) => {
    const ui = selectors(mode);
    const file = path.join(ld.docsAbs, `${id}.md`);
    const original = fs.readFileSync(file, "utf8");
    await openEditor(page, mode);
    await page.locator(ui.editor).fill("Unsaved draft");
    await page.locator(ui.cancel).click();
    await expect(page.locator(ui.editor)).toHaveCount(0);
    await page.clock.fastForward(30_000);
    expect(fs.readFileSync(file, "utf8")).toBe(original);
  });
}

test("a late global autosave response does not reopen the previous document", async ({ page, ld }) => {
  await openEditor(page, "global");
  await page.locator("#doc-editor").fill("# Saved in the background\n");
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**/api/documents/${id}`, async route => {
    if (route.request().method() === "PUT") await held;
    await route.continue();
  });
  await page.clock.fastForward(10_000);
  await expect(page.locator(selectors("global").save)).toBeDisabled();
  await page.getByTestId("category-tree").getByText("Intro", { exact: true }).click();
  await expect(page.locator("#doc-content h1")).toHaveText("Introduction");
  release();
  await expect.poll(() => fs.readFileSync(path.join(ld.docsAbs, `${id}.md`), "utf8")).toContain("Saved in the background");
  await page.clock.fastForward(20_000);
  await expect(page.locator("#doc-content h1")).toHaveText("Introduction");
  await expect(page.locator("#doc-editor")).toHaveCount(0);
});


test("global autosaves follow server-normalized content without replacing the editor draft", async ({ page, ld }) => {
  await openEditor(page, "global");
  const editor = page.locator("#doc-editor");
  const file = path.join(ld.docsAbs, `${id}.md`);
  for (const text of ["# First replacement\n\nBody one", "# Second replacement\n\nBody two"]) {
    await editor.fill(text);
    await page.clock.fastForward(10_000);
    await expect.poll(() => fs.readFileSync(file, "utf8")).toContain(text);
    await expect(page.locator(selectors("global").save)).toBeEnabled();
    await expect(editor).toHaveValue(text);
  }
});
