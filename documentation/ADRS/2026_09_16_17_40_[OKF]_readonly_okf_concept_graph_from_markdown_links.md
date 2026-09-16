---
type: ADR
title: Read-only OKF concept graph from Markdown links
description: The graph endpoint derives concept nodes and directed relationships from Markdown body links and renders them in a Svelte vis-network view.
tags:
  - okf
  - concept-graph
  - buildConceptGraph
  - marked
  - vis-network
  - svelte
  - ticket-14
status: To be validated
sources:
  - path: src/lib/okf/graph.ts
    hash: 7203f769b05ea5f6995fec7118362d463c96d8f29001745612d970f273269366
    commit: 2cf910c2b2defc2118b11f323c1e0d67ab0ad009
    dirty: false
  - path: src/routes/graph.ts
    hash: 54678083a80a891eef0fb4f216d4ece4e8398faa51f24188ff1dfa0f3fdc878c
    commit: 2cf910c2b2defc2118b11f323c1e0d67ab0ad009
    dirty: false
  - path: src/frontend-svelte/src/routes/ConceptGraph.svelte
    hash: 230dfff49da887daf592fb6a43695308eb7960aa13028ab834f82c57aa381709
    commit: 2cf910c2b2defc2118b11f323c1e0d67ab0ad009
    dirty: false
---

# OKF concept graph

## Decision

`buildConceptGraph` scans Markdown concepts under the documentation bundle, excluding symbolic links, reserved index/log files and ignored build folders. Nodes carry the encoded document id, frontmatter title/type (with filename/type fallbacks) and folder.

The body is tokenized with `marked`; only link tokens create directed edges. Images, code examples, frontmatter, external links, missing targets, self-links and duplicate edges are excluded. Reference links are supported. Targets resolve from bundle-relative `.md` links or canonical double-encoded `?doc=` links.

`GET /api/graph` recomputes this read-only projection on demand. `/graph` renders it with the existing vis-network CDN dependency, a type legend, counts and loading/error/empty states. Clicking a node opens the Home document viewer. No graph data is persisted and no new package is introduced.

## Rationale and limits

This exposes the actual documentation links rather than inferred semantic relationships. The graph is separate from the editable diagram feature and supersedes no existing ADR. There is no cache or pagination; large bundles may need future optimization. Absolute links within imported sub-bundles remain a separate follow-up shared with the viewer resolver.

## Verification

24 Node unit tests passed, including exclusion of code/image/frontmatter/external references. Nine targeted Playwright API tests passed across graph and workspace. TypeScript/Vite build passed. Previous visual layout approval is recorded in the T14 worklog; this closure does not claim a new browser visual review.
