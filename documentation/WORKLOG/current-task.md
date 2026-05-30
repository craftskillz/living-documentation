---
**date:** 2026-05-30
**status:** Increment completed
**description:** Point de reprise partagé entre assistants IA pour suivre la tâche courante, son statut, les fichiers touchés, les vérifications et la prochaine action.
**tags:** worklog, handoff, progression, reprise, agents-ia, html-in-canvas, workspace, typescript, configuration-graph, route-workspace
---

# Current task

Ce document est le point de reprise entre assistants IA. Tout agent doit le lire avant de continuer une tâche et le mettre à jour avant de rendre la main.

## Statut courant

Increment completed

## Tâche courante

Prototype workspace d'une interface de configuration graphe avec HTML-in-Canvas, organisé en graphe hiérarchique Living AI Documentation -> LLM providers/MCP -> agents, désormais migré en TypeScript sous `src/frontend/workspace/` et accessible depuis Living Documentation via `/workspace` et la topbar.

## Dernière action réalisée

- Le prototype a été copié/promu vers `src/frontend/workspace/`.
- La logique principale est maintenant portée par `app.ts`, avec types explicites pour les entités, configs, points, bounds et contextes canvas expérimentaux.
- `src/frontend/workspace/tsconfig.json` compile localement le workspace vers `app.js` / `app.js.map` pour rester compatible avec le frontend statique actuel.
- `npm run build` compile le workspace TypeScript avant la copie des assets vers `dist/src/frontend/`.
- Le serveur Express expose `/workspace` vers `src/frontend/workspace/index.html`.
- La topbar principale ajoute `Workspace` juste après le champ de recherche, avec clé i18n `nav.workspace` en anglais et français.
- L'ADR `2026_05_29_21_56_[FRONTEND_EXPERIMENT]_prototype_isole_html_in_canvas_pour_configuration_graphe.md` a été mise à jour via MCP pour refléter la promotion en workspace TypeScript.

## Fichiers ou zones concernés

- `src/frontend/workspace/index.html`
- `src/frontend/workspace/app.ts`
- `src/frontend/workspace/app.js`
- `src/frontend/workspace/app.js.map`
- `src/frontend/workspace/styles.css`
- `src/frontend/workspace/tsconfig.json`
- `src/frontend/workspace/README.md`
- `src/server.ts`
- `src/frontend/index.html`
- `src/frontend/i18n/en.json`
- `src/frontend/i18n/fr.json`
- `package.json`
- `documentation/ADRS/2026_05_29_21_56_[FRONTEND_EXPERIMENT]_prototype_isole_html_in_canvas_pour_configuration_graphe.md`
- `documentation/WORKLOG/current-task.md`
- `documentation/.metadata.json`

## Vérifications réalisées

- `npx tsc -p src/frontend/workspace/tsconfig.json` : OK.
- `npm run check:frontend` : OK, 65 fichiers JavaScript vérifiés.
- `npm run build` : OK.
- Vérification HTTP sur `http://localhost:4321/workspace/` : 200 OK sur le serveur courant.
- Vérification dist : `dist/src/frontend/workspace/index.html` et `dist/src/frontend/workspace/app.js` présents après build.

## Prochaine action recommandée

Tester manuellement `/workspace` après redémarrage du serveur Living Documentation pour vérifier le routage direct, puis continuer les itérations fonctionnelles dans `src/frontend/workspace/app.ts` plutôt que dans l'ancien dossier `experiments/html-in-canvas-configuration/`.

## Notes

Le dossier `experiments/html-in-canvas-configuration/` reste un historique d'expérimentation. Le point d'entrée applicatif courant est maintenant `/workspace`.
