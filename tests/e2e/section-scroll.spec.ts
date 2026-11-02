import type { Page } from "@playwright/test";
import { test, expect } from "../helpers/ld-fixture";

const editorSelector = "#section-markdown";
const previewSelector = ".section-preview-scroll";
const paragraph = "A long source line wraps differently from the rendered paragraph. ".repeat(18);
const source = "# Scroll test\n\n## Scroll\n\n" + Array.from({ length: 18 }, (_, i) =>
  `### Landmark ${i}\n\n${paragraph}\n\n${i === 3 ? '![Tall illustration](/scroll-illustration.svg)\n\n' : ''}`,
).join("") + "## Outside\n\nUnchanged.\n";

test.beforeEach(async ({ page, request, ld }) => {
  await page.route("**/scroll-illustration.svg", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="1100"><rect width="400" height="1100" fill="#93c5fd"/></svg>' }));
  expect((await request.post(`${ld.baseURL}/api/documents`, { data: { title: "Scroll test", content: source } })).ok()).toBeTruthy();
  await request.put(`${ld.baseURL}/api/config`, { data: { language: "fr" } });
  await page.goto(`${ld.baseURL}/?doc=scroll-test`);
  await page.locator("#doc-content h2").filter({ hasText: "Scroll" }).click({ button: "right" });
  await page.locator('[data-action="edit-section"]').click();
  await expect(page.locator("#section-preview h3")).toHaveCount(18);
  await expect.poll(() => page.locator("#section-preview img").evaluate((el: HTMLImageElement) => el.complete && el.naturalHeight > 0)).toBe(true);
});

// Independent reference: let a native textarea lay out the prefix, including all wrapped lines.
async function sourceTop(page: Page, landmark: number) {
  return page.locator(editorSelector).evaluate((el: HTMLTextAreaElement, n) => {
    const clone = el.cloneNode() as HTMLTextAreaElement;
    clone.removeAttribute("id");
    clone.style.cssText = `position:absolute;visibility:hidden;height:0;min-height:0;flex:none;width:${el.getBoundingClientRect().width}px;`;
    clone.value = el.value.slice(0, el.value.indexOf(`### Landmark ${n}\n`)) + "x";
    if (!el.parentElement) throw new Error("Missing editor parent");
    el.parentElement.appendChild(clone);
    const style = getComputedStyle(clone);
    const top = clone.scrollHeight - parseFloat(style.paddingBottom) - parseFloat(style.lineHeight);
    clone.remove();
    return top;
  }, landmark);
}

async function previewTop(page: Page, landmark: number) {
  return page.locator("#section-preview h3").filter({ hasText: new RegExp(`^Landmark ${landmark}$`) }).evaluate(el => {
    const scroller = el.closest(".section-preview-scroll");
    if (!scroller) throw new Error("Missing preview scroller");
    return el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
  });
}

async function scrollTo(page: Page, selector: string, top: number) {
  await page.locator(selector).evaluate((el, value) => { el.scrollTop = value; }, top);
}

async function expectScroll(page: Page, selector: string, top: number) {
  await expect.poll(async () => Math.abs(await page.locator(selector).evaluate(el => el.scrollTop) - top)).toBeLessThan(2);
}

test("aligns source blocks in both directions despite an image and wrapped lines", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Défilement synchronisé" })).toHaveAttribute("aria-pressed", "true");
  const left = await sourceTop(page, 6), right = await previewTop(page, 6);
  await scrollTo(page, editorSelector, left);
  await expectScroll(page, previewSelector, right);
  const nextLeft = await sourceTop(page, 10), nextRight = await previewTop(page, 10);
  await scrollTo(page, previewSelector, nextRight);
  await expectScroll(page, editorSelector, nextLeft);
  await expectScroll(page, previewSelector, nextRight);
  await page.screenshot({ path: "/tmp/ld-section-scroll-synced.png" });
});

test("can be disabled and reenabled, with both document ends reachable", async ({ page }) => {
  const toggle = page.getByRole("button", { name: "Défilement synchronisé" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  const left = await sourceTop(page, 4);
  await scrollTo(page, editorSelector, left);
  await expectScroll(page, previewSelector, 0);
  const right = await previewTop(page, 8);
  await scrollTo(page, previewSelector, right);
  await expectScroll(page, editorSelector, left);
  // Wait for the browser's scroll event before selecting the last pane as driver.
  await page.locator(previewSelector).hover();
  await page.mouse.wheel(0, 20);
  await expect.poll(() => page.locator(previewSelector).evaluate(el => el.scrollTop)).toBeGreaterThan(right);
  await toggle.click();
  await expect.poll(() => page.locator(editorSelector).evaluate(el => el.scrollTop)).toBeGreaterThan(left);
  await page.locator(editorSelector).evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect.poll(() => page.locator(previewSelector).evaluate(el => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThan(2);
  await scrollTo(page, previewSelector, 0);
  await expectScroll(page, editorSelector, 0);
});

test("rebuilds after edits and resizing without moving the source caret", async ({ page }) => {
  const left = await sourceTop(page, 6);
  await scrollTo(page, editorSelector, left);
  await expectScroll(page, previewSelector, await previewTop(page, 6));
  const editor = page.locator(editorSelector);
  await editor.focus();
  await editor.evaluate((el: HTMLTextAreaElement) => {
    const position = el.value.indexOf("### Landmark 6\n") + "### Landmark 6".length;
    el.setSelectionRange(position, position);
  });
  await scrollTo(page, editorSelector, left);
  await expectScroll(page, previewSelector, await previewTop(page, 6));
  await page.keyboard.insertText(" updated");
  const selection = await editor.evaluate((el: HTMLTextAreaElement) => el.selectionStart);
  await expect(page.locator("#section-preview h3").filter({ hasText: "Landmark 6 updated" })).toBeVisible();
  await expectScroll(page, editorSelector, left);
  expect(await editor.evaluate((el: HTMLTextAreaElement) => el.selectionStart)).toBe(selection);
  await page.setViewportSize({ width: 580, height: 900 });
  const resizedLeft = await sourceTop(page, 10);
  await scrollTo(page, editorSelector, resizedLeft);
  await expectScroll(page, previewSelector, await previewTop(page, 10));
  await page.locator("#section-preview img").evaluate((el: HTMLImageElement) => { el.style.height = "1500px"; });
  await expectScroll(page, previewSelector, await previewTop(page, 10));
  await expectScroll(page, editorSelector, resizedLeft);
});
