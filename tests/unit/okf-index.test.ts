import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { generateOkfIndexFiles } from "../../src/lib/okf/index-generator";

function write(root: string, rel: string, content: string): void {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), content);
}

test("index.md omits entries hidden by the folder manifest, but still indexes hidden folders", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-index-"));
  write(root, "a.md", "---\ntitle: A\n---\n");
  write(root, "secret.md", "---\ntitle: Secret\n---\n");
  write(root, "drafts/d.md", "---\ntitle: D\n---\n");
  write(root, "guide/g.md", "---\ntitle: G\n---\n");
  write(root, "liv-doc-main.md", "---\norder: []\nhidden:\n  - secret.md\n  - drafts\n---\n");

  generateOkfIndexFiles(root);

  const index = fs.readFileSync(path.join(root, "index.md"), "utf-8");
  assert.match(index, /\[A\]\(\.\/a\.md\)/);
  assert.match(index, /\[guide\]\(\.\/guide\/index\.md\)/);
  assert.doesNotMatch(index, /secret\.md/);
  assert.doesNotMatch(index, /drafts/);
  assert.ok(fs.existsSync(path.join(root, "drafts/index.md")));
  fs.rmSync(root, { recursive: true, force: true });
});

test("index.md does not list a folder without concepts, which gets no index.md of its own", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-index-"));
  write(root, "a.md", "---\ntitle: A\n---\n");
  write(root, "empty/liv-doc-main.md", "---\norder: []\nhidden: []\n---\n");

  generateOkfIndexFiles(root);

  const index = fs.readFileSync(path.join(root, "index.md"), "utf-8");
  assert.doesNotMatch(index, /empty/);
  assert.ok(!fs.existsSync(path.join(root, "empty/index.md")));
  fs.rmSync(root, { recursive: true, force: true });
});
