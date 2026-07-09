---
type: Worklog
title: Ticket 05 - Deterministic bulk migration to OKF YAML
description: Réalisation du Ticket 05 — migration déterministe (sans IA) des documents existants vers le YAML canonique OKF, réutilisant normalizeFrontmatter, avec écriture du flag OKF.
tags:
  - worklog
  - ticket-05
  - okf
  - migration
  - deterministic
  - yaml
  - flag
timestamp: 2026-07-09T20:42:00Z
status: To Be Validated
---

# Ticket 05 — Moulinette de migration déterministe

## Contexte
Convertir les documents existants (`documentation/**/*.md`) du frontmatter `**gras**`
vers le YAML canonique OKF, par un algorithme **déterministe (aucune IA)**, en
réutilisant le transform du writer (T04). Voir `documentation/WORKLOG/ROADMAP.md`.

## Réalisation
- Script `scripts/migrate-frontmatter-to-okf.ts` :
  - parcourt récursivement les `.md` (ignore `.git`/`node_modules`/`dist` et les noms réservés `index.md`/`log.md`) ;
  - applique **`normalizeFrontmatter(content, relPath, { title })`** (le MÊME transform que l'écriture T04), `title` dérivé du nom de fichier via `parseFilename` ;
  - `--dry-run`, rapport (scanned / changed / unchanged / errors, liste des changés) ;
  - en fin de passe réussie, écrit le flag **`okfMigration: { version: "0.1", migratedAt }`** dans `.living-doc.json` (lu par la garde CLI T06).
- **Exécution** sur `documentation/` : **254 scannés, 252 convertis, 2 déjà YAML, 0 erreur**.

## Choix retenus
- **Un seul transform** partagé écriture (T04) / migration (T05) → un doc migré est byte-identique à un doc re-sauvé.
- Déterministe, sans LLM, idempotent (re-run = no-op).
- Noms réservés exclus dès maintenant (préparation T08/T09).

## Vérifications
- **Idempotence** : re-`--dry-run` → **0 changement, 254 unchanged**.
- **Accuracy inchangée** : `get_accuracy` de l'ADR T04 = **1/1** (la migration ne touche que `documentation/`, pas les bindings `src/`).
- Flag OKF présent dans `.living-doc.json`.
- Le MCP lit les docs migrés (YAML) sans régression (dual reader T02).

## Suites éventuelles
- Code `scripts/migrate-frontmatter-to-okf.ts` **non commité** (à committer ; pas d'ADR dédié — le contrat du transform est déjà couvert par l'ADR « normalize-on-write » T04). Groupable avec le commit T06.
- **T06** : garde CLI au démarrage qui lit le flag `okfMigration` + champ config + validation.

## Documents liés
- [ADR normalize-on-write (T04)](?doc=ADRS%252F2026_07_09_20_37_%255BOKF%255D_normalizeonwrite_every_document_write_emits_canonical_okf_yaml_frontmatter)
- [ADR de convention (T03)](?doc=ADRS%252F2026_07_09_19_36_%255BOKF%255D_okf_concept_model_and_deterministic_type_derivation_convention)
- Backlog : `documentation/WORKLOG/ROADMAP.md`
