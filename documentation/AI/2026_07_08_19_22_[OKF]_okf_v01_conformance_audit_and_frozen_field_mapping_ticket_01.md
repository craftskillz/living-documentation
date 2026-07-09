---
type: Technical Doc
title: Okf V01 Conformance Audit And Frozen Field Mapping Ticket 01
description: Ticket 01 deliverable — line-by-line audit of OKF v0.1 conformance for living-documentation, with the frozen field mapping, frontmatter-format decision, reserved-files and link strategy that Tickets 02→15 implement against.
tags:
  - okf
  - conformance-audit
  - field-mapping
  - yaml-frontmatter
  - reserved-files
  - links
  - ticket-01
  - reference
timestamp: 2026-07-08T19:22:00Z
status: To be validated
---

# OKF v0.1 conformance audit & frozen mapping

Reference for the OKF alignment chantier. Decision context:
[ADR — Align living-documentation natively with OKF](?doc=ADRS%252F2026_07_08_18_19_%255BOKF%255D_align_livingdocumentation_natively_with_google_open_knowledge_format_okf).
Backlog: `documentation/WORKLOG/ROADMAP.md`.

Scope of T01 is **decisions only, no code**. This document is the working
reference; the durable convention is ratified separately in Ticket 03.

## 1. OKF v0.1 conformance checklist

| # | OKF requirement | living-doc current state | Gap | Ticket |
|---|---|---|---|---|
| 1 | Bundle = directory tree of `.md` (+ subdirs) | `documentation/` is exactly that (ADRS/, AI/, WORKLOG/…) | none | — |
| 2 | Concept body = free-form Markdown | already the case | none | — |
| 3 | Frontmatter is **parseable YAML** | `---` block but **Markdown-bold keys** (`**date:** …`) — not YAML | **blocking** | T02, T04, T05 |
| 4 | Required `type` (non-empty) | no `type`; kind lives in `[Category]` filename segment | **blocking** | T03, T04, T05 |
| 5 | Recommended `title` | derived from filename, not stored | emit explicitly | T04, T05 |
| 6 | Recommended `description` | `**description**` (bold) | reformat to YAML | T05 |
| 7 | Recommended `tags` (YAML list) | `**tags**` comma string | reformat to YAML list | T05 |
| 8 | Recommended `timestamp` (ISO 8601) | `**date**` (YYYY-MM-DD) + filename date prefix | rename → `timestamp`, ISO | T05 |
| 9 | Recommended `resource` (asset URI) | none | new, optional | T11 |
| 10 | Unknown keys preserved | n/a today | leverage for `status`/`sources`/`language` | T04 |
| 11 | Conventional headings `# Schema` / `# Examples` / `# Citations` | not used | optional adoption (data concepts) | later |
| 12 | Cross-links bundle-relative `/path.md` (or `./x.md`) | `[x](?doc=<doublyEncodedId>)` | rewrite / dual-map | T08 |
| 13 | Reserved `index.md` (listing, no frontmatter) | absent | generate per folder + root | T09 |
| 14 | Reserved `log.md` (dated changelog) | absent (Git history instead) | generate from Git | T10 |
| 15 | `okf_version` in root `index.md` | absent | add on generation | T09 |
| 16 | Conformance: YAML parseable + non-empty `type` + reserved files well-formed | not yet | validator + CI | T12 |

**Verdict:** structure and body already conform; the blocking gaps are the
**frontmatter syntax** (bold → YAML) and the **required `type`**. Everything else
is additive (reserved files, `resource`, links, validator).

## 2. Frozen field mapping

