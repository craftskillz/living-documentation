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

1. **Workspace Agentique** , nombreuses itérations sur le panel contextuel (dark mode, champs par kind, rename dossier agent, propagation model/timeout LLM→agents, boucle agentique LLM+MCP).
2. **Blueprint** , nouvelle page `/blueprint` : canvas pan/zoom avec exploration Prezi des dossiers du sourceRoot.

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

- Le MCP Living Documentation était déconnecté lors de cette session , les ADRs et métadonnées devront être créés au prochain redémarrage du serveur.
- Le Blueprint est en lecture seule pour l'instant.
- La page Workspace est maintenant appelée "Agentic Workspace" (nav.workspace i18n).
- La topbar principale (`/`) a été alignée visuellement avec le workspace : hauteur 72px, badge LD, sous-titre dynamique depuis cfg.title.

## Intervention annexe terminée - 2026-06-01

- Remplacement via MCP du document `000_BLUEPRINT/2026_06_01_17_40_[SCRIPTS]_scripts` par une explication haut niveau du dossier `scripts/` : rôle, inventaire, flux build/dev/check/hooks/CI, commandes et règles de modification.
- Métadonnées Living Documentation attachées à `scripts/copy-assets.ts`, `scripts/dev.js`, `scripts/check-frontend-js.js`, `scripts/check-readme-sync.sh`, `scripts/check-workflows.sh`, `.githooks/pre-commit`, `.github/workflows/readme-sync.yml` et `.github/workflows/publish.yml`.
- Vérifications : `read_document` MCP du document mis à jour, `refresh_metadata`, puis `get_accuracy` à `1` avec 8 fichiers inchangés.

## Intervention annexe terminée - 2026-06-03

- Correction du blocage de commit zizmor sur `publish.yml` : `.github/zizmor.yml` ignore maintenant `publish.yml` (nom de base attendu par zizmor) et les commentaires inline `zizmor: ignore[cache-poisoning]` sont séparés des commentaires de version.
- Métadonnées Living Documentation rafraîchies via MCP pour le document CI de durcissement des workflows GitHub Actions ; accuracy = 1.
- Vérifications : `zizmor .github/workflows/publish.yml`, `zizmor .github/workflows/`, `zizmor --config .github/zizmor.yml .github/workflows/`, `./scripts/check-workflows.sh` et `.githooks/pre-commit` : OK.

## Intervention annexe terminée - 2026-06-03 MCP update_document

- Investigation du faux échec `update_document` observé pendant la correction zizmor : l'outil MCP fonctionne, y compris avec un Markdown multiligne contenant backticks, crochets et quotes.
- Ajout d'un test API ciblé dans `tests/api/mcp.spec.ts` qui appelle `update_document`, relit via MCP et vérifie le contenu sur disque.
- Cause des échecs observés : commandes locales de diagnostic dans le sandbox (`node fetch` refusé avec `EPERM`, pipelines vers `curl -d @-` instables), pas un bug du serveur MCP.
- Vérification : `npx playwright test tests/api/mcp.spec.ts -g "update_document overwrites" --project=chromium` : OK.

## Intervention annexe terminée - 2026-06-05 chemins Windows sidebar

- Diagnostic confirmé depuis Windows : `GET /api/browse/alldirs?path=C:\Users\Administrator\Desktop\docs` renvoyait `AI\\rules` et `TEST\\USAGE`, ce qui créait des dossiers plats non cliquables dans la sidebar Svelte.
- Correction serveur : normalisation POSIX des chemins relatifs renvoyés par `src/routes/browse.ts`, des chemins/id/folders de documents dans `src/routes/documents.ts`, et des chemins relatifs de l'explorateur source dans `src/routes/browse-source.ts`.
- Test renforcé : `tests/api/browse.spec.ts` exige maintenant `a/b` et `a/b/c`, et rejette `a\\b` / `a\\b\\c`.
- Vérifications : `npm run build`, `npx playwright test tests/api/browse.spec.ts --project=chromium`, `npx playwright test tests/api/documents.spec.ts tests/api/browse-source.spec.ts --project=chromium` : OK.

## Intervention annexe terminee - 2026-06-06 snippet tableau tableur

- Remplacement de l'editeur tableau global `+/- colonnes` par une grille type tableur dans `src/frontend-svelte/src/lib/home/snippets/table.ts` : nouveau tableau 2x2, navigation `Tab`/fleches, selection du contenu apres `Tab`, creation automatique de ligne/colonne aux bords, et suppression ligne/colonne par menu contextuel au clic droit.
- `src/frontend-svelte/src/lib/home/SnippetsModal.svelte` ne garde plus que le compteur de colonnes dans la toolbar ; les controles de lignes restent disponibles.
- Ajout des libelles i18n `snippet.table_delete_row` et `snippet.table_delete_column` dans `src/frontend-svelte/public/i18n/en.json` et `fr.json`.
- Test E2E mis a jour : `table editor uses spreadsheet keyboard navigation and context menu deletion` dans `tests/e2e/inline-snippet-edit.spec.ts`.
- ADR mis a jour via MCP : `ADRS/2026_06_06_21_47_[SNIPPET]_spreadsheet_style_table_snippet_editor`, avec metadonnees sur `table.ts`, `SnippetsModal.svelte`, les deux catalogues i18n et `inline-snippet-edit.spec.ts`; accuracy = 1.
- Verifications : `npm run build`, test cible Playwright, puis `npx playwright test tests/e2e/inline-snippet-edit.spec.ts --project=chromium` : OK.
- Note : verification visuelle via serveur local tentee ; `npm run dev` a echoue sur `EMFILE` watchers et le serveur build sur port 4322 ne servait pas l'UI attendue dans le navigateur integre. La couverture comportementale E2E est complete pour cette zone.
