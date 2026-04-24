---
`🗄️ ADR : 2026_04_13_[DIAGRAM]_node_locking.md`
**date:** 2026-04-13
**status:** Accepted
**description:** Add a per-node and per-edge lock/unlock toggle that prevents all interactions (drag, resize, rotate, label edit, edge creation, deletion) on locked shapes/edges while preserving zoom and selection.
**tags:** diagram, lock, node, edge, interaction, fixed, vis-network, node-panel, edge-panel, selection-overlay, persistence, delete, deletion, free-arrow, anchor
---

## Context

Certaines formes dans un diagramme doivent servir de fond ou de structure fixe (ex. zones, titres, cadres) que l'utilisateur ne veut pas déplacer accidentellement pendant qu'il travaille sur le reste du diagramme. Il n'existait aucun moyen de figer une forme en place.

## Decision

### Bouton cadenas dans le node panel

Un bouton `🔒` (`btnNodeLock`) est ajouté en tête du node panel, en dehors de `#nodePanelControls`. Quand une forme lockée est sélectionnée, `#nodePanelControls` est masqué (via `classList.toggle('hidden', allLocked)`) et le bouton cadenas apparaît en surbrillance orange. Le toggle verrouille ou déverrouille toutes les formes sélectionnées en même temps (logique "si toutes lockées → déverrouiller, sinon → verrouiller tout").

### Blocages d'interaction

| Interaction                   | Mécanisme de blocage                                                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drag                          | `vis-network fixed: { x: true, y: true }` appliqué via `nodes.update()`                                                                                  |
| Resize                        | Guard en tête de `onResizeStart` dans `selection-overlay.js`                                                                                             |
| Rotate                        | Guard en tête de `onRotateStart` dans `selection-overlay.js`                                                                                             |
| Handles visuels               | `display: none` sur tous les handles quand un node locké est sélectionné                                                                                 |
| Label edit (double-clic)      | Check `n.locked` dans `onDoubleClick` avant `startLabelEdit()`                                                                                           |
| Création d'edge depuis        | Guard dans `mousedown` canvas : annule `_addEdgeFromId` si locked                                                                                        |
| Création d'edge vers          | Guard dans `mouseup` canvas + callback `addEdge` vis-network                                                                                             |
| Port dots                     | `mousemove` ignore les nodes lockés (`isLocked` check)                                                                                                   |
| Suppression (Delete / bouton) | `deleteSelected()` filtre les nodes lockés hors de la sélection vis-network avant d'appeler `network.deleteSelected()` ; les edges restent suppressibles |

### Verrouillage des arêtes (edge locking)

Un bouton `🔒` (`btnEdgeLock`) est ajouté en tête du edge panel, en dehors de `#edgePanelControls`. Quand une arête verrouillée est sélectionnée, `#edgePanelControls` est masqué et le bouton cadenas apparaît en surbrillance orange.

Deux types d'arêtes, deux mécanismes de verrouillage :

| Type d'arête                  | Mécanisme de verrouillage                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| Flèche libre (anchor→anchor)  | Verrouillée via les deux nœuds anchor (`locked: true`, `fixed: { x, y }`) — cohérent avec le node locking |
| Arête régulière (forme→forme) | Flag `edgeLocked: true` sur l'arête elle-même dans le DataSet vis-network                                 |

`areAllSelectedEdgesLocked()` détecte le type de chaque arête pour choisir le bon mécanisme de vérification. `toggleEdgeLock()` applique le mécanisme approprié selon le type.

La suppression (`deleteSelected()` dans `main.js`) filtre également les arêtes verrouillées : les arêtes avec `edgeLocked: true` ou les flèches libres dont les anchors sont lockés ne peuvent pas être supprimées.

### Persistance

Le champ `locked: n.locked || false` est sauvegardé dans `nodeData` par `saveDiagram()`. Au chargement, `initNetwork` applique `fixed: { x: true, y: true }` si `n.locked` est vrai.

Le champ `edgeLocked: e.edgeLocked || false` est sauvegardé dans `edgeData` par `saveDiagram()`. Pas de traitement spécial au chargement — c'est un flag de données relu directement depuis le DataSet vis-network.

### Pas d'indicateur visuel sur la forme

Après validation UX, l'indicateur cadenas dessiné sur la forme (badge top-left) a été retiré car il alourdissait visuellement le diagramme. Le verrouillage est uniquement indiqué dans le node panel (bouton orange).

## Consequences

### PROS

- Permet de construire des diagrammes avec une structure fixe (fond, zones, étiquettes) sans risque de déplacement accidentel
- Implémentation non-intrusive : toutes les interactions normales (zoom, sélection, affichage du panel) fonctionnent sur une forme lockée
- Pas de marqueur visuel sur la forme → le diagramme reste propre

### CONS

- L'absence d'indicateur visuel sur la forme peut rendre le lock difficile à détecter au premier coup d'œil si on ne clique pas sur la forme
- `fixed: { x: true, y: true }` est un paramètre vis-network qui doit être réappliqué au rechargement — un oubli dans la sérialisation casserait silencieusement le lock
