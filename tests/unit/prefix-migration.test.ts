import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { rewriteMovedLinks } from "../../src/lib/linkRewrite";
import { migrateFolderPrefixes, stripNumericPrefix } from "../../src/lib/prefixMigration";
import { readFolderManifest } from "../../src/lib/folderManifest";
import { parseFrontmatter } from "../../src/lib/frontmatter";

function makeBundle(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prefix-mig-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return dir;
}

const read = (dir: string, rel: string) => fs.readFileSync(path.join(dir, rel), "utf-8");
const ls = (dir: string, rel = "") => fs.readdirSync(path.join(dir, rel)).sort();

test("stripNumericPrefix removes a leading `<digits>_` and keeps everything else", () => {
  assert.equal(stripNumericPrefix("001_A"), "A");
  assert.equal(stripNumericPrefix("2_b"), "b");
  assert.equal(stripNumericPrefix("c"), null);
  assert.equal(stripNumericPrefix("1_"), null);
  assert.equal(stripNumericPrefix("v1_x"), null);
});

test("renames prefixed folders and writes their original order in the parent manifest", () => {
  const dir = makeBundle({ "001_A/a.md": "# a\n", "2_b/b.md": "# b\n", "c/c.md": "# c\n" });
  const r = migrateFolderPrefixes(dir);

  assert.deepEqual(ls(dir).filter((n) => !n.startsWith(".") && n !== "liv-doc-main.md"), ["A", "b", "c"]);
  assert.deepEqual(readFolderManifest(dir).order, ["A", "b"]);
  assert.deepEqual(
    r.renamed.map((x) => [x.from, x.to]),
    [
      ["001_A", "A"],
      ["2_b", "b"],
    ],
  );
  assert.deepEqual(r.collisions, []);
});

test("keeps the current display order of prefixed names (alphabetical, not numeric)", () => {
  const dir = makeBundle({ "1_x/a.md": "", "10_y/a.md": "", "2_z/a.md": "" });
  migrateFolderPrefixes(dir);
  assert.deepEqual(readFolderManifest(dir).order, ["x", "y", "z"]);
});

test("renames nested prefixed folders and merges with an existing manifest", () => {
  const dir = makeBundle({
    "liv-doc-main.md": "---\norder:\n  - welcome.md\n  - 2_guide\nhidden:\n  - 1_tuto\n---\n\nRoot.\n",
    "welcome.md": "",
    "1_tuto/01_intro/x.md": "",
    "1_tuto/02_next/y.md": "",
    "2_guide/g.md": "",
  });
  migrateFolderPrefixes(dir);

  const root = parseFrontmatter(read(dir, "liv-doc-main.md"));
  assert.deepEqual(root.data.order, ["welcome.md", "guide", "tuto"]);
  assert.deepEqual(root.data.hidden, ["tuto"]);
  assert.match(root.body, /Root\./);
  assert.deepEqual(ls(dir, "tuto").filter((n) => n !== "liv-doc-main.md"), ["intro", "next"]);
  assert.deepEqual(readFolderManifest(path.join(dir, "tuto")).order, ["intro", "next"]);
});

test("does not rename a folder whose target name already exists and reports it", () => {
  const dir = makeBundle({ "1_tutorial/a.md": "", "tutorial/b.md": "" });
  const r = migrateFolderPrefixes(dir);
  assert.ok(fs.existsSync(path.join(dir, "1_tutorial")));
  assert.deepEqual(r.renamed, []);
  assert.deepEqual(r.collisions, [{ from: "1_tutorial", to: "tutorial" }]);
});

test("never renames documents, even with a date prefix", () => {
  const dir = makeBundle({ "2026_01_01_[ADR]_x.md": "", "1_notes.md": "" });
  const r = migrateFolderPrefixes(dir);
  assert.deepEqual(r.renamed, []);
  assert.ok(fs.existsSync(path.join(dir, "2026_01_01_[ADR]_x.md")));
  assert.ok(fs.existsSync(path.join(dir, "1_notes.md")));
});

test("hides the root files and images folders", () => {
  const dir = makeBundle({ "files/f.pdf": "", "images/i.png": "", "doc.md": "" });
  migrateFolderPrefixes(dir);
  assert.deepEqual(readFolderManifest(dir).hidden, ["files", "images"]);
});

