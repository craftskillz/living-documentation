---
**date:** 2026-05-30
**status:** Increment completed
**description:** Point de reprise partagé entre assistants IA pour suivre la tâche courante, son statut, les fichiers touchés, les vérifications et la prochaine action.
**tags:** worklog, handoff, progression, reprise, agents-ia, html-in-canvas, experiment, configuration-graph, pan-zoom
---

# Current task

Ce document est le point de reprise entre assistants IA. Tout agent doit le lire avant de continuer une tâche et le mettre à jour avant de rendre la main.

## Statut courant

Increment completed

## Tâche courante

Prototype expérimental isolé d'une interface de configuration graphe avec HTML-in-Canvas, organisé en graphe hiérarchique Living AI Documentation -> LLM providers/MCP -> agents, avec panneau contextuel tiers d'écran, layout anti-chevauchement, zoom régional et pan global de la scène.

## Dernière action réalisée

- Le layout distribue maintenant les enfants en tenant compte du nombre de noeuds et du rayon estimé des sous-arbres via `subtreeRadius()` et `distanceForChildren()`.
- Les providers LLM avec beaucoup d'agents réservent plus d'espace autour de `Living AI Documentation`, puis éloignent leurs agents avec un rayon dynamique afin d'éviter les chevauchements.
- Les lignes peuvent être plus longues pour préserver la lisibilité au lieu de forcer les noeuds à rester dans le viewport initial.
- La scène canvas utilise une camera monde/ecran avec `cameraX`, `cameraY` et `zoom`.
- La molette zoome autour du pointeur avec `zoomAt()` pour cibler une région précise.
- Le drag sur une zone vide pan la scène complète via `startPan()`/`panTo()`, sans déplacer les noeuds individuellement.
- Le bouton `Fit` recadre le graphe et restaure le zoom par défaut.
- `index.html` référence les assets avec `?v=pan-zoom-layout-1` pour éviter les caches navigateur pendant l'itération.
- L'ADR `2026_05_29_21_56_[FRONTEND_EXPERIMENT]_prototype_isole_html_in_canvas_pour_configuration_graphe.md` a été mise à jour via MCP.

## Fichiers ou zones concernés

- `experiments/html-in-canvas-configuration/index.html`
- `experiments/html-in-canvas-configuration/app.js`
- `experiments/html-in-canvas-configuration/styles.css`
- `experiments/html-in-canvas-configuration/README.md`
- `documentation/ADRS/2026_05_29_21_56_[FRONTEND_EXPERIMENT]_prototype_isole_html_in_canvas_pour_configuration_graphe.md`
- `documentation/WORKLOG/current-task.md`
- `documentation/.metadata.json`

## Vérifications réalisées

- `node --check experiments/html-in-canvas-configuration/app.js` : OK.
- Vérification navigateur sur `http://localhost:8080/experiments/html-in-canvas-configuration/?v=pan-zoom-layout-1` : OK en fallback DOM.
- Vérification navigateur : ajout répété de noeuds via `+` stable, puis `Fit` recadre la scène.
- Vérification code : `subtreeRadius()` et `distanceForChildren()` pilotent l'espacement dynamique ; `zoomAt()` zoome autour du pointeur ; `startPan()`/`panTo()` déplacent la scène entière.
- MCP Living Documentation disponible : ADR mise à jour, metadata à rafraîchir après cette note.

## Prochaine action recommandée

Tester le chemin natif HTML-in-Canvas dans Chrome Canary ou Brave avec le flag `canvas-draw-element` activé. Ensuite, si l'expérience est convaincante, formaliser un schéma de configuration réel limité aux types `system`, `llm`, `agent` et `mcp`, puis décider si ce prototype doit rester hors build ou devenir une page expérimentale servie par le CLI.

## Notes

Le serveur statique `python3 -m http.server 8080` peut rester utile pour essayer la page localement. Le prototype n'est pas intégré au build npm ni copié dans `dist/`.
