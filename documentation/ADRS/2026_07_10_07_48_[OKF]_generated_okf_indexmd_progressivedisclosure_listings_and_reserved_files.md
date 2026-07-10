---
type: ADR
title: Generated OKF index.md progressive-disclosure listings and reserved files
description: The bundle carries generated reserved index.md files — one per non-empty directory listing its concepts and sub-directories, the root also declaring okf_version — produced deterministically by the migration; index.md/log.md are reserved names excluded from the document list and from migration.
tags:
  - okf
  - index-md
  - reserved-files
  - progressive-disclosure
  - okf_version
  - index-generator
  - deterministic
  - ticket-09
timestamp: 2026-07-10T07:48:00Z
status: To be validated
---

# Generated OKF `index.md` listings & reserved files

Ticket 09. Realizes the reserved-files part of the
[T01 audit](?doc=AI%252F2026_07_08_19_22_%255BOKF%255D_okf_v01_conformance_audit_and_frozen_field_mapping_ticket_01).

## Decision

### Reserved OKF filenames
`index.md` and `log.md` are **reserved** (`RESERVED_OKF_FILES` / `isReservedOkfFile`
in `src/lib/okf.ts`). They are **not concepts**: excluded from both document
scanners (`collectMdFiles` HTTP, `listAllDocuments` MCP) so they never appear in
the sidebar, and never migrated.

### Generated `index.md` progressive-disclosure listings
`src/lib/okf/index-generator.ts` `generateOkfIndexFiles(docsPath)` writes one
`index.md` per **non-empty** directory:
- a `## Concepts` section — `* [Title](./file.md) - description`, title and
  description read from each concept's frontmatter (title falls back to the
  filename);
- a `## Directories` section — `* [Sub](./sub/index.md)`;
- the **root** `index.md` additionally declares `okf_version: "0.1"`
  (`OKF_SPEC_VERSION`) in YAML frontmatter.

It ignores `.git`/`node_modules`/`dist`/`files`/`images` and symlinks, and is
deterministic + idempotent. It is invoked by `migrateDocsFolder`, so migration,
the `migrate` command and project init all (re)generate the listings.

## Rationale
- Links use the raw on-disk filename (`./…_[CAT]_….md`) — valid CommonMark and
  resolvable by the viewer's bundle-relative link resolver (T08).
- Regenerating from the migration keeps the listings in lock-step with the
  concepts without a separate refresh step.

## Consequences
- 31 `index.md` files are generated for this project's `documentation/` bundle.
- A running server started before this change may still list the `index.md`
  files until restarted with the new build.
- `log.md` (the changelog) is generated separately from Git history (T10).
