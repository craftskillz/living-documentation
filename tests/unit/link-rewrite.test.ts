import assert from "node:assert/strict";
import { test } from "node:test";
import { entryMapper, entryMatcher, rewriteMovedLinks, unlinkDeletedLinks } from "../../src/lib/linkRewrite";

const enc = (id: string) => encodeURIComponent(encodeURIComponent(id));

test("entryMapper maps a file, or a folder and everything below it", () => {
  const file = entryMapper("a/x.md", "a/y.md", false);
  assert.equal(file("a/x.md"), "a/y.md");
  assert.equal(file("a/x.mdx"), null);
  const folder = entryMapper("a", "b/c", true);
  assert.equal(folder("a"), "b/c");
  assert.equal(folder("a/x.md"), "b/c/x.md");
  assert.equal(folder("ab/x.md"), null);
});

test("a renamed file: relative, bundle-relative and ?doc= links follow, anchors kept", () => {
  const mapPath = entryMapper("guide/x.md", "guide/renamed.md", false);
  const content = [
    "[rel](./guide/x.md#top)",
    "[bare](guide/x.md)",
    "[abs](/guide/x.md?v=1)",
    `[doc](?doc=${enc("guide/x")}#h)`,
    "[ref]: ./guide/x.md",
    "[other](./guide/y.md) [ext](https://e.org/guide/x.md)",
    "```",
    "[code](./guide/x.md)",
    "```",
  ].join("\n");
  assert.equal(
    rewriteMovedLinks(content, "home.md", mapPath),
    [
      "[rel](./guide/renamed.md#top)",
      "[bare](guide/renamed.md)",
      "[abs](/guide/renamed.md?v=1)",
      `[doc](?doc=${enc("guide/renamed")}#h)`,
      "[ref]: ./guide/renamed.md",
      "[other](./guide/y.md) [ext](https://e.org/guide/x.md)",
      "```",
      "[code](./guide/x.md)",
      "```",
    ].join("\n"),
  );
});

test("a renamed folder keeps the shape of links through `..`", () => {
  const mapPath = entryMapper("guide", "manual", true);
  assert.equal(
    rewriteMovedLinks("[a](../guide/x.md) [b](./x.md)", "guide/y.md", mapPath),
    "[a](../manual/x.md) [b](./x.md)",
  );
  assert.equal(rewriteMovedLinks("[f](notes/../guide/)", "home.md", mapPath), "[f](notes/../manual/)");
});

test("a moved file: incoming links follow and its own relative links are recomputed", () => {
  const mapPath = entryMapper("guide/x.md", "notes/deep/x.md", false);
  assert.equal(rewriteMovedLinks("[x](./guide/x.md)", "home.md", mapPath), "[x](./notes/deep/x.md)");
  assert.equal(rewriteMovedLinks("[x](x.md)", "guide/z.md", mapPath), "[x](../notes/deep/x.md)");
  assert.equal(
    rewriteMovedLinks("[h](../home.md) [s](./z.md#a) [i](../images/p.png) [w](https://w.org) [t](#top)", "guide/x.md", mapPath),
    "[h](../../home.md) [s](../../guide/z.md#a) [i](../../images/p.png) [w](https://w.org) [t](#top)",
  );
  assert.equal(rewriteMovedLinks("[h](/home.md)", "guide/x.md", mapPath), "[h](/home.md)");
});

test("a moved folder: links between its own documents are untouched", () => {
  const mapPath = entryMapper("guide", "archive/guide", true);
  assert.equal(rewriteMovedLinks("[s](./z.md) [p](../guide/z.md)", "guide/x.md", mapPath), "[s](./z.md) [p](../guide/z.md)");
  assert.equal(rewriteMovedLinks("[h](../home.md)", "guide/x.md", mapPath), "[h](../../home.md)");
});

test("encoded segments stay encoded once rewritten", () => {
  const mapPath = entryMapper("my guide/x.md", "my guide/new name.md", false);
  assert.equal(rewriteMovedLinks("[x](./my%20guide/x.md)", "home.md", mapPath), "[x](./my%20guide/new%20name.md)");
});

test("rewriteMovedLinks leaves unaffected content byte-identical", () => {
  const content = "plain [a](./x.md) [b](../outside.md) text";
  assert.equal(rewriteMovedLinks(content, "doc.md", entryMapper("y.md", "z.md", false)), content);
});

test("a deleted file: links to it keep their text, reference definitions go, the rest is untouched", () => {
  const deleted = entryMatcher("guide/x.md", false);
  const content = [
    `See [rel](./guide/x.md#top) and [doc](?doc=${enc("guide/x")}).`,
    '[titled](/guide/x.md "Title") [other](./guide/y.md) [ext](https://e.org/guide/x.md)',
    "![img](./guide/x.md)",
    "[ref]: ./guide/x.md",
    "[keep]: ./guide/y.md",
    "```",
    "[code](./guide/x.md)",
    "```",
  ].join("\n");
  assert.equal(
    unlinkDeletedLinks(content, "home.md", deleted),
    [
      "See rel and doc.",
      "titled [other](./guide/y.md) [ext](https://e.org/guide/x.md)",
      "![img](./guide/x.md)",
      "[keep]: ./guide/y.md",
      "```",
      "[code](./guide/x.md)",
      "```",
    ].join("\n"),
  );
});

test("a deleted folder: links to any document below it are unlinked, relative to the linking file", () => {
  const deleted = entryMatcher("guide", true);
  const content = "[a](../guide/sub/a.md) [b](../guidebook/b.md) [c](../guide)";
  assert.equal(unlinkDeletedLinks(content, "notes/home.md", deleted), "a [b](../guidebook/b.md) c");
});
