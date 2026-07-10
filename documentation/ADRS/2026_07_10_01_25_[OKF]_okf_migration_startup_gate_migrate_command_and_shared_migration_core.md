---
type: ADR
title: OKF migration startup gate, migrate command and shared migration core
description: The CLI refuses to open a project until its docs folder has been migrated to OKF YAML, gated on an okfMigration flag in .living-doc.json; a shared deterministic migrateDocsFolder (which skips symlinks) powers the standalone script, the migrate command, and the auto-migration of freshly scaffolded starters.
tags:
  - okf
  - cli-startup-gate
  - migrate-command
  - okfMigration
  - migrateDocsFolder
  - symlink-exclusion
  - isOkfMigrated
  - ticket-06
timestamp: 2026-07-09T01:25:00Z
status: To be validated
sources:
  - path: bin/cli.ts
    hash: 6e9f18329e412cf9101d1c1d5f9c767c7d77507806c646d1cfc38c1d64e12191
    commit: ce760b859399e7a4a406de86d271fe703995fbf0
    dirty: false
  - path: src/lib/config.ts
    hash: 363d4620f8e48feff650fe6a4dcfac737c27a754f0f608c2854966d448a7e157
    commit: ce760b859399e7a4a406de86d271fe703995fbf0
    dirty: false
  - path: src/lib/migrate.ts
    hash: 4b3d4d1939de64df5d1f5b4e2fa07b918bf9084972d4c45299629fc4e98320d4
    commit: ce760b859399e7a4a406de86d271fe703995fbf0
    dirty: false
---

# OKF migration startup gate & migration core

Ticket 06. Builds on the deterministic transform of
[normalize-on-write (T04)](?doc=ADRS%252F2026_07_09_20_37_%255BOKF%255D_normalizeonwrite_every_document_write_emits_canonical_okf_yaml_frontmatter)
and the bulk migration (T05).

## Decision

### Shared migration core
`src/lib/migrate.ts` exposes `migrateDocsFolder(docsPath, { dryRun })` — the single
deterministic (no-AI) migration used by the standalone script, the CLI `migrate`
command and the init flow. It reuses `normalizeFrontmatter` (title derived from
the filename), reports scanned/changed/unchanged/errors, and on a successful run
stamps `okfMigration: { version, migratedAt }` into `.living-doc.json`
(`writeOkfFlag`, `OKF_VERSION`).

**It never follows symlinks.** Instruction files (`AGENTS.md`, `CLAUDE.md`,
`MEMORY.md`) are symlinked into `documentation/AI/` but live outside the bundle;
following them injected frontmatter into the real files. `collectMd` now skips
`entry.isSymbolicLink()`.

### Startup gate
`bin/cli.ts` reads the config of an existing project and, when
`!isOkfMigrated(cfg)` (`src/lib/config.ts`), **refuses to start the server**: it
prints why (OKF alignment) and the command `npx living-ai-documentation migrate
<folder>`; on a TTY it offers to migrate now and then continues.

### Config flag
`okfMigration?: OkfMigration` is optional and **not** in `STORAGE_DEFAULTS`
(absence = not migrated). It is **not** whitelisted in the PUT `/api/config`
handler, so clients cannot forge it; `writeConfig` preserves it. `isOkfMigrated`
is the single source of truth.

### New projects
The init flow runs `migrateDocsFolder` right after scaffolding the (still-legacy)
starter, so a freshly created project is OKF-conformant and stamped, passing the
gate. Once the starters ship native YAML (T15) this becomes a no-op.

## Consequences
- Existing users hit a one-time hard gate; the message is actionable and the
  migration is a single command (or an inline TTY prompt).
- The `okfMigration` flag — not the frontmatter of individual docs — is the
  authoritative migration signal.
- Symlinked instruction files stay untouched by the migration and the validator
  (T12) must apply the same symlink exclusion.

## Verification
Gate refuses an un-migrated fixture (exit 1); `migrate` converts + stamps the
flag; `--dry-run` on the migrated repo reports 0 changes and touches no
instruction file. Build green, `npm run test:unit` 10/10.