test("rewrites relative and ?doc= links that target renamed folders", () => {
  const enc = (id: string) => encodeURIComponent(encodeURIComponent(id));
  const dir = makeBundle({
    "home.md": [
      "[rel](./1_tuto/intro.md#top)",
      "[folder](1_tuto/)",
      `[doc](?doc=${enc("1_tuto/intro")})`,
      "[ext](https://x.org/1_tuto/intro.md)",
      "[other](./c/z.md)",
      "```",
      "[code](./1_tuto/intro.md)",
      "```",
      "[ref]: ./1_tuto/intro.md",
    ].join("\n"),
    "1_tuto/intro.md": "[back](../home.md) [sib](./intro.md) [pic](../images/p.png) [g](../2_guide/g.md)",
    "2_guide/g.md": "",
  });
  const r = migrateFolderPrefixes(dir);

  assert.equal(
    read(dir, "home.md"),
    [
      "[rel](./tuto/intro.md#top)",
      "[folder](tuto/)",
      `[doc](?doc=${enc("tuto/intro")})`,
      "[ext](https://x.org/1_tuto/intro.md)",
      "[other](./c/z.md)",
      "```",
      "[code](./1_tuto/intro.md)",
      "```",
      "[ref]: ./tuto/intro.md",
    ].join("\n"),
  );
  assert.equal(read(dir, "tuto/intro.md"), "[back](../home.md) [sib](./intro.md) [pic](../images/p.png) [g](../guide/g.md)");
  assert.deepEqual(r.linksRewritten.sort(), ["home.md", "tuto/intro.md"]);
});

test("migrates metadata, annotations and favorites keys of documents under renamed folders", () => {
  const dir = makeBundle({
    "1_tuto/intro.md": "",
    ".metadata.json": JSON.stringify({ "1_tuto/intro": [{ file: "src/a.ts" }] }),
    ".annotations.json": JSON.stringify({ "1_tuto/intro": [{ id: 1 }] }),
    ".living-doc.json": JSON.stringify({ favorites: [{ id: encodeURIComponent("1_tuto/intro"), title: "Intro" }] }),
  });
  migrateFolderPrefixes(dir);

  assert.deepEqual(Object.keys(JSON.parse(read(dir, ".metadata.json"))), ["tuto/intro"]);
  assert.deepEqual(Object.keys(JSON.parse(read(dir, ".annotations.json"))), ["tuto/intro"]);
  assert.equal(JSON.parse(read(dir, ".living-doc.json")).favorites[0].id, encodeURIComponent("tuto/intro"));
});

test("migrates source bindings that point at documents under renamed folders", () => {
  const dir = makeBundle({ "1_tuto/intro.md": "", "doc.md": "" });
  // Default sourceRoot is the docs folder parent: source paths start with its name.
  const docs = path.basename(dir);
  fs.writeFileSync(
    path.join(dir, ".metadata.json"),
    JSON.stringify({ doc: [{ path: `${docs}/1_tuto/intro.md`, hash: "h" }, { path: "src/a.ts", hash: "h" }] }),
  );
  migrateFolderPrefixes(dir);

  const entries = JSON.parse(read(dir, ".metadata.json")).doc;
  assert.deepEqual(
    entries.map((e: { path: string }) => e.path),
    [`${docs}/tuto/intro.md`, "src/a.ts"],
  );
});

test("migrates the document ids cited as evidence in diagrams", () => {
  const evidence = (id: string) => ({ evidence: [{ documentId: encodeURIComponent(id), label: "x" }] });
  const dir = makeBundle({
    "1_tuto/intro.md": "",
    ".diagrams.json": JSON.stringify({ d1: { edges: [evidence("1_tuto/intro"), evidence("other")] } }),
  });
  migrateFolderPrefixes(dir);

  const edges = JSON.parse(read(dir, ".diagrams.json")).d1.edges;
  assert.equal(edges[0].evidence[0].documentId, encodeURIComponent("tuto/intro"));
  assert.equal(edges[1].evidence[0].documentId, "other");
});

test("dry-run reports without touching the disk; a second run changes nothing", () => {
  const dir = makeBundle({ "001_A/a.md": "[x](../2_b/b.md)", "2_b/b.md": "", "images/i.png": "" });
  const dry = migrateFolderPrefixes(dir, { dryRun: true });
  assert.equal(dry.renamed.length, 2);
  assert.deepEqual(dry.linksRewritten, ["001_A/a.md"]);
  assert.deepEqual(ls(dir), ["001_A", "2_b", "images"]);

  migrateFolderPrefixes(dir);
  const snapshot = (rel: string) => read(dir, rel);
  const before = [snapshot("liv-doc-main.md"), snapshot("A/a.md")];
  const again = migrateFolderPrefixes(dir);
  assert.deepEqual(again.renamed, []);
  assert.deepEqual(again.linksRewritten, []);
  assert.deepEqual([snapshot("liv-doc-main.md"), snapshot("A/a.md")], before);
});

test("rewriteMovedLinks leaves untouched content byte-identical", () => {
  const content = "plain [a](./x.md) text";
  assert.equal(rewriteMovedLinks(content, "doc.md", () => null), content);
});
