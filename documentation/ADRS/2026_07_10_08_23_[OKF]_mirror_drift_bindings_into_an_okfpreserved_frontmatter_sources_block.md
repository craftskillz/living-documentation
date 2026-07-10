---
type: ADR
title: Mirror drift bindings into an OKF-preserved frontmatter sources block
description: Living-doc drift bindings (source path + hash + commit + dirty) are mirrored into each document's frontmatter as an OKF-preserved custom `sources` block, and the OKF-standard `resource` field is preserved, so a document carries its bindings through an OKF bundle round-trip while the .metadata.json store stays the operational source of truth.
tags:
  - okf
  - sources
  - resource
  - drift-bindings
  - metadata
  - portability
  - ticket-11
  - frontmatter
timestamp: 2026-07-10T08:23:00Z
status: To be validated
sources:
  - path: src/lib/metadata.ts
    hash: 0498b125bfb38061564a132641c123f1d0ca634664c81f13cd25d465de1f9175
    commit: 957bd510d0984dcd743cffc8b59f3a7b400b5335
    dirty: false
  - path: src/lib/okf.ts
    hash: 938cc3890e306e4f4fbf3688156c092e2c4f0b260c45e771d0fbdacfb23832e5
    commit: 7ab1df75ebf3ad2182882c40fc578ddb6daffef2
    dirty: false
---

# Frontmatter `sources` block + `resource` field

Ticket 11. Builds on
[normalize-on-write (T04)](?doc=ADRS%252F2026_07_09_20_37_%255BOKF%255D_normalizeonwrite_every_document_write_emits_canonical_okf_yaml_frontmatter).

## Decision
Two OKF fields become first-class in the canonical frontmatter:

- **`resource`** (OKF-standard): a URI to the live/canonical asset a concept
  documents. Pinned in `CANONICAL_ORDER` and preserved verbatim.
- **`sources`** (living-doc custom, OKF-preserved): a YAML list of
  `{ path, hash, commit, dirty }` — the exact drift bindings held in the
  `.metadata.json` store. Pinned **last** in the canonical order.

`normalizeFrontmatter` gains an optional `sources` argument:
`undefined` preserves whatever the frontmatter already carries (the write path
must never wipe it), an array replaces the block, `null`/empty drops it.

The mirror is written at the **single store choke-point** `setDocEntries`, which
every binding op funnels through — `add_metadata` / `refresh_metadata` /
`remove_metadata` (MCP) and the three HTTP `/metadata` routes — via
`syncSourcesToFrontmatter`. `backfillSourcesFromStore`, called by
`migrateDocsFolder`, projects all pre-existing bindings so a migrated bundle is
self-describing (77 documents backfilled).

## Rationale
The `.metadata.json` store is invisible to any other OKF consumer and would not
survive a bundle export/import. Mirroring the bindings into the concept's own
frontmatter makes drift information portable, while keeping the store as the
operational source of truth (accuracy is still computed from it).

## Consequences
- Binding ops now also rewrite the target document's frontmatter (idempotent: no
  write when the block is unchanged).
- Writes are guarded: path-traversal check, reserved files skipped, and an
  `lstat` **anti-symlink** guard so bindings never leak through the symlinked
  instruction files (AGENTS.md / CLAUDE.md / MEMORY.md) — cf. T06.
- Extra files (absolute ids, outside the bundle) are never touched.
