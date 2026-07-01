---
**date:** 2026-07-01
**status:** To be validated
**description:** Adds a `build_context(task, options?)` MCP tool that aggregates working-tree git status/diff, full content of changed files, and docs/ADRs already bound to those files via the metadata system into a single JSON response, in one call instead of many.
**tags:** mcp, build_context, context-engineering, git-diff, git-status, metadata-binding, tool-aggregation, sourceRoot, gitRoot
---

# Build Context MCP Tool Aggregates Git, Source, And Documentation

## Context

A caller LLM that wants to understand "what changed and what does it mean" previously had to
chain several small MCP calls by hand: `git status` (not exposed), `list_source_files` /
`read_source_file` per file, `search_source`, `list_metadata` / `get_accuracy` per document. Each
round trip costs a tool call and forces the LLM to reconstruct the relationships itself (which docs
describe which changed file, whether a doc has drifted).

The server already tracks everything needed to answer this in one shot: `sourceRoot` resolution
(`src/lib/metadata.ts`), git primitives (`src/lib/git.ts`), and the doc ↔ source-file metadata
bindings (`.metadata.json`, `src/lib/metadata.ts`) that already link a document to the files it
describes.

## Decision

Add `build_context(task, options?)` to the MCP server (`src/mcp/tools/context.ts`,
`toolBuildContext`) as a **factual aggregation tool** — it never ranks or judges, only assembles.

Two new primitives were added to `src/lib/git.ts`, exported for reuse:

- `gitStatusPorcelain(cwd, pathspecs?)` — wraps `git status --porcelain=v1 -z`. Important gotcha
  documented in the code: git always reports paths relative to the **repository root**, never to
  `cwd`, even when `cwd` is a subdirectory (verified empirically — this broke an early version of
  the implementation where `sourceRoot` was a subdirectory of the git repo, as in the
  `with-metadata` test fixture: `sourceRoot = parent/src`, git root = `parent`). Callers must run
  from `gitRoot` and re-express paths relative to `sourceRoot` themselves.
- `gitDiff(cwd, paths, base = 'HEAD')` — wraps `git diff base -- paths`. Same repo-root-relative
  path convention; pathspecs must be resolved against the same `cwd` used for the status call.

Both return `null` (not throw) on failure, matching the existing `currentSourceCommit` convention —
`build_context` degrades to `git: null` for a non-git `sourceRoot` instead of failing the whole call.

### Response shape

```
{
  task, workspace: { sourceRoot, docsFolder, gitRoot },
  git: { branch, headCommit, dirty } | null,
  changes: { base, totalFiles, truncated, files: [{ path, status, untracked, staged, diff, diffTruncated }] },
  source: { skipped: "docs-only change" | null, files: [{ path, content, size, truncated }] },
  documentation: { relatedDocuments: [{ id, title, category, folder, matchedPaths, accuracy }] },
  metadata: { generatedAt, options },
}
```

`documentation.relatedDocuments` is populated by scanning every document's existing metadata
entries (`listAllDocuments` + `getDocEntries`, no new index) for a path that matches one of the
changed files, and reporting that document's `buildReport` accuracy — this reuses the exact same
drift-detection machinery as `get_accuracy` / `review_adr_relevance`.

### Deterministic content-selection rule (v1 scope)

When every changed file is a `.md` file under `docsFolder`, `source.files` is skipped
(`source.skipped: "docs-only change"`) — pulling full source content adds nothing for a docs-only
change. This is the only "intelligent selection" rule implemented; no ranking or judgment.

### Explicitly out of scope for v1

`build_context` does **not** resolve an import/dependency graph, does not find callers of a changed
symbol, and does not discover test files for changed code — this project has no static-analysis
layer to ground those in. The tool description states this explicitly so the caller doesn't assume
those sections exist.

## Consequences

- One MCP call now answers "what changed, what's the diff, what's the full content, what
  docs/ADRs are affected and how accurate are they" instead of N+1 calls.
- The repo-root-vs-sourceRoot path distinction is now documented in `src/lib/git.ts` and must be
  respected by any future caller of `gitStatusPorcelain` / `gitDiff` that runs from a subdirectory.
- Future work (dependency graph, test discovery, issue-tracker/CI sources) can extend the same
  `changes`/`documentation` shape without a breaking change, since the tool already declares what it
  does not cover.
