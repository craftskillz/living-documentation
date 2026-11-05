import fs from "node:fs";
import path from "node:path";
import { test, expect } from "../helpers/ld-fixture";

const docId = "section-editor-test";
const body = "# Document\n\nBefore section.\n\n" + "Long introduction.\n\n".repeat(25) +
  "## Target\n\nEdit **this word** here.[^note]\nSoft break\nsecond line.\n\n### Child\n\nNested text.\n\n" +
  "## Following\n\nLeave this unchanged.\n\n[^note]: A referenced note.\n";

test.beforeEach(async ({ page, request, ld }) => {
  const created = await request.post(`${ld.baseURL}/api/documents`, { data: { title: "Section editor test", content: body } });
  expect(created.ok()).toBeTruthy();
  await request.put(`${ld.baseURL}/api/config`, { data: { language: "fr", markdownSoftBreaks: true } });
  await page.goto(`${ld.baseURL}/?doc=${docId}`);
  await expect(page.locator("#doc-content h2").filter({ hasText: "Target" })).toBeVisible();
});

async function openSection(page: import("@playwright/test").Page) {
  await page.locator("#doc-content strong").click({ button: "right" });
  await expect(page.locator('#inline-snippet-popup [data-action="insert"]')).toBeVisible();
  await page.locator('#inline-snippet-popup [data-action="edit-section"]').click();
  await expect(page.getByRole("dialog", { name: "Modifier la section" })).toBeVisible();
}

test("edits only the clicked section with the viewer preview and resumes reading", async ({ page, ld }) => {
  const file = path.join(ld.docsAbs, `${docId}.md`);
  const initial = fs.readFileSync(file, "utf8");
  await openSection(page);
  const scroll = await page.locator("#home-content-area").evaluate(el => el.scrollTop);
  const editor = page.locator("#section-markdown");
  await expect(editor).toHaveValue("## Target\n\nEdit **this word** here.[^note]\nSoft break\nsecond line.\n\n### Child\n\nNested text.\n\n");
  await expect(page.locator("#section-preview strong")).toHaveText("this word");
  await expect(page.locator("#section-preview section[data-footnotes]")).toContainText("A referenced note.");
  await expect(page.locator("#section-preview br")).not.toHaveCount(0);
  const left = await editor.boundingBox();
  const right = await page.locator("#section-preview").boundingBox();
  if (!left || !right) throw new Error("Missing editor panes");
  expect(left.x + left.width).toBeLessThan(right.x);
  await page.screenshot({ path: "/tmp/ld-section-editor-desktop.png" });
  const value = (await editor.inputValue()).replace("this word", "changed word");
  await editor.fill(value);
  await expect(page.locator("#section-preview strong")).toHaveText("changed word");
  expect(fs.readFileSync(file, "utf8")).toBe(initial);
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.locator("#section-editor")).toHaveCount(0);
  await expect(page.locator("#doc-content strong")).toHaveText("changed word");
  expect(fs.readFileSync(file, "utf8")).toBe(initial.replace("this word", "changed word"));
  await expect.poll(() => page.locator("#home-content-area").evaluate(el => el.scrollTop)).toBe(scroll);
  await page.reload();
  await expect(page.locator("#doc-content strong")).toHaveText("changed word");
});

