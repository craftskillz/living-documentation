---
type: Worklog
title: Ticket 12 - OKF conformance validator and CI hook
description: Réalisation du Ticket 12 — validateur déterministe de conformité OKF (bundle) avec sévérité error/warning, commande CLI `validate`, script npm/just, et hook CI (e2e push/PR).
tags:
  - worklog
  - ticket-12
  - okf
  - validator
  - conformance
  - ci
  - cli
timestamp: 2026-07-10T21:39:00Z
status: To Be Validated
---

# Ticket 12 — Validateur de conformité OKF + hook CI

## Réalisation
- **`src/lib/okf/validate.ts`** : `validateOkfBundle(docsPath)` (read-only, sans IA). Règles par concept : frontmatter **YAML** (pas legacy/none), `type` non vide **et** dans le vocabulaire fermé (ADR/Worklog/Rule/Technical Doc/Document/Concept), `title` non vide, `timestamp` **ISO 8601** si présent, bloc `sources` bien formé (liste de `{path, hash}`). Règles bundle : `index.md` racine avec `okf_version`, `log.md` présent. Ignore symlinks/réservés/`.git|node_modules|dist`.
- **Sévérité** : `error` vs `warning`. `ok = aucune erreur`. `timestamp` **absent = warning** (les concepts non datés — règles, PROJECT-*, contexts — sont légitimes) ; `timestamp` **malformé = error**.
- **CLI** : sous-commande `validate [folder]` (défaut `documentation`) → rapport `✗`/`⚠`, exit 1 sur toute erreur.
- **Exposition** : script npm `okf:validate` (ts-node, sans build), recette just `okf-validate`.
- **Hook CI** : étape « OKF bundle conformance » dans `e2e.yml` (push/PR sur main, après build) → CI rouge si régression de conformité.

## Vérifications
- `npm run build` OK ; `npm run test:unit` **19/19** (5 nouveaux : bundle conforme, timestamp absent=warning, legacy/type/title=error, type inconnu/timestamp non-ISO/sources malformé, réservés manquants).
- `npm run okf:validate` sur le dépôt réel → **exit 0**, 0 erreur, warnings `timestamp` uniquement (docs non datées). Bundle **OKF-conforme**.
- `npm run lint:ci` exit 0 ; les 3 nouveaux fichiers sans warning Biome.

## Observation / suite possible
- Les fixtures `TEST/`/`ZZTEST_KANBAN/` ont une **date dans le nom** mais pas de champ `date` → pas de `timestamp` dérivé (donc warning). Amélioration future (T04) : dériver `timestamp` du nom de fichier même sans champ `date`. Hors périmètre T12.

## Vigilance / suites
- `bin/cli.ts` lié à l'ADR **T06** → **rebaseliner** après commit. ADR d'implémentation **T12** → bindings `src/lib/okf/validate.ts` + `bin/cli.ts`.
- **T13** (prochain) : import d'un bundle OKF externe.

## Documents liés
- [ADR sources block (T11)](?doc=ADRS%252F2026_07_10_08_23_%255BOKF%255D_mirror_drift_bindings_into_an_okfpreserved_frontmatter_sources_block)
- Backlog : `documentation/WORKLOG/ROADMAP.md`
