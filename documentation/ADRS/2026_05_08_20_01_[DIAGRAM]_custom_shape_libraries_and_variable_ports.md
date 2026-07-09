---
type: ADR
title: Custom Shape Libraries And Variable Ports
description: Ajout d'un éditeur de bibliothèques de formes personnalisées image/SVG avec ancres normalisées variables, placement de label configurable, rendu `custom-shape`, stockage `.shape-libraries.json`, et barre flottante de formes dans l'éditeur de diagrammes.
tags:
  - diagram
  - custom-shape
  - shape-editor
  - shape-library
  - ports
  - anchors
  - variable-ports
  - labelPlacement
  - svg
  - image
  - drawPortDots
  - getNearestPort
  - shape-libraries
timestamp: 2026-05-08T20:01:00Z
status: To be validated
---

# Custom Shape Libraries And Variable Ports

## Contexte

L'éditeur de diagrammes ne proposait que les formes natives (`box`, `ellipse`, `database`, `circle`, `actor`, `post-it`, `text-free`, `image`) et les points d'attache des flèches étaient fixés à 8 ports nommés (`N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`). Pour des usages comme des bibliothèques AWS, Miro ou UML, l'utilisateur doit pouvoir définir ses propres formes et placer les ancres exactement sur l'icône ou le symbole.

## Décision

### Bibliothèques persistées

Un nouveau routeur Express `/api/shape-libraries` persiste un store JSON dans `.shape-libraries.json` sous la forme :

```json
{
  "libraries": [
    {
      "id": "aws",
      "name": "AWS",
      "shapes": [
        {
          "id": "lambda",
          "name": "Lambda",
          "imageSrc": "/images/lambda.svg",
          "width": 65,
          "height": 65,
          "labelPlacement": "below",
          "showInDiagram": true,
          "anchors": [{ "id": "N", "x": 0.5, "y": 0 }]
        }
      ]
    }
  ]
}
```

Les coordonnées d'ancres sont normalisées dans `[0,1]`, ce qui permet de conserver la géométrie lors du redimensionnement de la forme.

### Page d'édition

La page `/shape-editor` permet de gérer des bibliothèques, d'importer une image/SVG via l'upload d'images existant, de définir largeur/hauteur, de choisir le placement du texte (`center`, `below`, `above`, `right` ou `left`), et de poser ou déplacer des ancres sur une prévisualisation. Le bouton `Use 8 default anchors` reste disponible pour créer le comportement historique en un clic, mais l'utilisateur peut garder 6, 10 ou tout autre nombre raisonnable d'ancres.

Chaque forme porte aussi `showInDiagram` (par défaut `true`) pour décider si elle apparaît dans la palette flottante du diagramme. Une forme masquée reste disponible pour le rendu des nœuds déjà présents dans les diagrammes ; seule son insertion depuis la palette est désactivée.

### Rendu et utilisation dans les diagrammes

Le diagramme charge les bibliothèques au démarrage via `loadCustomShapeLibraries()` et affiche les formes disponibles dans une barre flottante. Sélectionner une forme active l'outil `addNode` avec un token `custom-shape:<id>`. À la création, le node stocke `shapeType: "custom-shape"` et `customShapeId`.

Le renderer `makeCustomShapeRenderer` dessine l'image/SVG avec les dimensions du node, conserve les états hover/sélection, et reste compatible avec le label, le redimensionnement, la rotation, le z-order et la sauvegarde existants. `labelPlacement: "center"` superpose le texte au centre de l'image ; `below`, `above`, `right` et `left` réservent un espace de label autour de l'image, utile pour les formes de type icône ou acteur.

### Ports variables

`ports.js` ne parcourt plus uniquement `PORT_KEYS`. Pour un `custom-shape`, `getPortKeys()` retourne les ancres définies par la forme. `getPortPosition()` convertit les coordonnées normalisées en coordonnées canvas en tenant compte de la taille, de la rotation du node, et du décalage vertical de l'image quand le label est placé dessous. Les normales de Bézier sont dérivées de la direction centre → ancre pour que les flèches courbes restent cohérentes même avec des ancres non cardinales.

## Conséquences

### PROS

- Les bibliothèques de formes sont extensibles sans ajouter du code par forme.
- Les icônes SVG/PNG sont réutilisées comme des formes natives de diagramme.
- Les flèches continuent d'utiliser `fromPort`/`toPort`, donc la persistance des edges reste compatible.
- Le nombre d'ancres n'est plus imposé par le moteur : 6, 8, 10 ou plus fonctionnent tant que les ids d'ancres restent stables.
- Les formes de type pictogramme peuvent afficher leur label sous l'image sans masquer le visuel.

### CONS

- Les formes personnalisées sont aujourd'hui image/SVG based ; l'éditeur ne fournit pas encore de dessin vectoriel complet de primitives internes.
- Si une forme est supprimée de la bibliothèque, les nodes existants gardent leur `customShapeId` mais ne peuvent plus retrouver leur image tant que la forme n'est pas restaurée.
- Les diagrammes existants doivent recharger la page pour voir les nouvelles bibliothèques créées dans `/shape-editor`.
