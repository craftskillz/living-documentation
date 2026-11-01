import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { test, expect } from "../helpers/ld-fixture";

const docId = "editor-paste-test";
const body = "# Document\n\nBefore section.\n\n## Target\n\nEdit **this word** here.\n\n## Following\n\nLeave this unchanged.\n";
const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/7yMK/gAAAABJRU5ErkJggg==";

const MODES = {
  global: {
    selector: "#doc-editor",
    open: async (page: Page) => { await page.getByTestId("edit-doc-btn").click(); },
  },
  section: {
    selector: "#section-markdown",
    open: async (page: Page) => {
      await page.locator("#doc-content strong").click({ button: "right" });
      await page.locator('#inline-snippet-popup [data-action="edit-section"]').click();
    },
  },
} as const;

test.beforeEach(async ({ page, request, ld }) => {
  const created = await request.post(`${ld.baseURL}/api/documents`, { data: { title: "Editor paste test", content: body } });
  expect(created.ok()).toBeTruthy();
  await request.put(`${ld.baseURL}/api/config`, { data: { language: "fr" } });
  await page.goto(`${ld.baseURL}/?doc=${docId}`);
  await expect(page.locator("#doc-content strong")).toBeVisible();
});

async function setCaret(page: Page, selector: string, text: string) {
  return page.locator(selector).evaluate((el: HTMLTextAreaElement, needle) => {
    const at = el.value.indexOf(needle);
    el.focus();
    el.setSelectionRange(at, at);
    return at;
  }, text);
}

async function dispatchFile(page: Page, selector: string, event: "paste" | "drop", name: string, type: string, base64: string) {
  await page.locator(selector).evaluate((el, file) => {
    const bytes = Uint8Array.from(atob(file.base64), c => c.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([bytes], file.name, { type: file.type }));
    el.dispatchEvent(file.event === "paste"
      ? new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true })
      : new DragEvent("drop", { dataTransfer: data, bubbles: true, cancelable: true }));
  }, { event, name, type, base64 });
}

for (const [mode, { selector, open }] of Object.entries(MODES)) {
  test(`${mode}: a pasted image is named, uploaded and inserted at the caret`, async ({ page, ld }) => {
    await open(page);
    const editor = page.locator(selector);
    const caret = await setCaret(page, selector, "Edit ");
    await dispatchFile(page, selector, "paste", "capture.png", "image/png", PNG_BASE64);
    await page.locator("#img-paste-name").fill("Ma Capture");
    await page.getByRole("button", { name: "Coller", exact: true }).click();
    await expect(page.locator("#img-paste-name")).toHaveCount(0);
    await expect(editor).toHaveValue(/!\[image\]\(\/images\/ma_capture[^)]*\.png\)/);
    const value = await editor.inputValue();
    expect(value.indexOf("![image]")).toBe(caret);
    const filename = value.match(/\/images\/([^)]+)\)/)?.[1] ?? "";
    expect(fs.existsSync(path.join(ld.docsAbs, "images", filename))).toBe(true);
  });

  test(`${mode}: cancelling the image prompt inserts nothing`, async ({ page }) => {
    await open(page);
    const before = await page.locator(selector).inputValue();
    await setCaret(page, selector, "Edit ");
    await dispatchFile(page, selector, "paste", "capture.png", "image/png", PNG_BASE64);
    await page.locator("#img-paste-name").locator("../../..").getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(page.locator("#img-paste-name")).toHaveCount(0);
    await expect(page.locator(selector)).toHaveValue(before);
  });

  for (const event of ["paste", "drop"] as const) {
    test(`${mode}: a ${event} of a file uploads it and inserts its link`, async ({ page }) => {
      await open(page);
      await setCaret(page, selector, "Edit ");
      await dispatchFile(page, selector, event, "notes.txt", "text/plain", btoa("hello"));
      await expect(page.locator(selector)).toHaveValue(/\[📎 notes\.txt\]\([^)]+\)Edit /);
    });
  }

  test(`${mode}: a failed image upload reports the error and keeps the draft`, async ({ page }) => {
    await open(page);
    const before = await page.locator(selector).inputValue();
    await page.route("**/api/images/upload", route => route.fulfill({ status: 500, body: "upload refused" }));
    await setCaret(page, selector, "Edit ");
    await dispatchFile(page, selector, "paste", "capture.png", "image/png", PNG_BASE64);
    await page.getByRole("button", { name: "Coller", exact: true }).click();
    await expect(page.getByText("Échec du téléversement : upload refused")).toBeVisible();
    await expect(page.locator(selector)).toHaveValue(before);
  });
}

test("section: a pasted image reaches the preview and the save keeps the whole document", async ({ page, ld }) => {
  const file = path.join(ld.docsAbs, `${docId}.md`);
  const { selector, open } = MODES.section;
  await open(page);
  await setCaret(page, selector, "Edit ");
  await dispatchFile(page, selector, "paste", "capture.png", "image/png", PNG_BASE64);
  await page.getByRole("button", { name: "Coller", exact: true }).click();
  await expect(page.locator("#section-preview img[src^='/images/']")).toHaveCount(1);
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.locator("#section-editor")).toHaveCount(0);
  const saved = fs.readFileSync(file, "utf8");
  expect(saved).toContain("Before section.");
  expect(saved).toContain("## Following");
  expect(saved).toMatch(/!\[image\]\(\/images\/[^)]+\)Edit \*\*this word\*\*/);
});

test("section: Escape closes only the image prompt and keeps the draft", async ({ page }) => {
  const { selector, open } = MODES.section;
  await open(page);
  await page.locator(selector).fill("## Target\n\nMy draft\n\n");
  await setCaret(page, selector, "My draft");
  await dispatchFile(page, selector, "paste", "capture.png", "image/png", PNG_BASE64);
  await expect(page.locator("#img-paste-name")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#img-paste-name")).toHaveCount(0);
  await expect(page.locator("#section-editor")).toBeVisible();
  await expect(page.locator(selector)).toHaveValue("## Target\n\nMy draft\n\n");
});
