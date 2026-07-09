---
type: ADR
title: Migration Du Frontend Vers Une Application Svelte Unifiee
description: Remplacement du frontend multi-pages vanilla par une application Vite + Svelte 5 unique, extensible par routes explicites et regroupant actuellement 10 écrans servis par Express.
tags:
  - svelte5
  - vite
  - runes
  - spa
  - migration
  - frontend-architecture
  - App.svelte
  - express-static
  - routing
  - survival-kit
timestamp: 2026-06-03T10:53:00Z
status: To be validated
---

## Contexte

Le frontend historique etait un ensemble de pages HTML independantes (`index.html`, `admin.html`, `diagram.html`, `shape-editor.html`, `context.html`, plus `blueprint/` et `workspace/`) cablees par environ 50 scripts classiques communiquant via des globals `window.*`, plus une page Blueprint deja en Vite/Svelte et une page Workspace en TypeScript compile. L'i18n passait par `window.t` / `applyI18n` sur des attributs `data-i18n`. Cette heterogeneite rendait l'evolution couteuse et le partage de composants impossible.

## Decision

Migrer l'integralite du frontend vers **une seule application Vite + Svelte 5** sous `src/frontend-svelte/`, avec routing par `pathname` dans `App.svelte` et une liste de routes SPA explicites dans Express.

L'application regroupe actuellement 10 ecrans : Home, Workspace, Admin, Blueprint, Agents, Files, AI Context, Diagram, Shape-editor et Survival Kit. L'ajout d'un ecran suit la convention suivante : composant sous `src/frontend-svelte/src/routes/`, branche de routage dans `App.svelte`, puis route SPA explicite dans `src/server.ts`.

Principes retenus :

- **Strangler-fig** : l'ancien code a cohabite avec le nouveau pendant toute la migration avant suppression finale de `src/frontend/`.
- **i18n unifie en runes** : un store `i18n.svelte.ts` (`$state` + `loadI18n` + `t`) remplace `window.t`/`applyI18n` ; les catalogues JSON anglais et francais sont servis depuis `public/i18n/`.
- **Reutilisation des moteurs imperatifs** : Workspace et surtout Diagram conservent leurs moteurs existants ; leur bootstrap est expose via une fonction `init*()` appelee dans `onMount`, avec conservation des identifiants DOM requis.
- **Topbar partagee** et dark-mode commun ; toute CSS importee par un composant etant bundlee globalement par Vite, les selecteurs generiques doivent etre scopes.
- **Extension par feature folder** : les ecrans autonomes peuvent regrouper leur store, types et composants sous `src/frontend-svelte/src/lib/<feature>/`, comme le Survival Kit.

## Consequences

- **Build simplifie** : `tsc` pour le backend, `vite build` pour le frontend, puis copie des starter-docs.
- **Express decouple du frontend** : il sert `dist/frontend-svelte` en statique et uniquement les routes SPA declarees, sans catch-all.
- **Dev** : `scripts/dev.js` lance Vite sur le port 5174 et le backend via nodemon.
- Suppression de `src/frontend/` et du script `check:frontend` devenu sans objet.
- Les nouvelles routes doivent etre declarees des deux cotes (`App.svelte` et `src/server.ts`) pour fonctionner en navigation directe et dans la SPA.
