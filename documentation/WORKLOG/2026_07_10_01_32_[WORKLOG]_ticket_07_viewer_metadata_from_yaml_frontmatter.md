---
type: Worklog
title: Ticket 07 - Viewer metadata from YAML frontmatter
description: Réalisation du Ticket 07 — le détail document expose tags/type du frontmatter et le DocViewer affiche des chips de tags ; le strip et les pills gèrent déjà le YAML.
tags:
  - worklog
  - ticket-07
  - okf
  - viewer
  - tags
  - metadata
  - frontmatter
timestamp: 2026-07-09T01:32:00Z
status: To Be Validated
---

# Ticket 07 — Rendu viewer depuis YAML

## Contexte
Afficher les métadonnées du frontmatter YAML dans le viewer. Voir `documentation/WORKLOG/ROADMAP.md`.

## Déjà acquis (T02 + existant)
- `stripFrontmatter` (server) est **format-agnostique** (`---…---`) → aucune fuite de frontmatter YAML dans le HTML rendu. Le client rend `doc.html` (HTML serveur), pas le contenu brut → rien à stripper côté client.
- Pills de statut : `getFrontmatterField` (dual, T02). Jauge de fiabilité : clé = doc id, inchangée.
- Donc **l'ADR strip-frontmatter reste exact** (il strippe le bloc `---` quel que soit le format) — pas de révision / supersede nécessaire.

## Réalisation
- `src/routes/documents.ts` — `GET /api/documents/:id` (les deux branches, normale + extra file) expose désormais `tags: string[]` et `type` lus via `parseFrontmatter`.
- `src/frontend-svelte/src/lib/home/types.ts` — `DocDetail` : `tags?`, `type?`.
- `src/frontend-svelte/src/lib/home/DocViewer.svelte` — petit panneau de **chips de tags** (`#tag`) sous le titre (rendu seulement si tags présents).

## Vérifications
- `npm run build` OK (serveur + Svelte), `npm run test:unit` **10/10**.

## Suites / vigilance
- `documents.ts` est lié à l'ADR **normalize-on-write (T04)** ; ce changement (chemin lecture) fait **dériver** cette liaison. L'ADR T04 reste correct → **rebaseliner** (`refresh_metadata`) après le commit du code T07.

## Documents liés
- [ADR normalize-on-write (T04)](?doc=ADRS%252F2026_07_09_20_37_%255BOKF%255D_normalizeonwrite_every_document_write_emits_canonical_okf_yaml_frontmatter)
- Backlog : `documentation/WORKLOG/ROADMAP.md`
