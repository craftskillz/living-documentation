---
**date:** 2026-06-24
**status:** Completed
**description:** Génération du document Blueprint `SRC` avec un style fonctionnel court.
**tags:** worklog, blueprint, src, serveur, routes, mcp, frontend-svelte, api, metadata
---

# Current task

## Statut courant

Completed

## Tache realisee

Le document Blueprint `000_BLUEPRINT/2026_06_24_20_57_[SRC]_src` a été rempli pour cartographier le dossier `src/` à haut niveau.

Le document suit le style validé pour les Blueprints : texte court, fonctionnel, humainement consultable, sans détail de maintenance interne.

## Contenu produit

`src/` est décrit comme le cœur applicatif de Living Documentation : serveur local, API, MCP, logique partagée et interface Svelte.

La vue d'ensemble reste compacte : `server.ts` démarre l'application, `routes/` expose les fonctionnalités HTTP, `lib/` porte les règles partagées, `mcp/` ouvre les outils pour les agents IA, et `frontend-svelte/` contient l'interface utilisateur.

## Contexte utilise

- Mémoire de style : `memory/blueprint-documentation-style.md`.
- Inventaire Blueprint de `src/` via l'implémentation partagée `listBlueprintBox()`.
- Requête Graphify sur le rôle de `src/`.
- Lecture de `PROJECT-STACK`, `src/server.ts`, `src/frontend-svelte/src/App.svelte` et des listes de fichiers des zones principales.

## Metadata Living Documentation

Fichiers attachés au Blueprint `SRC` :

- `documentation/AI/PROJECT-STACK.md`
- `src/server.ts`
- `src/lib/config.ts`
- `src/mcp/server.ts`
- `src/routes/documents.ts`
- `src/frontend-svelte/src/App.svelte`

Accuracy vérifiée : `1` / `unchanged`.

## Point d'attention

Les métadonnées ont été attachées alors que le working tree contenait déjà des modifications documentaires ; le commit stocké dans les métadonnées est donc marqué `dirty: true`.

Aucun test n'a été lancé pour cette étape, car elle modifie uniquement de la documentation.
