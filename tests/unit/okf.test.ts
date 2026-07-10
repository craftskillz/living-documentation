import assert from "node:assert/strict";
import { test } from "node:test";
import { parseFrontmatter } from "../../src/lib/frontmatter";
import { deriveType, normalizeFrontmatter } from "../../src/lib/okf";

test("deriveType maps genre/location deterministically", () => {
  assert.equal(deriveType("ADRS/2026_..._x.md"), "ADR");
  assert.equal(deriveType("WORKLOG/2026_..._x.md"), "Worklog");
  assert.equal(deriveType("AI/rules/no-magic.md"), "Rule");
  assert.equal(deriveType("AI/2026_..._x.md"), "Technical Doc");
  assert.equal(deriveType("General/whatever.md"), "Document");
});

test("normalizeFrontmatter converts legacy → canonical YAML with derived type + timestamp", () => {
  const legacy =
    "---\n**date:** 2026-07-08\n**status:** To be validated\n**description:** A sentence.\n**tags:** a, b\n---\n\n# Body\n\ntext";
  const out = normalizeFrontmatter(legacy, "ADRS/2026_07_08_11_09_[X]_y.md");
  const { data, format, body } = parseFrontmatter(out);
  assert.equal(format, "yaml");
  assert.equal(data.type, "ADR");
  assert.equal(data.timestamp, "2026-07-08T11:09:00Z");
  assert.equal(data.status, "To be validated");
  assert.deepEqual(data.tags, ["a", "b"]);
  assert.equal(data.date, undefined); // renamed away
  assert.equal(body, "\n# Body\n\ntext"); // one blank line kept after the block
});

test("preserves an explicit type and custom keys (e.g. sources)", () => {
  const doc = "---\ntype: Concept\ntitle: X\nsources:\n  - path: a.ts\n    hash: h\n---\nbody";
  const { data } = parseFrontmatter(normalizeFrontmatter(doc, "General/x.md"));
  assert.equal(data.type, "Concept");
  assert.deepEqual(data.sources, [{ path: "a.ts", hash: "h" }]);
});

test("is idempotent (normalize∘normalize == normalize)", () => {
  const legacy = "---\n**date:** 2026-01-02\n**status:** Accepted\n**tags:** x\n---\nbody";
  const once = normalizeFrontmatter(legacy, "ADRS/2026_01_02_08_30_[X]_z.md");
  const twice = normalizeFrontmatter(once, "ADRS/2026_01_02_08_30_[X]_z.md");
  assert.equal(twice, once);
});

test("resource field is preserved verbatim (OKF-standard key)", () => {
  const doc = "---\ntype: Concept\ntitle: X\nresource: https://example.com/api\n---\nbody";
  const { data } = parseFrontmatter(normalizeFrontmatter(doc, "General/x.md"));
  assert.equal(data.resource, "https://example.com/api");
});

test("sources override: replaces the block with fresh bindings (kept last)", () => {
  const doc = "---\ntype: ADR\ntitle: X\n---\nbody";
  const out = normalizeFrontmatter(doc, "ADRS/2026_01_02_08_30_[X]_z.md", {
    sources: [{ path: "src/a.ts", hash: "h1", commit: "c1", dirty: false }],
  });
  const { data } = parseFrontmatter(out);
  assert.deepEqual(data.sources, [
    { path: "src/a.ts", hash: "h1", commit: "c1", dirty: false },
  ]);
  // sources is pinned last, after the OKF-standard keys.
  const keys = [...out.matchAll(/^([a-z]+):/gm)].map((m) => m[1]);
  assert.equal(keys[keys.length - 1], "sources");
});

test("sources: null drops the block; undefined preserves it", () => {
  const withSrc =
    "---\ntype: ADR\ntitle: X\nsources:\n  - path: a.ts\n    hash: h\n---\nbody";
  const dropped = parseFrontmatter(
    normalizeFrontmatter(withSrc, "ADRS/x.md", { sources: null }),
  ).data;
  assert.equal(dropped.sources, undefined);
  const kept = parseFrontmatter(
    normalizeFrontmatter(withSrc, "ADRS/x.md"),
  ).data;
  assert.deepEqual(kept.sources, [{ path: "a.ts", hash: "h" }]);
});

test("sources mirror is idempotent (write ∘ write == write)", () => {
  const doc = "---\ntype: ADR\ntitle: X\n---\nbody";
  const src = [{ path: "src/a.ts", hash: "h1", commit: "c1", dirty: false }];
  const once = normalizeFrontmatter(doc, "ADRS/z.md", { sources: src });
  const twice = normalizeFrontmatter(once, "ADRS/z.md"); // write path preserves
  assert.equal(twice, once);
});

test("canonical key order: type first, then title/description/tags/timestamp/status", () => {
  const doc = "---\n**status:** Accepted\n**tags:** a\n**date:** 2026-03-04\n**description:** d\n---\nb";
  const out = normalizeFrontmatter(doc, "ADRS/2026_03_04_09_00_[X]_k.md");
  const keys = [...out.matchAll(/^([a-z]+):/gm)].map((m) => m[1]);
  assert.equal(keys[0], "type");
  assert.ok(keys.indexOf("timestamp") > keys.indexOf("description"));
});
