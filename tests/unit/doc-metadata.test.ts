import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { docSlug, parseDocMetadata, titleFromFilename, uniqueDocFilename } from "../../src/lib/parser";

test("title and date come from the frontmatter, never from the filename", () => {
  const content = "---\ntitle: Pipeline de déploiement\ntimestamp: 2026-01-15T09:30:00Z\n---\n\n# Body\n";
  const meta = parseDocMetadata("2026_01_15_09_30_[DevOps]_deploy_pipeline.md", content);
  assert.equal(meta.filename, "2026_01_15_09_30_[DevOps]_deploy_pipeline.md");
  assert.equal(meta.title, "Pipeline de déploiement");
  assert.equal(meta.date, "2026-01-15T09:30");
  assert.match(meta.formattedDate ?? "", /January 15, 2026 09:30/);
  assert.equal("category" in meta, false);
});

test("a date-only timestamp keeps the day precision", () => {
  const meta = parseDocMetadata("notes.md", "---\ntitle: Notes\ntimestamp: 2026-01-15\n---\n");
  assert.equal(meta.date, "2026-01-15");
  assert.equal(meta.formattedDate, "January 15, 2026");
});

test("without frontmatter the title is the filename and there is no date", () => {
  const meta = parseDocMetadata("mon-guide_rapide.md", "# Heading only\n");
  assert.equal(meta.title, "Mon Guide Rapide");
  assert.equal(meta.date, null);
  assert.equal(meta.formattedDate, null);
});

test("a legacy date and [Category] prefix is dropped from the fallback title", () => {
  assert.equal(titleFromFilename("2026_01_15_09_30_[DevOps]_deploy_pipeline.md"), "Deploy Pipeline");
  assert.equal(titleFromFilename("ADRS/2026_01_15_meeting_notes.md"), "Meeting Notes");
  assert.equal(titleFromFilename("[Guide]_quickstart.md"), "Quickstart");
  assert.equal(titleFromFilename("2026_01_15.md"), "2026 01 15");
});

test("an unparseable timestamp is ignored", () => {
  const meta = parseDocMetadata("x.md", "---\ntitle: X\ntimestamp: soon\n---\n");
  assert.equal(meta.date, null);
});

test("the id is the URL-encoded filename without extension", () => {
  assert.equal(parseDocMetadata("2026_01_15_[Guide]_foo.md", "").id, "2026_01_15_%5BGuide%5D_foo");
});

test("docSlug lowercases, strips accents and joins words with dashes", () => {
  assert.equal(docSlug("Mon guide"), "mon-guide");
  assert.equal(docSlug("  Éléments  d'architecture / v2 "), "elements-d-architecture-v2");
  assert.equal(docSlug("!!!"), "document");
});

test("uniqueDocFilename appends -2, -3… on collision", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "doc-slug-"));
  try {
    assert.equal(uniqueDocFilename(dir, "Mon guide"), "mon-guide.md");
    fs.writeFileSync(path.join(dir, "mon-guide.md"), "");
    assert.equal(uniqueDocFilename(dir, "Mon guide"), "mon-guide-2.md");
    fs.writeFileSync(path.join(dir, "mon-guide-2.md"), "");
    assert.equal(uniqueDocFilename(dir, "Mon guide"), "mon-guide-3.md");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
