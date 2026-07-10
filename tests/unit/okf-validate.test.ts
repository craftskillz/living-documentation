import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateOkfBundle } from "../../src/lib/okf/validate";

function makeBundle(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "okf-validate-"));
  fs.mkdirSync(path.join(dir, "ADRS"), { recursive: true });
  fs.writeFileSync(path.join(dir, "index.md"), "# Index\n\nokf_version: 0.1\n");
  fs.writeFileSync(path.join(dir, "log.md"), "# Changelog\n");
  return dir;
}

const CONFORMANT =
  "---\ntype: ADR\ntitle: A decision\ntimestamp: 2026-07-10T08:00:00Z\n---\n\n# Body\n";

test("a conformant bundle passes with no violations", () => {
  const dir = makeBundle();
  fs.writeFileSync(path.join(dir, "ADRS", "d.md"), CONFORMANT);
  const r = validateOkfBundle(dir);
  assert.equal(r.ok, true);
  assert.equal(r.checked, 1);
  assert.deepEqual(r.violations, []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("missing timestamp is a warning, not an error (undated concepts are valid)", () => {
  const dir = makeBundle();
  fs.writeFileSync(path.join(dir, "ADRS", "rule.md"), "---\ntype: Rule\ntitle: A rule\n---\nbody");
  const r = validateOkfBundle(dir);
  assert.equal(r.ok, true); // no error-severity violations
  assert.equal(r.errors, 0);
  assert.equal(r.warnings, 1);
  assert.equal(r.violations[0].rule, "timestamp");
  assert.equal(r.violations[0].severity, "warning");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("flags legacy frontmatter, empty type and missing title as errors", () => {
  const dir = makeBundle();
  fs.writeFileSync(path.join(dir, "ADRS", "legacy.md"), "---\n**status:** ok\n---\nbody");
  fs.writeFileSync(
    path.join(dir, "ADRS", "bad.md"),
    "---\ntype: ''\ntitle: ''\n---\nbody",
  );
  const r = validateOkfBundle(dir);
  assert.equal(r.ok, false);
  const errorRules = new Set(
    r.violations.filter((v) => v.severity === "error").map((v) => `${path.basename(v.file)}:${v.rule}`),
  );
  assert.ok(errorRules.has("legacy.md:frontmatter"));
  assert.ok(errorRules.has("bad.md:type"));
  assert.ok(errorRules.has("bad.md:title"));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("flags unknown type, non-ISO timestamp, malformed sources", () => {
  const dir = makeBundle();
  fs.writeFileSync(
    path.join(dir, "ADRS", "x.md"),
    "---\ntype: Widget\ntitle: X\ntimestamp: 2026-07-10\nsources:\n  - hash: h\n---\nbody",
  );
  const r = validateOkfBundle(dir);
  const rules = r.violations.filter((v) => path.basename(v.file) === "x.md").map((v) => v.rule);
  assert.ok(rules.includes("type")); // "Widget" not in the vocabulary
  assert.ok(rules.includes("timestamp")); // date-only, not full ISO
  assert.ok(rules.includes("sources")); // entry missing `path`
  fs.rmSync(dir, { recursive: true, force: true });
});

test("flags missing reserved files (index.md without okf_version, no log.md)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "okf-validate-"));
  fs.writeFileSync(path.join(dir, "index.md"), "# Index\n"); // no okf_version, no log.md
  const r = validateOkfBundle(dir);
  const rules = r.violations.map((v) => `${v.file}:${v.rule}`);
  assert.ok(rules.includes("index.md:reserved"));
  assert.ok(rules.includes("log.md:reserved"));
  fs.rmSync(dir, { recursive: true, force: true });
});
