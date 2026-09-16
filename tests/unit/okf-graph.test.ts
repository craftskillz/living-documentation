import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildConceptGraph } from "../../src/lib/okf/graph";

function makeBundle(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "okf-graph-"));
  fs.mkdirSync(path.join(dir, "ADRS"), { recursive: true });
  fs.writeFileSync(path.join(dir, "index.md"), "# Index\n\nokf_version: 0.1\n");
  fs.writeFileSync(path.join(dir, "log.md"), "# Changelog\n");
  return dir;
}

test("builds nodes per concept and edges from real in-bundle links", () => {
  const dir = makeBundle();
  // a → b via bundle-relative absolute link; a → c via ?doc= link.
  fs.writeFileSync(
    path.join(dir, "ADRS", "a.md"),
    // `?doc=` uses the canonical linkHref (double-encoded): encodeURIComponent("ADRS%2Fc").
    "---\ntype: ADR\ntitle: A\n---\nSee [B](/ADRS/b.md) and [C](?doc=ADRS%252Fc).\nExternal [x](https://y.com) ignored.\n",
  );
  fs.writeFileSync(path.join(dir, "ADRS", "b.md"), "---\ntype: ADR\ntitle: B\n---\nLink to [missing](/ADRS/nope.md)\n");
  fs.writeFileSync(path.join(dir, "ADRS", "c.md"), "---\ntype: Concept\ntitle: C\n---\nbody\n");

  const g = buildConceptGraph(dir);
  assert.equal(g.nodes.length, 3); // index.md / log.md excluded
  const ids = g.nodes.map((n) => decodeURIComponent(n.id)).sort();
  assert.deepEqual(ids, ["ADRS/a", "ADRS/b", "ADRS/c"]);

  const edgePairs = g.edges.map((e) => `${decodeURIComponent(e.from)}->${decodeURIComponent(e.to)}`).sort();
  assert.deepEqual(edgePairs, ["ADRS/a->ADRS/b", "ADRS/a->ADRS/c"]);
  // Edge to a non-existent concept and the external link are both dropped.

  fs.rmSync(dir, { recursive: true, force: true });
});

test("relative links resolve against the source doc's folder; duplicates dedupe", () => {
  const dir = makeBundle();
  fs.mkdirSync(path.join(dir, "ADRS", "sub"), { recursive: true });
  fs.writeFileSync(path.join(dir, "ADRS", "sub", "x.md"), "---\ntype: ADR\ntitle: X\n---\nbody");
  fs.writeFileSync(
    path.join(dir, "ADRS", "y.md"),
    "---\ntype: ADR\ntitle: Y\n---\n[x](./sub/x.md) and again [x2](./sub/x.md)\n",
  );
  const g = buildConceptGraph(dir);
  const edges = g.edges.filter((e) => decodeURIComponent(e.from) === "ADRS/y");
  assert.equal(edges.length, 1); // deduped
  assert.equal(decodeURIComponent(edges[0].to), "ADRS/sub/x");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("only actual body links create edges, including reference links", () => {
  const dir = makeBundle();
  try {
    for (const name of ['b', 'c', 'd', 'e', 'f', 'g']) {
      fs.writeFileSync(path.join(dir, 'ADRS', `${name}.md`), `# ${name}`);
    }
    fs.writeFileSync(path.join(dir, 'ADRS', 'a.md'), [
      '---', 'type: ADR', 'description: "[metadata](./b.md)"', '---',
      '![image](./c.md)', '`[inline](./d.md)`', '```md', '[example](./e.md)', '```',
      '[external](https://example.com/?doc=ADRS%252Ff)',
      '[real][target]', '', '[target]: ./g.md',
    ].join('\n'));
    const graph = buildConceptGraph(dir);
    assert.deepEqual(graph.edges, [{ from: 'ADRS%2Fa', to: 'ADRS%2Fg' }]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
