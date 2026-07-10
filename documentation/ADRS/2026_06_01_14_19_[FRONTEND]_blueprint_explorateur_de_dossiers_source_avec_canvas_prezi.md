---
type: ADR
title: Blueprint Explorateur De Dossiers Source Avec Canvas Prezi
description: Page Blueprint , canvas pan/zoom TypeScript servant l'exploration Prezi des dossiers du sourceRoot via GET /api/blueprint, sans affichage des fichiers.
tags:
  - blueprint
  - frontend
  - canvas
  - pan-zoom
  - prezi-zoom
  - folder-explorer
  - sourceroot
  - typescript
  - blueprint-router
timestamp: 2026-06-01T14:19:00Z
status: To be validated
sources:
  - path: src/frontend/blueprint/app.ts
    hash: d14b2737c14072c9d040e300d835cbe514f84887744f083221b9839feaeed24f
  - path: src/frontend/blueprint/index.html
    hash: a10943bbd348d2e21b83b6283204b4fcb30625331aa47bf6603ca47111d988dc
  - path: src/routes/blueprint.ts
    hash: 153c59df7bcaf3c43ec4256ecf6b9fba117f175854eb5cccd440efa7406bc840
---

# Blueprint , Explorateur de dossiers source avec canvas Prezi

## Contexte

Living Documentation dispose d'un `sourceRoot` configurable dans l'admin. Il n'existait aucune visualisation graphique de la structure du projet source. La page Workspace couvre la configuration des agents LLM, mais pas l'exploration du code source.

L'objectif est de proposer une vue spatiale et navigable de l'arborescence du projet, complémentaire au workspace agentique.

## Décision

Créer une page dédiée `/blueprint` avec un canvas TypeScript pan/zoom permettant d'explorer les dossiers du sourceRoot de façon interactive, en style Prezi (zoom plongeant au clic).

## Architecture

### Backend , `src/routes/blueprint.ts`

`GET /api/blueprint?path=<chemin relatif>` :

- Lit `sourceRoot` depuis `readConfig(docsPath)`
- Liste les dossiers à la profondeur demandée (défaut : racine)
- Filtre les dossiers système : `node_modules`, `.git`, `dist`, `build`, `out`, `coverage`, `.next`, `__pycache__`, etc.
- Pour chaque dossier, indique `hasChildren: boolean`
- Sécurité : chemin ne peut pas sortir du `sourceRoot`

### Frontend , `src/frontend/blueprint/`

Page autonome TypeScript compilée vers `app.js` :

- **Canvas 2D** pan/zoom (molette, drag)
- **Boxes arrondies** : une par dossier, avec icône dossier, nom tronqué, indicateur "has sub-folders" + flèche
- **Clic** sur une box avec enfants → zoom Prezi (animation easeInOut 420ms) puis chargement et fit des sous-dossiers
- **Breadcrumb** cliquable pour remonter dans l'arborescence
- **Bouton ⌖** pour recentrer la vue
- **Grille de fond** animée avec le zoom
- Topbar dark cohérente avec le workspace

### Intégration serveur

- `app.get('/blueprint', sendFile)` dans `src/server.ts`
- Chemins absolus (`/blueprint/styles.css`, `/blueprint/app.js`) pour éviter les problèmes de résolution relative sans trailing slash
- Build : `tsc -p src/frontend/blueprint/tsconfig.json` intégré dans `npm run build`
- Lien "Blueprint" ajouté dans la topbar principale (`src/frontend/index.html`)

## Conséquences

### PROS

- Visualisation immédiate de la structure source sans quitter l'application
- Navigation intuitive Prezi, compatible tous navigateurs
- Lecture seule : aucun risque de modification du code source
- Architecture identique au workspace (TypeScript, canvas 2D, pan/zoom)

### CONS

- Dossiers uniquement , fichiers non affichés
- Dossiers ignorés hardcodés, non configurables depuis l'admin
- Pas d'état persisté entre sessions

## Vérification

- `npm run build` : OK, blueprint TypeScript compilé.
- `GET /api/blueprint` : retourne les dossiers du sourceRoot.
- `GET /blueprint` : page chargée correctement avec assets absolus.
- Fix `[hidden] { display: none !important }` appliqué dans blueprint/styles.css.