test("cancel and Escape discard the section draft, including on narrow screens", async ({ page, ld }) => {
  const file = path.join(ld.docsAbs, `${docId}.md`);
  const initial = fs.readFileSync(file, "utf8");
  await page.setViewportSize({ width: 540, height: 800 });
  await openSection(page);
  await page.locator("#section-markdown").fill("## Discard me");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await openSection(page);
  await expect(page.locator("#section-markdown")).toHaveValue(/## Target/);
  await page.screenshot({ path: "/tmp/ld-section-editor-narrow.png" });
  await page.locator("#section-markdown").press("Escape");
  await expect(page.locator("#section-editor")).toHaveCount(0);
  expect(fs.readFileSync(file, "utf8")).toBe(initial);
});

test("a heading keeps its snippet actions and offers section editing", async ({ page }) => {
  await page.locator("#doc-content h3").click({ button: "right" });
  await expect(page.locator('#inline-snippet-popup [data-action="edit"]')).toBeVisible();
  await expect(page.locator('#inline-snippet-popup [data-action="delete"]')).toBeVisible();
  await page.locator('#inline-snippet-popup [data-action="edit-section"]').click();
  await expect(page.locator("#section-markdown")).toHaveValue("### Child\n\nNested text.\n\n");
});

test("concurrent file changes are preserved and the unsaved draft stays available", async ({ page, ld }) => {
  const file = path.join(ld.docsAbs, `${docId}.md`);
  await openSection(page);
  await page.locator("#section-markdown").fill("## My draft\n\nKeep this");
  const external = fs.readFileSync(file, "utf8").replace("Before section.", "Changed externally.");
  fs.writeFileSync(file, external);
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.locator("#section-editor [role=alert]")).toContainText("Le document a changé");
  await expect(page.locator("#section-markdown")).toHaveValue("## My draft\n\nKeep this");
  expect(fs.readFileSync(file, "utf8")).toBe(external);
});

test("save errors preserve the draft and allow retry", async ({ page }) => {
  await openSection(page);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.locator("#section-markdown").fill("## Updated\n\nRetry me");
  await expect(page.locator("#section-preview")).toContainText("Retry me");
  await page.screenshot({ path: "/tmp/ld-section-editor-dark.png" });
  await page.route(`**/api/documents/${docId}`, async route => {
    if (route.request().method() === "PUT") return route.fulfill({ status: 500, body: "Save unavailable" });
    await route.continue();
  });
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.locator("#section-editor [role=alert]")).toContainText("Save unavailable");
  await expect(page.locator("#section-markdown")).toHaveValue("## Updated\n\nRetry me");
  await page.unroute(`**/api/documents/${docId}`);
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.locator("#section-editor")).toHaveCount(0);
  await expect(page.locator("#doc-content")).toContainText("Retry me");
  await expect(page.locator("#doc-content")).toContainText("Leave this unchanged.");
});


test("a headingless document previews its last line without a trailing newline", async ({ page, request, ld }) => {
  await request.put(`${ld.baseURL}/api/documents/${docId}`, { data: { content: "A single **word**" } });
  await page.reload();
  await openSection(page);
  await expect(page.locator("#section-markdown")).toHaveValue(/^[\s]*A single \*\*word\*\*$/);
  await expect(page.locator("#section-preview strong")).toHaveText("word");
  await page.locator("#section-markdown").fill("Entirely changed");
  await expect(page.locator("#section-preview")).toHaveText("Entirely changed");
});

test("snippets insert at the caret of the section draft and Escape closes only the picker", async ({ page, ld }) => {
  const file = path.join(ld.docsAbs, `${docId}.md`);
  const initial = fs.readFileSync(file, "utf8");
  await openSection(page);
  const editor = page.locator("#section-markdown");
  const original = await editor.inputValue();
  const caret = original.indexOf("Edit ");
  await editor.evaluate((el: HTMLTextAreaElement, at) => { el.focus(); el.setSelectionRange(at, at); }, caret);

  await page.getByTestId("section-snippets").click();
  await expect(page.locator("#snippets-modal")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#snippets-modal")).toBeHidden();
  await expect(page.locator("#section-editor")).toBeVisible();

  await page.getByTestId("section-snippets").click();
  await page.locator('#snippet-picker [data-snippet-type="colored-text"]').click();
  await page.locator("#snip-colored-text-content").fill("Inserted snippet");
  await page.locator("#snippet-submit-btn").click();
  await expect(page.locator("#snippets-modal")).toBeHidden();

  const value = await editor.inputValue();
  expect(value.indexOf("Inserted snippet")).toBeGreaterThanOrEqual(caret);
  expect(value.indexOf("Inserted snippet")).toBeLessThan(value.indexOf("Edit "));
  await expect(page.locator("#section-preview")).toContainText("Inserted snippet");

  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.locator("#section-editor")).toHaveCount(0);
  expect(fs.readFileSync(file, "utf8")).toBe(initial.replace(original, value));
});

