---
**date:** 2026-05-30
**status:** Increment completed
**description:** Point de reprise partagé entre assistants IA pour suivre la tâche courante, son statut, les fichiers touchés, les vérifications et la prochaine action.
**tags:** worklog, handoff, progression, reprise, agents-ia, html-in-canvas, experiment, configuration-graph, pan-zoom, panel-translation, cluster-relaxation
---

# Current task

Ce document est le point de reprise entre assistants IA. Tout agent doit le lire avant de continuer une tâche et le mettre à jour avant de rendre la main.

## Statut courant

Increment completed

## Tâche courante

Prototype expérimental isolé d'une interface de configuration graphe avec HTML-in-Canvas, organisé en graphe hiérarchique Living AI Documentation -> LLM providers/MCP -> agents, avec panneau contextuel tiers d'écran, layout compact anti-chevauchement, zoom régional, pan global, relaxation des clusters racine et translation horizontale du panneau sans reset de zoom.

## Dernière action réalisée

- La selection ne passe plus par `resetView(true, false)`.
- `syncCameraForPanelChange()` applique seulement une translation horizontale quand le panneau passe de fermé à ouvert ou d'ouvert à fermé.
- Changer de noeud pendant que le panneau est déjà ouvert ne modifie plus la camera : seul le contenu du panneau change.
- Le zoom utilisateur est conservé ; `Fit` reste la seule action qui recalcule le zoom via `resetView(true, true)` / `zoomToFitBounds()`.
- `panelShiftX` mémorise la largeur réservée au panneau pour annuler correctement la translation à la fermeture.
- `index.html` référence les assets avec `?v=panel-translate-1` pour éviter les caches navigateur pendant l'itération.
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
- Vérification HTTP sur `http://localhost:8080/experiments/html-in-canvas-configuration/?v=panel-translate-1` : 200 OK.
- Vérification navigateur sur `http://localhost:8080/experiments/html-in-canvas-configuration/?v=panel-translate-1` : OK en fallback DOM.
- Vérification navigateur : le preset initial charge avec le panneau masqué et les assets `panel-translate-1`.
- Vérification navigateur : clic `+` ouvre le panneau, second clic `+` change la sélection avec le panneau déjà ouvert.
- MCP Living Documentation disponible : ADR mise à jour, metadata à rafraîchir après cette note.

## Prochaine action recommandée

Tester manuellement le scénario exact : zoomer sur une zone, ouvrir le panneau, cliquer plusieurs noeuds, vérifier que le zoom reste inchangé et que seul le contenu du panneau se met à jour. Tester ensuite le chemin natif HTML-in-Canvas dans Chrome Canary ou Brave avec le flag `canvas-draw-element` activé.

## Notes

Le serveur statique `python3 -m http.server 8080` peut rester utile pour essayer la page localement. Le prototype n'est pas intégré au build npm ni copié dans `dist/`.
