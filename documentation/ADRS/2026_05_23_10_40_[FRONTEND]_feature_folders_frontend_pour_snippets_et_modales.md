---
type: ADR
title: Feature Folders Frontend Pour Snippets Et Modales
description: Regroupement des scripts frontend classiques par feature folders `src/frontend/snippets/` et `src/frontend/modals/`, avec chemins de chargement HTML explicites et sans bundler.
tags:
  - frontend
  - feature-folders
  - snippets
  - modals
  - classic-scripts
  - no-bundler
  - index-html
  - context-html
  - script-order
timestamp: 2026-05-23T10:40:00Z
status: To be validated
sources:
  - path: src/frontend/index.html
    hash: 74a96833e006020f3d36cf33aad6066c7228fe4db15477992c455fbbd377e799
  - path: src/frontend/context.html
    hash: 72382f6d7dc3aff332db94c2a806c499095437453a0c0022b79fbb5d90e15221
---

# Feature folders frontend pour snippets et modales

## Contexte

Le frontend reste volontairement sans bundler : les pages HTML chargent des scripts JavaScript classiques et l'ordre des `<script>` est le contrat d'initialisation. Historiquement, la majorite des scripts du viewer etaient a plat sous `src/frontend/`.

Les derniers refactorings ont fait emerger deux sous-domaines stables :

- les snippets : detection, edition inline, builders, parsers, tables, listes et arbres ;
- les modales du viewer : confirmation generique, fichiers metadata, creation de dossier/document et lien diagramme.

Laisser ces fichiers a plat rendait le repertoire moins lisible et masquait les frontieres fonctionnelles.

## Decision

Regrouper les scripts snippets sous `src/frontend/snippets/` :

- `snippets.js`
- `inline-snippet-edit.js`
- `snippet-detect.js`
- `snippet-table.js`
- `snippet-table-attributes.js`
- `snippet-list-markdown.js`
- `snippet-builders.js`
- `snippet-parsers.js`
- `snippet-tree.js`

Regrouper les modales du viewer sous `src/frontend/modals/` :

- `confirm-modal.js`
- `files-modal.js`
- `new-doc-modal.js`
- `new-folder-modal.js`
- `diagram-link-modal.js`

Les pages HTML continuent de charger explicitement chaque script avec le chemin complet (`/snippets/...`, `/modals/...`). Il n'y a pas d'import ES, pas de bundler et pas de changement de scope global : seul le layout des fichiers change.

`src/frontend/diagram/`, `src/frontend/i18n/` et `src/frontend/vendor/` restent les precedents exemples de dossiers specialises. Les autres scripts viewer restent a plat tant qu'un regroupement plus fin n'a pas de frontiere suffisamment claire.

## Consequences

### PROS

- Le domaine snippets devient identifiable en un coup d'oeil et les prochains refactorings peuvent continuer dans `src/frontend/snippets/`.
- Les scripts de modales ne sont plus melanges avec les modules de rendu, recherche, metadata et sidebar.
- L'architecture sans bundler reste intacte ; `scripts/copy-assets.ts` copie deja recursivement `src/frontend/`, donc la distribution npm conserve les nouveaux chemins.
- Le chargement explicite dans les HTML garde visible l'ordre d'execution des scripts classiques.

### CONS

- Les liens de documentation et les bindings metadata doivent suivre les renames de fichiers.
- Les pages HTML doivent etre mises a jour si un script est deplace a nouveau ; il n'y a pas de resolution automatique par bundler.
- Les autres zones du viewer restent partiellement a plat. Les extractions futures doivent rester incrementales pour ne pas transformer un simple rangement en refactor comportemental.
