---
**date:** 2026-07-09
**status:** To be validated
**description:** Freezes the canonical YAML frontmatter model for a living-doc concept and the deterministic (no-AI) `type` derivation, ratifying the open decisions left by the Ticket 01 audit — the contract every OKF writer/migration must honor.
**tags:** okf, convention, concept-model, type-derivation, yaml-frontmatter, tags, timestamp, sources, ticket-03
---

# OKF concept model & `type` derivation (convention)

Ticket 03. Ratifies §7 of the
[T01 audit](?doc=AI%252F2026_07_08_19_22_%255BOKF%255D_okf_v01_conformance_audit_and_frozen_field_mapping_ticket_01),
under the
[OKF decision ADR](?doc=ADRS%252F2026_07_08_18_19_%255BOKF%255D_align_livingdocumentation_natively_with_google_open_knowledge_format_okf).
This is the frozen contract the writer (T04) and migration (T05) implement.

## Canonical frontmatter (YAML)

Emitted key order (for readable diffs):

```yaml
type: ADR                     # required (OKF) — derived, see below
title: Align … with OKF       # always emitted explicitly
description: One dense sentence.
tags:                         # YAML list (never a comma string)
  - okf
  - convention
timestamp: 2026-07-09T10:32:00Z   # ISO 8601, UTC
status: To be validated       # custom (lifecycle)
language: en                  # custom, optional
resource: https://…           # OKF, optional (live-asset concepts only)
sources:                      # custom block, optional (drift) — schema in T11
  - path: src/lib/frontmatter.ts
    hash: <sha256>
    commit: <sha>
    dirty: false
```

`status`, `language`, `sources` are non-OKF keys; OKF v0.1 requires consumers to
preserve unknown keys, so the bundle stays conformant.

## Frozen decisions

1. **`type` vocabulary (closed set + default).** Computed **deterministically, no
   LLM**, from the document genre/location at write time, and stored explicitly:

   | Genre / location | `type` |
   |---|---|
   | `documentation/ADRS/**` | `ADR` |
   | diagram document | `Diagram` |
   | `documentation/WORKLOG/**` (per-ticket, ROADMAP, current-task) | `Worklog` |
   | `documentation/AI/rules/**` | `Rule` |
   | `documentation/AI/**` (non-rule), MCP-run results | `Technical Doc` |
   | data/knowledge concept (OKF-style, with `resource`) | `Concept` |
   | anything else | `Document` |

   Source of truth = the writer's derivation function (T04); the stored value is
   what OKF consumers read.

2. **`tags`** = YAML list of strings. Migration splits the legacy comma string.

3. **`title`** = always emitted (never rely on the filename alone), so the concept
   is self-describing to OKF consumers even if renamed.

4. **`timestamp`** = full ISO 8601 datetime in **UTC** (e.g. `2026-07-09T10:32:00Z`),
   not date-only — preserves intra-day ordering. Derived from the filename
   `YYYY_MM_DD_HH_mm` prefix; the filename convention itself is unchanged.

5. **`sources`** custom block = a YAML list of `{ path, hash, commit, dirty }`
   entries (mirrors the current metadata store). Detailed schema + `resource`
   handling are finalized in **T11**; the list-of-objects shape is frozen here.

6. **Reserved files** `index.md` / `log.md` are **not** concepts — they carry no
   `type` and are excluded from the concept set (generated in T08/T09).

## Consequences
- The writer (T04) and the deterministic migration (T05) implement this exact
  model; the validator (T12) enforces `type ∈ vocabulary` and YAML-parseable
  frontmatter.
- Adding a new `type` later is an additive change to the derivation table.
- `title` now duplicates the filename slug on disk — accepted for OKF
  self-description and rename-resilience.
