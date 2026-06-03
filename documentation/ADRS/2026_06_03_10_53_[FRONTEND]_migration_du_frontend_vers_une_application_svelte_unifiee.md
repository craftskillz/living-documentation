---
**date:** 2026-06-03
**status:** To be validated
**description:** Remplacement du frontend multi-pages vanilla (HTML + ~50 scripts globaux) par une seule application Vite + Svelte 5 (runes) regroupant les 9 ecrans, servie en statique par Express.
**tags:** svelte5, vite, runes, spa, migration, frontend-architecture, i18n, vis-network, strangler-fig, express-static
---

## Contexte

Le frontend historique etait un ensemble de pages HTML independantes (`index.html`, `admin.html`, `diagram.html`, `shape-editor.html`, `context.html`, plus `blueprint/` et `workspace/`) cablees par ~50 scripts classiques communiquant via des globals `window.*`, plus une page Blueprint deja en Vite/Svelte et une page Workspace en TS compile. L'i18n passait par `window.t` / `applyI18n` sur des attributs `data-i18n`. Cette heterogeneite rendait l'evolution couteuse et le partage de composants impossible.

## Decision

Migrer l'integralite du frontend vers **une seule application Vite + Svelte 5** sous `src/frontend-svelte/`, avec routing par `pathname` dans `App.svelte`. Les 9 ecrans sont des routes Svelte : Home, Workspace, Admin, Blueprint, Agents, Files, AI Context, Diagram, Shape-editor.

Principes retenus :

- **Strangler-fig** : l'ancien code a cohabite avec le nouveau pendant toute la migration (reference/comparaison) avant suppression finale de `src/frontend/`.
- **i18n unifie en runes** : un store `i18n.svelte.ts` (`$state` + `loadI18n` + `t`) remplace `window.t`/`applyI18n` ; tous les `data-i18n` deviennent `{t(...)}`. Les JSON `en/fr` sont servis depuis `public/i18n/`.
- **Reutilisation des moteurs imperatifs** : Workspace (canvas HTML-in-canvas) et surtout Diagram (30 modules ES deja modulaires + `vis-network`) sont reutilises tels quels ; seul leur bootstrap est refactore en `init*()` appele dans `onMount`, et le markup est reproduit en Svelte en conservant les `id` (l'engine cable par `getElementById`). Diagram importe son `main.js` dynamiquement dans `onMount` car ses modules touchent le DOM au chargement.
- **Topbar partagee** et dark-mode (home) ; CSS globale scopee quand necessaire (`[data-blueprint]`, `.ld-shape-editor`) car toute CSS importee par un composant est bundlee globalement par Vite.

## Consequences

- **Build simplifie** : `tsc` (backend) + `vite build` (frontend) + `copy-assets` (starter-docs uniquement). Suppression des etapes `tsc` workspace, `vite build` blueprint et de la copie de `src/frontend`. `tsconfig` exclut `src/frontend-svelte` (compile par Vite).
- **Express decouple du frontend** : sert `dist/frontend-svelte` en statique + les routes SPA explicites (pas de catch-all) ; il ne reste que API + MCP + `/images` + `/files`.
- **Dev** : `scripts/dev.js` lance Vite (port 5174) + nodemon backend ; le watch tsc workspace est supprime.
- Suppression de `src/frontend/` et du script `check:frontend` (lint des `.js` vanilla, devenu sans objet).
- Les ADR de features frontend existantes restent valides (les comportements sont reimplementes a l'identique) ; seul l'ADR du controle syntaxique frontend est supersede.