| living-doc (current) | OKF field | Kind | Decision |
|---|---|---|---|
| `[Category]` filename segment + doc genre | `type` | required | Derived value (see §4). **Not** the sidebar category verbatim. |
| filename title slug (title-cased) | `title` | recommended | Emit explicitly in YAML (stop relying on filename only). |
| `**description**` | `description` | recommended | One sentence, verbatim move. |
| `**tags**` (comma) | `tags` | recommended | Split on comma/whitespace → YAML list. |
| `**date**` (`YYYY-MM-DD`) | `timestamp` | recommended | Convert to ISO 8601; the filename date prefix stays as-is. |
| — | `resource` | recommended | New, optional; used only when a concept points to a live asset (data table, API). ADRs usually omit. |
| `**status**` (To be validated / Accepted / SuperSeeded / Partially SuperSeeded) | `status` | **custom key** | Kept (OKF preserves unknown keys). Drives the viewer pills + Validate button. |
| `add_metadata` bindings (path + SHA-256 + commit + dirty) | `sources` | **custom key** (block) | living-doc's drift-detection extension; OKF consumers ignore it. Schema frozen in T11. |
| `**language:**` (`documentLanguage.ts`) | `language` | **custom key** | Kept as-is (not an OKF-standard field). |
| encoded id (`encodeURIComponent(relPath sans .md)`) | — (path/filename) | — | Stays the in-app identifier; **never** a frontmatter field. |
| `[x](?doc=<id>)` | bundle-relative `/path.md` | — | Dual mapping (see §5). |

## 3. Frontmatter format decision

**Target:** standard YAML, lower-case keys, values unquoted unless they contain
YAML-special characters. The block stays delimited by `---` and stripped from the
rendered body (as today).

Before (current, non-YAML):
```
---
**date:** 2026-07-08
**status:** To be validated
**description:** One dense sentence.
**tags:** okf, mapping, yaml
---
```

After (OKF-conformant YAML, superset):
```
---
type: ADR
title: Align living-documentation natively with OKF
description: One dense sentence.
tags:
  - okf
  - mapping
  - yaml
timestamp: 2026-07-08T00:00:00Z
status: To be validated
# sources: living-doc drift-detection extension (see T11)
---
```

## 4. `type` derivation (proposed — ratified in T03)

Deterministic, from the document's genre/location, **not** the sidebar category:

| Genre / location | `type` |
|---|---|
| `documentation/ADRS/**` | `ADR` |
| Diagram document | `Diagram` |
| `documentation/WORKLOG/**` (per-ticket) | `Worklog` |
| `documentation/AI/rules/**` | `Rule` |
| MCP-run result / technical doc | `Technical Doc` |
| default | `Document` |

Rule: `type` is always non-empty and computed without an LLM.

## 5. Link strategy

- **On disk (OKF form):** bundle-relative `/ADRS/<file>.md`. This is what OKF
  consumers read.
- **In app:** the existing `?doc=<id>` form stays for navigation; the viewer must
  resolve **both** an incoming `/path.md` and a `?doc=` link (T08).
- `export.ts` already rewrites `?doc=` → relative `.md` for export — reuse that
  direction as the canonical on-disk emitter.

## 6. Custom-key extensions (OKF-preserved)

`status`, `sources`, `language` are non-OKF keys we rely on. OKF v0.1 mandates
consumers preserve unknown keys, so a living-doc bundle stays conformant while
carrying them. `sources` (drift-detection: path + SHA-256 + commit + dirty) is
living-doc's main value-add over plain OKF and its block schema is frozen in T11.

## 7. Decisions to ratify in Ticket 03 (convention ADR)

1. Final `type` vocabulary (§4) and its derivation source of truth.
2. `tags` on-disk shape: YAML list (decided) — confirm no legacy comma reader gap.
3. `sources` custom block schema (keys, nesting).
4. Whether `title` is always emitted or may be omitted when equal to the filename slug.
5. `timestamp` precision (date-only vs full datetime) and timezone convention.

## 8. Migration & gate reminder (from the ADR)

The bold→YAML conversion is a **deterministic algorithm (no AI)** — see T05 — and
`cli.ts` refuses to open a project until an OKF-migration flag is present in
`.living-doc.json` (T06). This audit fixes the target the migration converts to.
