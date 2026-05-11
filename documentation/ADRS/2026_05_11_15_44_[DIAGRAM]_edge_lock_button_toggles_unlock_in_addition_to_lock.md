---
**date:** 2026-05-05
**status:** To be validated
**description:** Le bouton cadenas du edge panel devient un toggle bidirectionnel qui déverrouille aussi bien qu'il verrouille, avec icône 🔓/🔒 reflétant en direct l'état de la sélection, et une logique de lock unifiée entre arêtes régulières et flèches libres anchor→anchor.
**tags:** diagram, lock, unlock, edge-panel, node-panel, btnEdgeLock, btnNodeLock, toggleEdgeLock, free-arrow, anchor, edgeLocked, selectedLockState
---

# Toggle déverrouillage global sur les boutons cadenas

## Contexte

L'ADR [Node locking](?doc=adrs%252F2026_04_13_%255BDIAGRAM%255D_node_locking) a introduit les boutons cadenas dans les node/edge panels. Cette première version avait deux limitations :

- Côté **arêtes**, `toggleEdgeLock()` était **unidirectionnel** : appuyer sur le bouton verrouillait, mais ne déverrouillait jamais. Le commentaire le formalisait : *« Locking is a one-way UI action — once locked, the only way back is the long-press on the shape itself (see unlock-hold.js). »* En pratique, l'unlock-hold ne fonctionne que sur les nœuds — sur une arête verrouillée régulière, la seule porte de sortie était la suppression.
- Le bouton affichait toujours `🔒` (avec ou sans halo orange selon l'état), ce qui ne communiquait pas clairement l'action qu'il allait déclencher.
- La logique de détection « toutes lockées » était dupliquée entre node-panel.js et edge-panel.js, avec des subtilités différentes pour les flèches libres (`anchor→anchor`).

## Décision

### 1. Toggle bidirectionnel

`toggleEdgeLock()` lit `selectedEdgeLockState() → { allLocked }` puis applique l'**inverse** à toutes les arêtes sélectionnées via un helper `setEdgeLocked(edge, locked)`. Même pattern côté nœuds : `toggleNodeLock` s'appuie sur `selectedLockState()` qui agrège nœuds + arêtes pour décider du sens du toggle. La sélection est conservée quand on déverrouille (utile pour continuer à interagir), et masquée seulement quand on verrouille (alignant le comportement avec le node panel).

### 2. Icône qui reflète l'action

`syncEdgeLockButton()` / `syncNodeLockButton()` mettent à jour le `textContent` et le `title` du bouton en temps réel :

- `🔓` + tooltip « Unlock » quand `allLocked === true` (le clic va déverrouiller).
- `🔒` + tooltip « Lock » sinon.

La classe `tool-active` reste activée tant que la sélection est entièrement verrouillée, pour conserver le halo orange en signal visuel.

### 3. Helper `setEdgeLocked(edge, locked)` unifié

La logique « free arrow → verrouiller les deux anchors / arête régulière → flipper `edgeLocked` » est extraite dans un helper appelé deux fois (depuis `node-panel.js` et `edge-panel.js`). Avant ce changement, chacun rouait sa propre version du if/else.

### 4. Lecture live de l'état via `isEdgeLocked(edge)`

Un edge est considéré verrouillé si :

- c'est une free arrow (`anchor→anchor`) et **les deux anchors** sont `locked`, **ou**
- c'est une arête régulière et `edgeLocked === true`, **ou** (côté node-panel uniquement, pour la décision de toggle global) ses deux nœuds source/cible sont eux-mêmes verrouillés.

Ce dernier cas permet à un utilisateur de sélectionner « tout » et de déverrouiller en bloc même si certaines arêtes héritent du verrouillage de leurs nœuds.

## Conséquences

### PROS

- L'unlock-hold (geste long-press) reste disponible mais n'est plus la **seule** voie de retour pour les arêtes. Cohérent avec ce qu'attend un utilisateur d'un bouton toggle.
- L'icône `🔓`/`🔒` rend l'action prévisible avant le clic.
- Le code de lock/unlock est désormais centralisé via deux helpers (`setEdgeLocked`, `selectedLockState`) au lieu d'être dupliqué entre panels.

### CONS

- La sémantique « toutes lockées → déverrouiller » crée un mode mixte : si l'utilisateur sélectionne 5 nœuds dont 4 sont verrouillés, le bouton montre `🔒` (verrouiller tout). Acceptable : le bouton décrit *l'action*, pas l'état global.
- L'unlock-hold sur un nœud reste fonctionnel : il existe maintenant deux chemins pour déverrouiller un nœud (bouton + long-press). C'est intentionnel, le long-press sert au cas où on n'a pas le panneau ouvert.
- L'ADR précédente (`2026_04_13_node_locking.md`) reste **valide** : ce changement l'étend, ne la supersede pas. Lecteur futur : lire les deux ensemble.
