---
**date:** 2026-06-01
**status:** In progress
**description:** Point de reprise partagé entre assistants IA pour suivre la tâche courante, son statut, les fichiers touchés, les vérifications et la prochaine action.
**tags:** worklog, handoff, progression, reprise, agents-ia, workspace, blueprint, folder-explorer, canvas, pan-zoom, prezi-zoom
---

# Current task

Ce document est le point de reprise entre assistants IA. Tout agent doit le lire avant de continuer une tâche et le mettre à jour avant de rendre la main.

## Statut courant

In progress

## Tâche courante

Deux chantiers parallèles complétés :

1. **Workspace Agentique** — nombreuses itérations sur le panel contextuel (dark mode, champs par kind, rename dossier agent, propagation model/timeout LLM→agents, boucle agentique LLM+MCP).
2. **Blueprint** — nouvelle page `/blueprint` : canvas pan/zoom avec exploration Prezi des dossiers du sourceRoot.

## Dernière action réalisée

- Page Blueprint créée : `src/frontend/blueprint/` (index.html, app.ts, styles.css, tsconfig.json).
- Route `GET /api/blueprint?path=` dans `src/routes/blueprint.ts` : liste les dossiers du sourceRoot en ignorant node_modules, .git, dist, etc.
- Route `/blueprint` enregistrée dans `src/server.ts`.
- Lien "Blueprint" ajouté dans la topbar principale (`src/frontend/index.html`).
- Build mis à jour dans `package.json` pour compiler blueprint TypeScript.
- Fix CSS `[hidden] { display: none !important }` dans blueprint/styles.css.
- Chemins absolus `/blueprint/styles.css` et `/blueprint/app.js` dans index.html.

## Fichiers ou zones concernés

### Blueprint (nouveau)
- `src/frontend/blueprint/index.html`
- `src/frontend/blueprint/app.ts`
- `src/frontend/blueprint/app.js` (compilé)
- `src/frontend/blueprint/styles.css`
- `src/frontend/blueprint/tsconfig.json`
- `src/routes/blueprint.ts`

### Workspace (itérations)
- `src/frontend/workspace/app.ts`
- `src/frontend/workspace/index.html`
- `src/frontend/workspace/styles.css`
- `src/routes/workspace.ts`

### Serveur / topbar
- `src/server.ts`
- `src/frontend/index.html`
- `package.json`

## Vérifications réalisées

- `npx tsc -p src/frontend/blueprint/tsconfig.json` : OK.
- `npx tsc --noEmit` : OK.
- `npm run build` : OK.
- `curl http://localhost:4321/api/blueprint` : retourne les dossiers du sourceRoot.
- Fix `[hidden]` CSS : emptyState correctement masqué quand des dossiers sont présents.

## Prochaine action recommandée

- Créer l'ADR Blueprint dans `documentation/ADRS/` via MCP (quand disponible).
- Mettre à jour l'ADR Workspace avec les dernières itérations (panel dark, agents, rename, topbar).
- Tester le zoom Prezi en naviguant dans les sous-dossiers.
- Envisager d'afficher le nombre de sous-dossiers sur chaque box.

## Notes

- Le MCP Living Documentation était déconnecté lors de cette session — les ADRs et métadonnées devront être créés au prochain redémarrage du serveur.
- Le Blueprint est en lecture seule pour l'instant.
- La page Workspace est maintenant appelée "Agentic Workspace" (nav.workspace i18n).
- La topbar principale (`/`) a été alignée visuellement avec le workspace : hauteur 72px, badge LD, sous-titre dynamique depuis cfg.title.

## Intervention annexe terminée - 2026-06-01

- Remplacement via MCP du document `000_BLUEPRINT/2026_06_01_17_40_[SCRIPTS]_scripts` par une explication haut niveau du dossier `scripts/` : rôle, inventaire, flux build/dev/check/hooks/CI, commandes et règles de modification.
- Métadonnées Living Documentation attachées à `scripts/copy-assets.ts`, `scripts/dev.js`, `scripts/check-frontend-js.js`, `scripts/check-readme-sync.sh`, `scripts/check-workflows.sh`, `.githooks/pre-commit`, `.github/workflows/readme-sync.yml` et `.github/workflows/publish.yml`.
- Vérifications : `read_document` MCP du document mis à jour, `refresh_metadata`, puis `get_accuracy` à `1` avec 8 fichiers inchangés.
