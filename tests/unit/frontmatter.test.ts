import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getField,
  getFirstField,
  parseFrontmatter,
  serializeFrontmatter,
} from "../../src/lib/frontmatter";

test("parses legacy **bold** frontmatter (tags normalized to array)", () => {
  const doc =
    "---\n**date:** 2026-07-08\n**status:** To be validated\n**tags:** a, b, c\n---\n\nBody";
  const r = parseFrontmatter(doc);
  assert.equal(r.format, "legacy");
  assert.equal(r.data.date, "2026-07-08");
  assert.equal(r.data.status, "To be validated");
  assert.deepEqual(r.data.tags, ["a", "b", "c"]);
  assert.equal(r.body, "\nBody");
});

test("parses YAML frontmatter with a list and a quoted colon value", () => {
  const doc = "---\ntype: ADR\ntags:\n  - a\n  - b\ndescription: 'has: colon'\n---\nBody";
  const r = parseFrontmatter(doc);
  assert.equal(r.format, "yaml");
  assert.equal(r.data.type, "ADR");
  assert.deepEqual(r.data.tags, ["a", "b"]);
  assert.equal(r.data.description, "has: colon");
});

test("getField / getFirstField are case-insensitive; arrays join with ', '", () => {
  const legacy = "---\n**status:** Accepted\n**tags:** x, y\n---\n";
  assert.equal(getField(legacy, "STATUS"), "Accepted");
  assert.equal(getField(legacy, "tags"), "x, y");
  assert.equal(getFirstField(legacy, ["language", "status"]), "Accepted");
  assert.equal(getFirstField(legacy, ["language", "langue"]), null);
});

test("serialize → parse round-trips, including special characters", () => {
  const data = {
    type: "ADR",
    title: "T",
    description: "colon: here, and #hash",
    tags: ["x", "y"],
    status: "To be validated",
  };
  const parsed = parseFrontmatter(`${serializeFrontmatter(data)}\nbody`);
  assert.equal(parsed.format, "yaml");
  assert.deepEqual(parsed.data, data);
});

test("returns format 'none' when there is no frontmatter", () => {
  const r = parseFrontmatter("# Just a heading\n\ntext");
  assert.equal(r.format, "none");
  assert.equal(r.body, "# Just a heading\n\ntext");
});
