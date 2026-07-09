---
type: ADR
title: Debug Overlay
description: Overlay de débogage DOM pour les nœuds de diagramme affichant les coordonnées du centre et les dimensions de la forme, contrôlé par un indicateur de configuration showDiagramDebug activé depuis le panneau Admin.
tags:
  - diagramme
  - débogage
  - overlay
  - config
  - admin
  - vis-network
  - canvasToDOM
  - showDiagramDebug
timestamp: 2026-04-03T10:15:00Z
status: Accepted
---

## Contexte

Le diagnostic des problèmes d'accrochage à la grille (snap-to-grid) et de rendu dans l'éditeur de diagrammes nécessite de connaître, pour chaque nœud, ses coordonnées exactes du centre sur le canevas ainsi que les dimensions que la logique d'accrochage utilise réellement. Sans ces informations, il est impossible de déterminer si un désalignement visuel provient du calcul d'accrochage, du dessin de la grille ou d'autre chose.

Une superposition basée sur le canevas (`ctx.fillText`) a d'abord été envisagée mais écartée : le texte sur canevas est rendu sous forme de pixels et ne peut pas être sélectionné ni copié par l'utilisateur, ce qui le rend impraticable pour partager des valeurs lors d'une session de débogage.

## Décision

Ajouter une superposition de débogage basée sur le DOM qui est :

- **Contrôlée par un indicateur de configuration** (`showDiagramDebug: boolean` dans `.living-doc.json`, `false` par défaut). Le bouton « Debug » dans la barre supérieure de l'éditeur de diagrammes est masqué sauf si cet indicateur est `true`. Il est activé depuis le panneau Admin (case à cocher « Show debug button in diagram editor »).
- **Rendue sous forme d'éléments DOM** (`div.debug-box`), positionnés de manière absolue par-dessus le canevas en utilisant `network.canvasToDOM({x, y})` pour convertir les coordonnées monde en coordonnées écran. Cela rend le texte sélectionnable et copiable.
- **Mise à jour à chaque événement `afterDrawing`** en recyclant les éléments `div` existants (indexés par identifiant de nœud) afin d'éviter le thrashing de mise en page.
- **Non intrusive** : le conteneur de superposition (`#debugLayer`) a `pointer-events: none` ; les boîtes individuelles ont `pointer-events: auto` uniquement pour la sélection de texte.

Chaque boîte affiche, pour son nœud :

```
id : <nodeId>
cx=<centre x>  cy=<centre y>
w =<shape.width>   h =<shape.height>
L =<cx - w/2>   T =<cy - h/2>
```

`L` et `T` sont les valeurs directement injectées dans le calcul d'accrochage, de sorte que tout écart entre elles et le multiple de grille le plus proche révèle instantanément un bogue d'accrochage. Un réticule a été dessiné au centre visuel, supprimé par la suite au profit de l'approche DOM plus propre.

Le champ `showDiagramDebug` est ajouté à `LivingDocConfig` et mis en liste blanche dans la route `PUT /api/config`.

## Conséquences

### AVANTAGES

- Les informations de débogage sont toujours disponibles pendant le développement sans modifier le code, il suffit d'activer la case à cocher Admin.
- Le texte DOM est sélectionnable et copiable, contrairement au texte rendu sur canevas.
- La superposition se repositionne correctement lors du panoramique et du zoom car elle est reconstruite à chaque appel `afterDrawing` en utilisant les conversions `canvasToDOM` en direct.
- Les utilisateurs qui ne visitent jamais le panneau Admin ne sont pas affectés (bouton masqué, aucun surcoût).

### INCONVÉNIENTS

- `showDiagramDebug` doit rester `false` en production ; il n'y a pas d'application côté serveur de cette règle.
- La reconstruction des éléments DOM à chaque événement `afterDrawing` a un coût de mise en page mineur à des fréquences d'images élevées.