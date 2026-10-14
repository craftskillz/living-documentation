---
type: Worklog
title: Ticket 10 - Generate OKF log.md changelog from Git history
description: Réalisation du Ticket 10 — génération du fichier réservé log.md (changelog OKF groupé par date) depuis l'historique Git du dossier docs, décrit par les concepts ajoutés.
tags:
  - worklog
  - ticket-10
  - okf
  - log-md
  - changelog
  - git-history
  - reserved-files
timestamp: 2026-07-10T07:55:00Z
status: To Be Validated
---

# Ticket 10 — Génération du `log.md` depuis Git

## Réalisation
- **`src/lib/okf/log-generator.ts`** : `generateOkfLogFile(docsPath)` — lance `git log --diff-filter=A --name-only` sur le dossier docs, groupe les fichiers **ajoutés** par date (`## AAAA-MM-JJ`, plus récent d'abord), et liste `* **Added**: <titre>`. Fichiers réservés / non-`.md` ignorés. Fallback « No history available » si le dossier n'est pas un repo Git.
- **Wiring** : appelé par `migrateDocsFolder` juste après `generateOkfIndexFiles`.

## Choix retenus
- Les autocommits sont uniformes (« docs: update living documentation »), donc décrire les entrées par les **concepts ajoutés** (via `parseFilename` du nom de fichier) est bien plus utile qu'un dump des messages — tout en restant **ancré sur l'historique Git** (dates + fichiers ajoutés réels).
- Titres depuis le nom de fichier (déterministe, robuste aux renommages/suppressions). Amélioration possible plus tard : lire le `title` du frontmatter pour les fichiers encore présents.

## Vérifications
- `node dist/bin/cli.js migrate documentation` → `documentation/log.md` généré (362 lignes, changelog par date). Migration idempotente (258/0).
- `npm run build` OK, `npm run test:unit` **10/10**.

## Vigilance / suites
- `migrate.ts` est lié à l'ADR **T06** (gate/core) ; le wire du log-generator le fait dériver → **rebaseliner** T06 après commit.
- **ADR d'implémentation T10** après commit → binding `src/lib/okf/log-generator.ts`.

## Documents liés
- [ADR index.md + réservés (T09)](?doc=ADRS%252F2026_07_10_07_48_%255BOKF%255D_generated_okf_indexmd_progressivedisclosure_listings_and_reserved_files)
- Backlog : `documentation/WORKLOG/ROADMAP.md`
