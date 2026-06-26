---
`🗄️ ADR : 2026_04_03_12_05_[DIAGRAM]_vis_network_z_order_patch.md`
**date:** 2026-04-03
**status:** Accepted
**description:** Monkey-patch de `_drawNodes` de vis-network pour effectuer un seul passage en ordre canonique, préservant l'ordre z défini par l'utilisateur contre le réordonnancement au survol/sélection.
**tags:** diagram, vis-network, z-order, rendering, monkey-patch, canvas, _drawNodes, canonicalOrder
---

## Contexte

L'éditeur de diagrammes (`src/frontend/diagram.html`) utilise vis-network 9.1.9 pour afficher les nœuds sur un canvas. La méthode `CanvasRenderer._drawNodes` de vis.js effectue **trois passes de rendu** à chaque image :

1. Nœuds normaux (dans l'ordre de `nodeIndices`)
2. Nœuds sélectionnés (toujours au-dessus)
3. Nœuds survolés (toujours au-dessus des nœuds sélectionnés)

Cela signifie que survoler ou sélectionner un nœud le ramène toujours visuellement au premier plan, quel que soit l'ordre z défini par l'utilisateur. La fonctionnalité « premier plan / arrière-plan » devenait ainsi effectivement non fonctionnelle dès que l'utilisateur interagissait avec un nœud.

Une première tentative a intercepté `network.body.nodeIndices` via `Object.defineProperty` pour empêcher vis.js de les réordonner. Cela n'a pas fonctionné car vis.js ne réorganise jamais `nodeIndices` — il effectue simplement des passes séparées en plus de la passe principale.

## Décision

Remplacer `network.renderer._drawNodes` par une version corrigée (monkey-patch au niveau de l'instance, appliqué immédiatement après `new vis.Network(...)`) qui effectue une **passe de rendu unique** dans `_canonicalOrder`, un tableau maintenu par l'application qui contient l'ordre z défini par l'utilisateur.

La fonction corrigée reproduit la logique de culling de viewport de l'original (`isBoundingBoxOverlappingWith`) et la collecte des callbacks `drawExternalLabel`, mais supprime le réordonnancement sélection/survol. `this` à l'intérieur du patch fait correctement référence au renderer car vis.js l'appelle comme une méthode (`this._drawNodes(ctx, hidden)`).

`_canonicalOrder` est maintenu synchronisé avec le `DataSet` de vis.js via les écouteurs `nodes.on('add', ...)` et `nodes.on('remove', ...)`, de sorte que les changements structurels (ajout de nœud, suppression, collage) sont reflétés automatiquement.

## Conséquences

### AVANTAGES

- Le survol et la sélection ne changent plus l'ordre visuel d'empilement — l'ordre z défini par l'utilisateur est toujours respecté.
- `changeZOrder(+1/-1)` (premier plan / arrière-plan) fonctionne désormais correctement et visuellement.
- `saveDiagram` utilise `_canonicalOrder` pour persister les nœuds dans l'ordre z afin que le rechargement restaure le même empilement.
- Le patch est réappliqué à chaque appel de `initNetwork` (destruction + recréation du réseau), ce qui lui permet de survivre aux réinitialisations du réseau.

### INCONVÉNIENTS

- Le patch est fragile en cas de mise à niveau de vis-network : la signature interne de `_drawNodes` doit être revérifiée par rapport au code source de la nouvelle version avant toute mise à niveau.
- Le monkey-patching au niveau de l'instance n'est pas une abstraction propre — il repose sur des détails d'implémentation internes de vis-network.