import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { importOkfBundle } from "../../src/lib/okf/import";
import { validateOkfBundle } from "../../src/lib/okf/validate";
import { parseFrontmatter } from "../../src/lib/frontmatter";

// A minimal external OKF bundle: two concepts (one nested with a relative link),
// plus reserved files that must NOT be imported.
function makeExternalBundle(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "okf-src-"));
  fs.mkdirSync(path.join(dir, "guides"), { recursive: true });
  fs.writeFileSync(path.join(dir, "index.md"), "# Index\n\nokf_version: 0.1\n");
  fs.writeFileSync(path.join(dir, "log.md"), "# Changelog\n");
  fs.writeFileSync(
    path.join(dir, "overview.md"),
    "---\ntype: Concept\ntitle: Overview\ntimestamp: 2026-01-01T00:00:00Z\n---\n\nSee [guide](./guides/getting-started.md).\n",
  );
  fs.writeFileSync(
    path.join(dir, "guides", "getting-started.md"),
    // An exotic type the local vocabulary doesn't know — must survive import.
    "---\ntype: Tutorial\ntitle: Getting started\ntimestamp: 2026-01-02T00:00:00Z\n---\n\nbody\n",
  );
  return dir;
}

function makeTargetBundle(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "okf-dst-"));
  fs.writeFileSync(path.join(dir, "index.md"), "# Index\n\nokf_version: 0.1\n");
  fs.writeFileSync(path.join(dir, "log.md"), "# Changelog\n");
  return dir;
}

test("imports concepts under IMPORTED/<bundle>, preserving structure and type", () => {
  const src = makeExternalBundle();
  const dst = makeTargetBundle();
  const r = importOkfBundle(src, dst, { name: "ga4" });

  assert.deepEqual(r.errors, []);
  assert.equal(r.imported, 2);
  assert.equal(r.skippedReserved, 2); // index.md + log.md not imported
  assert.equal(r.targetDir, "IMPORTED/ga4");

  // Folder structure preserved.
  assert.ok(fs.existsSync(path.join(dst, "IMPORTED", "ga4", "overview.md")));
  assert.ok(fs.existsSync(path.join(dst, "IMPORTED", "ga4", "guides", "getting-started.md")));

  // Original (even exotic) type preserved through normalization.
  const nested = fs.readFileSync(path.join(dst, "IMPORTED", "ga4", "guides", "getting-started.md"), "utf-8");
  assert.equal(parseFrontmatter(nested).data.type, "Tutorial");

  // Round-trip: the target bundle still validates (exotic type is a warning).
  const v = validateOkfBundle(dst);
  assert.equal(v.ok, true);
  assert.equal(v.errors, 0);

  fs.rmSync(src, { recursive: true, force: true });
  fs.rmSync(dst, { recursive: true, force: true });
});

test("refuses to import into a non-empty target", () => {
  const src = makeExternalBundle();
  const dst = makeTargetBundle();
  importOkfBundle(src, dst, { name: "ga4" });
  const again = importOkfBundle(src, dst, { name: "ga4" });
  assert.equal(again.imported, 0);
  assert.ok(again.errors.some((e) => /already exists/.test(e)));
  fs.rmSync(src, { recursive: true, force: true });
  fs.rmSync(dst, { recursive: true, force: true });
});
