---
**date:** 2026-05-07
**status:** To be validated
**description:** Le MCP attribue des positions deterministes aux noeuds sans coordonnees avant sauvegarde afin d'eviter l'empilement visuel des diagrammes generes.
**tags:** diagram, mcp, create_diagram, deterministic-layout, context, flow, coordinates, vis-network, ports, readability
---

# Layout deterministe des diagrammes MCP

## Contexte

Les diagrammes crees via `create_diagram` pouvaient etre illisibles lorsque les noeuds etaient fournis sans `x`/`y`. Le stockage persistait alors les noeuds sans positions explicites et la vue editor pouvait les afficher empiles, surtout avec des libelles larges et des diagrammes de contexte ou de flux.

Le test utilisateur sur les diagrammes DriveBox a montre qu'une grille explicite par colonnes rend le resultat immediatement lisible et stable. La physique de stabilisation vis.js reste une option de secours, mais elle n'est pas prioritaire pour la documentation car elle peut produire des dispositions moins previsibles.

## Decision

`toolCreateDiagram` applique maintenant un layout deterministe aux noeuds sans coordonnees avant de creer les edges et d'inferer les ports :

- `context` : acteurs a gauche, systemes centraux au centre-gauche, autres composants au centre-droit, systemes externes et datastores a droite.
- `flow` : sequence horizontale gauche vers droite avec espacement fixe.
- autres diagrammes : grille stable.
- `screen-guide` : aucun layout automatique, car les positions pixel-alignees doivent rester sous controle explicite.

Les coordonnees explicites continuent de primer. Un diagramme partiellement positionne ne repositionne que les noeuds sans `x`/`y`.

## Consequences

Les diagrammes generes par le MCP deviennent lisibles et reproductibles meme lorsque l'appelant omet les coordonnees. Les ports d'edges sont inferes apres placement, ce qui donne des attaches plus coherentes. Les descriptions MCP de `create_diagram` indiquent maintenant que l'omission de `x`/`y` declenche un placement deterministe plutot qu'un auto-layout implicite de l'editeur.

Des tests API couvrent le placement automatique des diagrammes `context` et `flow` sans coordonnees.