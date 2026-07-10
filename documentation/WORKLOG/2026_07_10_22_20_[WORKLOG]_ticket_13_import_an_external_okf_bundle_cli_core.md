---
type: Worklog
title: Ticket 13 - Import an external OKF bundle (CLI core)
description: Réalisation du Ticket 13 (core CLI) — import déterministe d'un bundle OKF externe sous IMPORTED/<bundle>/, structure et type d'origine préservés, listings régénérés ; raffinement du validateur (type non reconnu = warning).
tags:
  - worklog
  - ticket-13
  - okf
  - import
  - cli
  - external-bundle
timestamp: 2026-07-10T22:20:00Z
status: To Be Validated
---

# Ticket 13 — Import d'un bundle OKF externe (core CLI)

Décisions produit (utilisateur) : **core CLI d'abord** (UI en suivi), **sous-dossier dédié** `IMPORTED/<bundle>/`, **type OKF préservé**.

## Réalisation
- **`src/lib/okf/import.ts`** : `importOkfBundle(sourcePath, docsPath, {name?})` (déterministe, read-only sur la source). Copie chaque concept `.md` sous `IMPORTED/<bundle>/` en **préservant l'arborescence** (les liens relatifs continuent de résoudre) ; passe le frontmatter par `normalizeFrontmatter` (⇒ concept importé byte-identique à un concept local ; **type d'origine préservé**, y compris exotique). Fichiers réservés `index.md`/`log.md` **non importés**. Refuse une cible non vide (pas d'idempotence destructive). Régénère les `index.md` du bundle après import.
- **CLI** : sous-commande `import <source> [folder] --name <n>` → rapport (imported / skipped reserved / errors), exit 1 sur erreur.
- **Raffinement validateur (T12)** : un `type` **non reconnu** devient un **warning** (le vocabulaire OKF `type` est extensible ; notre propre bundle n'utilise que des types dérivés, donc jamais de warning). `type` vide reste une erreur. Sans ça, un bundle externe à types exotiques échouerait à la validation.

## Vérifications
- `npm run build` OK ; `npm run test:unit` **21/21** (2 nouveaux import : round-trip import→validate OK avec type `Tutorial` préservé + structure `guides/` ; refus cible non vide ; + test T12 mis à jour type=warning).
- Smoke CLI end-to-end (dossiers temp) : `import ext-bundle target --name ga4` → imported 2, skipped 2, structure préservée, `index.md` régénérés pour le sous-arbre `IMPORTED`.
- `npm run okf:validate` dépôt réel → **0 erreur** (toujours conforme). `lint:ci` exit 0.

## Limites connues (pour l'UI / suite)
- Liens **absolus bundle** (`/x.md`) d'un bundle importé résolvent depuis la racine `documentation/`, pas depuis `IMPORTED/<bundle>/` (le résolveur T08). Les liens relatifs (`./`, `../`) sont OK. À traiter au niveau UI/résolveur si besoin.
- Pas encore d'UI Admin/Files (ticket de suivi) : choix du dossier, aperçu, conflits.

## Vigilance / suites
- `bin/cli.ts` lié à l'ADR **T06** → rebaseliner. `src/lib/okf/validate.ts` lié à l'ADR **T12** → rebaseliner (+ corriger la phrase « unknown type = error » de l'ADR T12). ADR d'implémentation **T13** → binding `src/lib/okf/import.ts`.
- **T14** (bonus) : visualiseur graphe de concepts. **T15** : docs/instructions/starters en YAML.

## Documents liés
- [ADR validateur (T12)](?doc=ADRS%252F2026_07_10_21_42_%255BOKF%255D_deterministic_okf_conformance_validator_with_error_and_warning_severities)
- Backlog : `documentation/WORKLOG/ROADMAP.md`
