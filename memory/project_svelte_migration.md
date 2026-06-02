---
name: project-svelte-migration
description: État de la migration Svelte — architecture, conventions, pages migrées et patterns établis
metadata:
  type: project
---

## Architecture app unifiée Svelte

- **App unifiée** : `src/frontend-svelte/` — Vite + Svelte 5, port 5174 en dev
- **Routing** : `src/frontend-svelte/src/App.svelte` — routing client simple sur `window.location.pathname`
- **Styles** : `src/frontend-svelte/src/styles/app.css` = copie de `workspace/styles.css` (light theme, variables CSS)
- **i18n** : `src/frontend/i18n.svelte.ts` (module partagé, `$state` réactif) — import via `src/frontend-svelte/src/lib/i18n.svelte.ts` (re-export)
- **Topbar partagée** : `src/frontend-svelte/src/lib/Topbar.svelte` — affiche tous les liens sauf la page courante
- **ConfirmDialog** : `src/frontend-svelte/src/lib/ConfirmDialog.svelte` — `show({kicker, title, message, confirmLabel, danger})` retourne `Promise<boolean>`

## Pattern CSS multi-thème (IMPORTANT)

Blueprint = dark theme, les autres = light theme (workspace).

**Problème résolu** : les deux CSS sont dans le même bundle, les vars CSS conflictent.

**Solution** :
- `App.svelte` pose `data-blueprint` sur `<html>` quand `path === "/blueprint"`, le retire sinon
- `blueprint/styles.css` scope ses variables et overrides dark sous `:root[data-blueprint]` et `[data-blueprint] .topbar` etc.
- Les styles layout/interaction blueprint non-dark restent non-scopés
- `workspace/styles.css` PAS importé dans `Workspace.svelte` (déjà dans `app.css`)

## Pages migrées

| URL | Composant | Notes |
|-----|-----------|-------|
| `/admin` | `Admin.svelte` | i18n complet, `FileBrowser`, `DiagramPalettes`, `ConfigSection` |
| `/blueprint` | `Blueprint.svelte` | importe depuis `src/frontend/blueprint/*.svelte`, dark theme scopé |
| `/workspace` | `Workspace.svelte` | `initWorkspace()` exporté depuis `app.ts` refactorisé |
| `/files` | `Files.svelte` | gestion fichiers joints, `ConfirmDialog` |
| `/context` | `AiContext.svelte` | 3 sections: instructions, règles, MCP explorer |
| `/agents` | `Agents.svelte` | grille d'agents, modal input, toast résultat |

## Pages NON migrées

- `/` — page principale (home) : sidebar + éditeur Markdown + search — **LA PLUS COMPLEXE**
- `/diagram` — éditeur de diagrammes
- `/shape-editor` — éditeur de formes

## Proxies Vite (vite.config.ts)

```ts
"/api", "/mcp", "/i18n", "/images", "^/files/.+", "^/$"
```

**Why:** `/` (home non migrée) proxiée vers Express 4321.

## Workspace app.ts refactoring

Toute l'init DOM (lignes 137-541) encapsulée dans `export function initWorkspace(): () => void`.
Variables DOM déclarées `let X!: Type` au module level, assignées dans `initWorkspace()`.
`supportsHtmlInCanvas` déclaré au module level (utilisé dans fonctions hors initWorkspace).

## Composants blueprint (dans src/frontend/blueprint/)

- `BlueprintCanvas.svelte` — canvas dark, importe `../i18n.svelte`
- `FileExplorer.svelte` — panneau fichiers, importe `../i18n.svelte`
- `AdrModal.svelte` — modale ADR, importe `../i18n.svelte` et `../md-renderer.js`

**Why:** kept in `src/frontend/blueprint/` (not moved) — imported by `Blueprint.svelte` route via relative path.

## Ordre menu Topbar

Workspace | Agents | Blueprint | Files | AI Context | Admin | Home
