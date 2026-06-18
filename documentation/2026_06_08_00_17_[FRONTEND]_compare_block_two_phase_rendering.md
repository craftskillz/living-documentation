---
**date:** 2026-06-08
**status:** To be validated
**description:** Render :::compare blocks via a placeholder + post-parse swap instead of injecting rendered HTML before marked.parse(), so inner code blocks containing blank lines no longer break the document.
**tags:** compare, marked, rendering, html-block, commonmark, preprocessCompareBlocks, renderMarkdownWithCompareBlocks, placeholder, documents, export
---

## Context

The `:::compare … :::` directive renders a side-by-side view: a raw-Markdown source column and a rendered-HTML column. The original implementation (`preprocessCompareBlocks`) replaced each `:::compare` block with its fully rendered `<div class="ld-compare">…<pre><code>…</code></pre>…</div>` **inside the Markdown source**, and then ran the outer `marked.parse()` over the whole document.

This is unsafe. Per CommonMark, an HTML block is **terminated by the first blank line**. When the inner code sample contained a blank line (e.g. a blank line between an `interface` and an `async function` in a TypeScript example), `marked` stopped treating the injected `<div>` as raw HTML at that blank line and re-parsed the remainder of the document as Markdown. The result was a cascading corruption: the rendered column was flattened to paragraph text, following headings lost their `<h2>`, and subsequent `:::compare` blocks were emitted as raw HTML.

Observed symptom: a JavaScript compare block (no internal blank line) rendered fine, while a TypeScript block with an internal blank line broke — and destroyed everything after it.

## Decision

Replace `preprocessCompareBlocks` with `renderMarkdownWithCompareBlocks(source, markedOpts)` in `src/lib/compareBlock.ts`, using a two-phase placeholder approach:

1. Each `:::compare` block is rendered separately and stored in an array; in the source it is replaced by a standalone HTML-comment placeholder `<!--LD_COMPARE_BLOCK_N-->` (a single-line HTML block with no blank lines, passed through verbatim by `marked`).
2. The document is parsed with `marked.parse()`.
3. The placeholders are swapped back for the rendered compare `<div>`s **after** parsing (tolerating a `<p>…</p>` wrapper marked may add).

Because the rendered HTML — including any blank lines inside `<pre><code>` — never sits in the source during the outer parse, it can no longer terminate an HTML block or disturb the rest of the document.

All three call sites were migrated from `marked.parse(preprocessCompareBlocks(...))` to `renderMarkdownWithCompareBlocks(...)`: two in `src/routes/documents.ts` and one in `src/routes/export.ts`. The now-unused `marked` imports in those two route files were removed.

## Consequences

### PROS

- `:::compare` blocks with internal blank lines (the common case for real code samples) render correctly.
- The corruption is fully contained: a malformed/edge-case compare block can no longer cascade into the rest of the document.
- Single source of truth: rendering logic lives in one function reused by document API and HTML export.
- Covered by a regression test (`tests/unit/compare-block.spec.ts`), including the blank-line case.

### CONS

- The render path is now two-pass (replace → parse → replace), marginally more work than the single inline pass. Negligible for document-sized inputs.
- The placeholder token `LD_COMPARE_BLOCK_N` is a reserved internal marker; authored content containing that exact comment would be misinterpreted (extremely unlikely, acceptable for a local documentation tool).
