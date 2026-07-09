---
type: Worklog
title: Ticket 09 - Generate OKF index.md files and reserved-name exclusion
description: Réalisation du Ticket 09 — génération des index.md OKF (progressive disclosure) par dossier + okf_version racine, et exclusion des noms réservés index.md/log.md du listing serveur.
tags:
  - worklog
  - ticket-09
  - okf
  - index-md
  - reserved-files
  - okf_version
  - progressive-disclosure
timestamp: 2026-07-09T01:53:00Z
status: To Be Validated
---

# Ticket 09 — Génération des `index.md` + réservés

## Réalisation
- **`src/lib/okf.ts`** : `RESERVED_OKF_FILES` (`index.md`, `log.md`), `isReservedOkfFile`, `OKF_SPEC_VERSION`.
- **`src/lib/okf/index-generator.ts`** : `generateOkfIndexFiles(docsPath)` — un `index.md` par dossier non vide : section **Concepts** (`* [Titre](./fichier.md) - description`, titre/description depuis le frontmatter), section **Directories** (sous-dossiers → `./sub/index.md`) ; le **racine** porte `okf_version: "0.1"` en frontmatter. Ignore `.git`/`node_modules`/`dist`/`files`/`images` et les symlinks. Déterministe/idempotent.
- **Wiring** : appelé par `migrateDocsFolder` (donc migration, commande `migrate`, init).
- **Exclusion des réservés** dans les deux scanners de docs : `src/routes/documents.ts` (`collectMdFiles`) et `src/mcp/tools/documents.ts` (`listAllDocuments`) → `index.md`/`log.md` n'apparaissent pas comme documents.

## Vérifications
- `node dist/bin/cli.js migrate documentation` → **31 `index.md`** générés ; frontmatter idempotent (256 scannés, 0 changé).
- Racine `documentation/index.md` = `okf_version: "0.1"` + Concepts/Directories.
- `ADRS/index.md` liste les ADR avec leurs descriptions.
- `npm run build` OK, `npm run test:unit` **10/10**.

## Vigilance / suites
- `okf.ts`, `documents.ts`, `mcp/tools/documents.ts` sont liés à l'ADR **normalize-on-write (T04)** ; ces changements font dériver la liaison → **rebaseliner** l'ADR T04 après commit.
- **ADR d'implémentation T09** (génération index.md + convention réservés) après commit → binding `src/lib/okf/index-generator.ts`.
- Serveur en cours d'exécution possiblement obsolète : les `index.md` peuvent apparaître dans la sidebar tant qu'il n'est pas redémarré (le nouveau build les exclut).

## Documents liés
- [ADR normalize-on-write (T04)](?doc=ADRS%252F2026_07_09_20_37_%255BOKF%255D_normalizeonwrite_every_document_write_emits_canonical_okf_yaml_frontmatter)
- Backlog : `documentation/WORKLOG/ROADMAP.md`