test("the diagram snippet saves the whole document, not only the section", async ({ page, ld }) => {
  const file = path.join(ld.docsAbs, `${docId}.md`);
  await openSection(page);
  await page.getByTestId("section-snippets").click();
  await page.locator('#snippet-picker [data-snippet-type="diagram"]').click();
  await page.locator("#snip-diag-mode-new").check();
  await page.locator("#snip-diag-new-name").fill("Section diagram");
  await page.locator("#snippet-submit-btn").click();
  await page.waitForURL(/\/diagram\?id=/);
  const saved = fs.readFileSync(file, "utf8");
  expect(saved).toContain("Before section.");
  expect(saved).toContain("## Following");
  expect(saved).toContain("[![Section diagram]");
});

test("a failed save keeps the diagram snippet in the section draft without leaving", async ({ page, ld }) => {
  const file = path.join(ld.docsAbs, `${docId}.md`);
  await openSection(page);
  const external = fs.readFileSync(file, "utf8").replace("Before section.", "Changed externally.");
  fs.writeFileSync(file, external);
  const alerted = new Promise<string>(resolve => page.once("dialog", dialog => {
    const message = dialog.message();
    void dialog.accept();
    resolve(message);
  }));
  await page.getByTestId("section-snippets").click();
  await page.locator('#snippet-picker [data-snippet-type="diagram"]').click();
  await page.locator("#snip-diag-mode-new").check();
  await page.locator("#snippet-submit-btn").click();
  expect(await alerted).toContain("Le document a changé");
  await expect(page.locator("#snippets-modal")).toBeHidden();
  await expect(page).not.toHaveURL(/\/diagram/);
  await expect(page.locator("#section-markdown")).toHaveValue(/\[!\[/);
  expect(fs.readFileSync(file, "utf8")).toBe(external);
});

test("same-document anchors in the snippet picker list the whole document", async ({ page }) => {
  await openSection(page);
  await page.getByTestId("section-snippets").click();
  await page.locator('#snippet-picker [data-snippet-type="anchor-link"]').click();
  await expect(page.locator("#snip-anchor-id option").filter({ hasText: "Following" })).toHaveCount(1);
  await expect(page.locator("#snip-anchor-id option").filter({ hasText: "Target" })).toHaveCount(1);
});

test("the preview shows only the footnotes the section uses", async ({ page, request, ld }) => {
  const content = "# Notes\n\n## Avec\n\nUn[^a] texte.\n\n## Autre\n\nDeux[^b] texte.\n\n## Sans\n\nTrois texte.\n\n" +
    "[^a]: Note alpha[^c]\n[^b]: Note beta\n[^c]: Note gamma\n";
  await request.post(`${ld.baseURL}/api/documents`, { data: { title: "Notes filtrees", content } });
  await page.goto(`${ld.baseURL}/?doc=notes-filtrees`);
  const notes = page.locator("#section-preview section[data-footnotes]");

  const open = async (text: string) => {
    await page.locator("#doc-content p", { hasText: text }).click({ button: "right" });
    await page.locator('#inline-snippet-popup [data-action="edit-section"]').click();
    await expect(page.locator("#section-preview p").first()).toContainText(text);
  };

  await open("Trois texte");
  await expect(notes).toHaveCount(0);

  // A note cited by a note the section uses is part of what the reader needs.
  // This last section also holds the definitions: only the reference is added.
  const editor = page.locator("#section-markdown");
  await editor.fill((await editor.inputValue()).replace("Trois texte.", "Trois texte[^a]."));
  await expect(notes.locator("li")).toHaveCount(2);
  await expect(notes).toContainText("Note alpha");
  await expect(notes).toContainText("Note gamma");
  await expect(notes).not.toContainText("Note beta");
});
