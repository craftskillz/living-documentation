---
type: ADR
title: Copie Id Diagramme Mcp Depuis Topbar Editeur
description: Ajout d'un bouton icône dans la topbar de l'éditeur de diagrammes pour copier l'identifiant MCP du diagramme courant dans le presse-papiers.
tags:
  - diagram
  - mcp
  - clipboard
  - topbar
  - btnCopyDiagramId
  - copyCurrentDiagramId
  - currentDiagramId
  - i18n
  - playwright
timestamp: 2026-05-11T20:03:00Z
status: To be validated
sources:
  - path: src/frontend/diagram.html
    hash: 58db9ae80492b15c7c1892238b12adf8d35fc65f0f71c8870cc254c861c931c9
  - path: src/frontend/diagram/main.js
    hash: 18a57f2b180e016969d0eaa3b7650fdb0733cf98d9725b9ee9683c8c2399718a
  - path: src/frontend/i18n/en.json
    hash: 1d5923644e771c6a4b14303ae630b5e99369627998dd09799caef8d357105821
  - path: src/frontend/i18n/fr.json
    hash: 3a740c6ac6daf1c86144876d84fe1effd1b3b8404acd8d4328f12420b7a0f1ad
  - path: tests/e2e/diagram.spec.ts
    hash: 2c41a94dbc107e573ddb2100da25642bcae2f85fc8a83788c1d9a5fde4cd6a6c
---

# Copie de l'id MCP depuis la topbar de l'éditeur de diagrammes

## Contexte

Les outils MCP de diagrammes utilisent l'identifiant du diagramme pour des appels comme `read_diagram` ou `create_diagram` avec `id`. L'éditeur affichait déjà la liste des diagrammes et chargeait l'id courant dans `st.currentDiagramId`, mais l'utilisateur devait récupérer cet id depuis l'URL ou le stockage JSON.

## Décision

`src/frontend/diagram.html` ajoute un bouton icon-only `#btnCopyDiagramId` dans la topbar, juste avant l'outil `Sélectionner (S)` / `Select (S)`.

`src/frontend/diagram/main.js` ajoute :

- `writeClipboardText(text)`, helper local avec fallback `document.execCommand("copy")` ;
- `copyCurrentDiagramId()`, qui copie `st.currentDiagramId` ;
- un feedback temporaire avec icône check, tooltip traduit et toast.

`src/frontend/i18n/en.json` et `src/frontend/i18n/fr.json` ajoutent les clés de tooltip et de toast. `tests/e2e/diagram.spec.ts` vérifie que `/diagram?id=diag-1` copie bien `diag-1` dans le clipboard.

## Conséquences

- L'id de diagramme utilisable par le MCP devient récupérable directement depuis l'éditeur.
- Le bouton reste discret et ne modifie pas l'outil actif du canvas.
- Aucun changement de format de stockage diagramme n'est introduit.
