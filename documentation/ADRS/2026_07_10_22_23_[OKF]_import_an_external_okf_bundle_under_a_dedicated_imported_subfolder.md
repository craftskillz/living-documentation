---
type: ADR
title: Import an external OKF bundle under a dedicated IMPORTED subfolder
description: An external OKF bundle is imported deterministically under IMPORTED/<bundle>/, preserving each concept's folder structure and original OKF type, running frontmatter through the shared normalizer, skipping reserved files and refusing a non-empty target; the conformance validator treats an unrecognized type as a warning so exotic external vocabularies still validate.
tags:
  - okf
  - import
  - external-bundle
  - cli
  - ticket-13
  - type-vocabulary
timestamp: 2026-07-10T22:23:00Z
status: To be validated
sources:
  - path: src/lib/okf/import.ts
    hash: 31fbe400ec876f612ae3f2b1da04415cd487c95dd48ffae08ffbee3f4aee62b2
    commit: 472836da445bf94fce254002dcd60dfaeda1c43a
    dirty: false
---

# Import an external OKF bundle

Ticket 13 (CLI core). Product decisions (user): CLI core first (UI is a
follow-up), a dedicated destination subfolder, and preserve the original type.

## Decision
`src/lib/okf/import.ts` `importOkfBundle(sourcePath, docsPath, {name?})` is a
deterministic, source-read-only import. Every concept `.md` is copied under
`IMPORTED/<bundle>/`, **preserving its folder structure** so bundle-relative
links keep resolving, and its frontmatter is run through the shared
`normalizeFrontmatter` — so an imported concept is byte-identical to a locally
authored one, and its **original OKF `type` is preserved** (the normalizer only
derives a type when absent). Reserved files (`index.md`, `log.md`) are not
imported; the bundle's listings are regenerated afterwards. A non-empty target
is refused (no destructive idempotency). Exposed as the CLI
`import <source> [folder] --name <n>`.

Because external bundles may carry a `type` outside our derived vocabulary, the
T12 validator now treats an **unrecognized (but present, non-empty) `type` as a
warning**, not an error — the OKF `type` vocabulary is extensible. An empty
`type` remains an error.

## Rationale
A dedicated subfolder isolates imported content, avoids collisions with local
concepts, and is trivial to remove. Preserving structure and type keeps the
import faithful to the source. Reusing `normalizeFrontmatter` means imported
docs immediately satisfy the write-path invariants and the conformance checks.

## Consequences
- Imported concepts appear under `IMPORTED/<bundle>/` and validate (exotic types
  surface as warnings).
- Absolute bundle links (`/x.md`) inside an imported bundle currently resolve
  from the `documentation/` root, not the imported bundle's root — a follow-up
  for the import UI / link resolver. Relative links (`./`, `../`) are fine.
- No Admin/Files UI yet (destination choice, preview, conflicts) — deferred.
