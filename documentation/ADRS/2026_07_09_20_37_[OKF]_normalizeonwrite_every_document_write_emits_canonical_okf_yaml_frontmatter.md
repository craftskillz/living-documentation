---
type: ADR
title: "Normalize-on-write: every document write emits canonical OKF YAML frontmatter"
description: Every document write boundary (HTTP create/update, MCP create/update, agent-run) passes content through a single deterministic transform that emits canonical OKF YAML frontmatter with a derived type, converting legacy bold frontmatter opportunistically and reusing the same function as the bulk migration.
tags:
  - okf
  - normalize-on-write
  - yaml-frontmatter
  - deriveType
  - normalizeFrontmatter
  - documents-route
  - mcp-tools
  - workspace
  - ticket-04
timestamp: 2026-07-09T20:37:00Z
status: To be validated
sources:
  - path: src/lib/okf.ts
    hash: f91233851acd4b071744adff0cda8fbf734642b98cb470c3d604cc2fac14d2c4
    commit: 48ac580b98c3910eec92dc85949c83193b427514
    dirty: false
  - path: src/mcp/tools/documents.ts
    hash: 1bd213b7646d016ad3e58863cc2ae4443031dd2519acdda9e2a4b05951bdd57b
    commit: 48ac580b98c3910eec92dc85949c83193b427514
    dirty: false
  - path: src/routes/documents.ts
    hash: 22bbc2f3b743dc5b1e45aca5c87438bf420a2ed771702735656cef8ad3dee6e3
    commit: 48ac580b98c3910eec92dc85949c83193b427514
    dirty: false
  - path: src/routes/workspace.ts
    hash: 807c34a8892804d4e928ef36bbef73a630783b06191d042a9eaebaca1f6e9afe
    commit: 48ac580b98c3910eec92dc85949c83193b427514
    dirty: false
---

# Normalize-on-write (canonical OKF YAML)

Ticket 04 implementation. Realizes the
[OKF concept-model convention](?doc=ADRS%252F2026_07_09_19_36_%255BOKF%255D_okf_concept_model_and_deterministic_type_derivation_convention)
under the
[OKF decision ADR](?doc=ADRS%252F2026_07_08_18_19_%255BOKF%255D_align_livingdocumentation_natively_with_google_open_knowledge_format_okf).

## Decision

Every place that writes a document to disk routes its content through one
deterministic transform — `normalizeFrontmatter(content, relPath, { title? })`
in `src/lib/okf.ts` — which emits **canonical OKF YAML frontmatter**:

- parses either legacy `**bold**` or YAML (via the T02 dual reader);
- ensures a non-empty `type` via `deriveType(relPath)` (T03 table);
- renames `date` → `timestamp` (ISO 8601 UTC, minute precision from the filename);
- normalizes `tags` to a YAML list; injects a caller-provided `title` when absent;
- preserves unknown keys (`status`, `sources`, `language`); canonical key order;
- **idempotent** and **AI-free**.

Wired at the write boundaries:
- HTTP `src/routes/documents.ts` — `POST /` (create) and `PUT /:id` (normal + extra file);
- MCP `src/mcp/tools/documents.ts` — `toolCreateDocument`, `toolUpdateDocument`;
- Agent runs `src/routes/workspace.ts` — the generated run document.

The client status flip (`docStatus.ts`) already matched both `status:` and
`**status:**`, so it is unchanged; a status flip is saved through `PUT`, which
normalizes. `setDocumentLanguage` still emits `**language:**` but its output is
saved through `PUT` and thus normalized too.

## Rationale
- **One transform for write and migration.** The same `normalizeFrontmatter` is
  the deterministic engine the bulk migration (T05) runs over the ~106 legacy docs.
- **Normalize at the boundary**, not in the agent guide: any doc saved/created
  becomes conformant regardless of what the caller supplied (opportunistic
  migration). Updating the MCP guide text to author YAML natively is a separate
  concern (T15).
- **Deterministic, no LLM** — reproducible and safe across the corpus.

## Consequences
- Editing or creating any document converts its frontmatter to YAML on save.
- `title` is never invented by the transform; callers pass a filename/args title.
- Reserved files (`index.md`, `log.md`, T08/T09) must be excluded from
  normalization when introduced — they carry no frontmatter.
- Verified live: a document created via the MCP now lands as canonical YAML with a
  derived `type`. Unit tests: `tests/unit/okf.test.ts`.
