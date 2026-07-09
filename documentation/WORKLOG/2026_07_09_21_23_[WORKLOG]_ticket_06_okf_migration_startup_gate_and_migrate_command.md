---
type: Worklog
title: Ticket 06 - OKF migration startup gate and migrate command
description: Réalisation du Ticket 06 — garde de démarrage CLI qui refuse d'ouvrir un projet non migré OKF, commande migrate, champ config okfMigration, et migration automatique du starter à l'init.
tags:
  - worklog
  - ticket-06
  - okf
  - cli-gate
  - migrate-command
  - okfMigration
  - config
timestamp: 2026-07-09T21:23:00Z
status: To Be Validated
---

# Ticket 06 — Garde de migration au démarrage + commande migrate

## Contexte
Empêcher l'ouverture d'un projet non migré OKF, et fournir la commande de migration.
Voir `documentation/WORKLOG/ROADMAP.md`.

## Réalisation
- **Cœur migration réutilisable** — `src/lib/migrate.ts` : `migrateDocsFolder(docsPath, {dryRun})` (extrait du script T05, shippable dans `dist/`), `writeOkfFlag`, `OKF_VERSION`. Le script `scripts/migrate-frontmatter-to-okf.ts` devient un mince wrapper.
- **Config** — `src/lib/config.ts` : champ optionnel `okfMigration?: { version; migratedAt }` (absent = non migré, **pas** dans `STORAGE_DEFAULTS`) + helper `isOkfMigrated(cfg)`. **Non whitelisté** dans `routes/config.ts` → non forgeable via l'API ; préservé par `writeConfig`.
- **Garde CLI** — `bin/cli.ts`, au démarrage d'un projet existant : si `!isOkfMigrated` → **refus d'ouvrir** + message OKF + `Run: npx living-ai-documentation migrate <folder>` ; en TTY, propose « Migrate now? [y/N] » qui lance la migration puis continue.
- **Commande** `migrate [folder] [--dry-run]` (sous-commande commander) → `migrateDocsFolder` + rapport.
- **Init** — après scaffolding du starter (encore `**gras**` jusqu'à T15), `migrateDocsFolder(docsPath)` : un nouveau projet est OKF-conforme et flag posé → passe la garde.

## Vérifications
- `migrate --dry-run` sur `documentation/` (déjà migré) → **0 changement** (idempotent).
- **Garde** testée sur un fixture non migré : le serve **refuse (exit 1)** avec le message + la commande.
- `migrate` sur le fixture → 1 doc converti + `okfMigration` écrit.
- `npm run build` OK, `npm run test:unit` **10/10**.

## À finaliser (dépend d'un commit)
- **ADR d'implémentation T06** (garde = contrat de démarrage + flag) après **commit** → bindings `bin/cli.ts`, `src/lib/migrate.ts`, `src/lib/config.ts`.

## Documents liés
- [WORKLOG T05](?doc=WORKLOG%252F2026_07_09_20_42_%255BWORKLOG%255D_ticket_05_deterministic_bulk_migration_to_okf_yaml)
- [ADR normalize-on-write (T04)](?doc=ADRS%252F2026_07_09_20_37_%255BOKF%255D_normalizeonwrite_every_document_write_emits_canonical_okf_yaml_frontmatter)
- Backlog : `documentation/WORKLOG/ROADMAP.md`
