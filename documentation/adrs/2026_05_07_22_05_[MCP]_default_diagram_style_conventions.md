---
**date:** 2026-05-07
**status:** To be validated
**description:** Normalisation des diagrammes crees via MCP avec styles par defaut, ports deduits, largeurs de labels estimees et restitution des champs graphiques persistants.
**tags:** mcp, create_diagram, read_diagram, diagram, ports, edgeLabelWidth, arrowDir, gridEnabled, alignGuides, toolCreateDiagram
---

# Conventions de dessin par defaut pour les diagrammes MCP

## Contexte

Les diagrammes generes par `create_diagram` etaient techniquement valides, mais les champs graphiques utilises par l'editeur n'etaient pas normalises cote MCP. Les edges recevaient notamment une largeur de label fixe, ne declaraient pas explicitement leur direction de fleche, et ne beneficiaient pas des ports d'attache ajoutes dans l'editeur.

Ce decalage obligeait a corriger manuellement les diagrammes crees par un assistant avant d'obtenir un rendu exploitable.

## Decision

`toolCreateDiagram` applique maintenant des valeurs par defaut proches du format persiste par l'editeur :

- diagramme : `edgesStraight: false`, `gridEnabled: false`, `alignGuides: true` ;
- noeuds : champs graphiques explicites (`fontSize`, alignements, opacite, rotations, image, groupe, lien, verrouillage) avec valeurs nulles ou neutres ;
- edges : `arrowDir`, `dashes`, `fontSize`, rotations, offsets, couleur, epaisseur, verrouillage et largeur de label.

La largeur de label n'est plus fixee uniformement a `80`. Elle est estimee en fonction de la longueur du libelle : `80`, `95` ou `105`. La police des labels longs passe a `11`, sinon `12`.

Les ports `fromPort` et `toPort` sont deduits des positions relatives des noeuds. Quand les coordonnees ne sont pas disponibles, le MCP utilise un defaut horizontal `E -> W`, coherent avec les diagrammes C4 courants. Les relations bidirectionnelles sont supportees via `arrowDir: "both"` quand l'appelant veut representer un echange logique unique.

`toolReadDiagram` restitue aussi les champs graphiques persistants afin qu'un client MCP puisse relire un diagramme, le modifier et le renvoyer a `create_diagram` sans perdre la mise en forme editeur.

## Consequences

Les diagrammes crees par MCP sont plus proches d'un rendu directement utilisable dans l'editeur, avec des courbes ancrees aux ports et des labels mieux dimensionnes.

Le MCP reste retrocompatible : les champs absents dans les anciens diagrammes ne sont pas requis pour la lecture, et les valeurs explicites fournies a `create_diagram` restent prioritaires sur les heuristiques.

La fusion automatique de deux edges opposees n'est pas tentee : elle demanderait une interpretation semantique des labels. Le format permet en revanche de creer directement une seule edge `arrowDir: "both"` lorsque le client sait que la relation est bidirectionnelle.
