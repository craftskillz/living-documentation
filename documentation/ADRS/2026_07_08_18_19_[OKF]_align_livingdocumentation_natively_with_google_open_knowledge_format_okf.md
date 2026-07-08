---
**date:** 2026-07-08
**status:** Accepted
**description:** Adopt Google Cloud's Open Knowledge Format (OKF) as living-documentation's native on-disk format so the docs folder is itself a conformant OKF bundle (superset), replacing the bespoke `**bold:**` pseudo-frontmatter with real YAML while keeping drift-detection, status lifecycle and the MCP as living-doc's differentiators.
**tags:** okf, open-knowledge-format, yaml-frontmatter, interoperability, knowledge-catalog, native-alignment, migration, drift-detection, mcp, roadmap
---

## Context

Google Cloud published the **Open Knowledge Format (OKF, v0.1 draft — June 2026)**:
a vendor-neutral spec that formalizes the "LLM-wiki" pattern as a **directory of
Markdown files with YAML frontmatter**. A bundle has reserved `index.md`
(progressive-disclosure listing) and `log.md` (dated changelog); each concept is
a `.md` file whose frontmatter must be **parseable YAML** with one required field
`type`, plus recommended `title` / `description` / `resource` / `tags` /
`timestamp`. Links are bundle-relative (`/tables/x.md`), unknown keys must be
preserved. Google ships reference tooling (BigQuery enrichment agent, single-file
HTML graph visualizer, Knowledge Catalog ingestion).

living-documentation independently implements the same idea (a folder of Markdown
"concepts" — ADRs, technical docs — curated by AI agents via an MCP). Aligning on
an emerging Google-backed **standard** rather than a bespoke convention removes
lock-in and unlocks an ecosystem. The npm release is feature-complete and no other
evolution is planned, so this is the right moment for the migration.

### Central incompatibility
living-doc's frontmatter is delimited by `---` but uses **Markdown-bold** keys
(`**date:** …`, `**status:** …`), which is **not parseable YAML**. OKF conformance
requires YAML. This is the main gap; everything else is mapping.

## Decision

**Adopt OKF as the native format — living-documentation becomes a strict
*superset* of a conformant OKF bundle**, rather than only exporting/importing OKF
at the boundary. The `documentation/` folder (and its git repo) must be directly
consumable by any OKF tool with **zero conversion**.

### Field mapping (living-doc → OKF)
| living-doc | OKF | Note |
|---|---|---|
| `[Category]` (filename) + doc kind | `type` (**required**) | e.g. `ADR`, `Diagram`, `Concept`, `Technical Doc` |
| deduced title / `**description**` / `**tags**` | `title` / `description` / `tags` | direct |
| `**date**` + Git history | `timestamp` (ISO 8601) + reserved `log.md` | |
| `**status**` (To be validated / Accepted / SuperSeeded) | *custom key* `status` | OKF preserves unknown keys → lifecycle survives |
| `add_metadata` source bindings (SHA-256 + commit) | *custom block* (e.g. `sources:`) + optional `resource` | drift-detection has no OKF equivalent — kept as a superset extension |
| `[x](?doc=<id>)` links | bundle-relative `/path.md` | dual mapping; `?doc=` stays the in-app form |

### What we keep as living-doc's edge (do not lose)
- **Drift detection** (hash + commit + accuracy) — richer than OKF's `timestamp`;
  candidate to propose upstream as an OKF convention.
- **Status lifecycle + supersede**, the **MCP** (OKF is a *format*, MCP a
  *protocol* — complementary; living-doc becomes a natural OKF producer+consumer).

### What OKF newly unlocks
Interop with Knowledge Catalog and the whole YAML-frontmatter ecosystem; a
`resource` field to attach concepts to live assets (data/APIs); an auto concept
**graph visualizer**; `index.md` progressive disclosure; the producer
enrichment-agent pattern for the Workspace agents.

### Staged, non-breaking migration
Execution is broken into a phased ticket backlog in
`documentation/WORKLOG/ROADMAP.md` — foundations first (dual-format **reader** so
nothing breaks), then YAML **writes** + one-shot migration of existing docs, then
reserved files / links / validator, then consumers (import + visualizer). Each
completed ticket gets a WORKLOG realization doc; durable sub-decisions get their
own ADR.

## Consequences

- The MCP server guide and the ADR/WORKLOG frontmatter templates (currently
  `**bold:**`) must be revised to YAML — the
  [MCP server guide ADR](?doc=ADRS%252F2026_05_11_15_40_%255BMCP%255D_server_guide_and_feature_workflow_for_the_mcp)
  and the
  [strip-frontmatter-from-rendering ADR](?doc=ADRS%252F2026_04_08_10_30_%255BFRONTEND%255D_strip_frontmatter_from_article_rendering)
  will be revisited (candidates for `Partially SuperSeeded`) once the writer lands.
- A dual-format reader is mandatory during migration so the ~106 existing ADRs
  keep working until converted.
- No source files are attached to this ADR yet: it is a forward-looking decision;
  implementation ADRs and metadata bindings come with each ticket.

## Related
- Portable config foundation: [portable living-doc.json](?doc=ADRS%252F2026_04_24_%255BCONFIGURATION%255D_portable_living_doc_json_with_relative_paths).
- Bilingual starter (ships the docs skeleton): [bilingual starter + npx initializer](?doc=ADRS%252F2026_05_11_15_42_%255BSTARTER_DOC%255D_bilingual_starter_doc_and_interactive_npx_initializer).
