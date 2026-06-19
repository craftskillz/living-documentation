---
**date:** 2026-06-18
**status:** To be validated
**description:** Le viewer Home ouvre images et SVG Mermaid dans un lightbox partage a fond blanc via Shift+Click ou Command+Click, en serialisant Mermaid en data URL.
**tags:** mermaid, shift-click, command-click, metaKey, lightbox, fullscreen, white-background, svg, data-url, DocViewer
---

# Shift+Click ou Command+Click plein ecran pour Mermaid

## Contexte

Le viewer Home permettait d'ouvrir une image rendue en plein ecran avec Shift+Click. Les blocs fences `mermaid` sont transformes par `wireContent.ts` en conteneurs `.mermaid`, puis Mermaid y injecte un SVG. Ce SVG restait limite a la largeur du document.

Sur macOS, Command+Click est egalement un geste naturel. Option et Control sont reserves a d'autres interactions et ne doivent pas declencher le lightbox. Un fond blanc est retenu pour le mode plein ecran afin de mieux correspondre aux diagrammes et captures a fond clair.

## Decision

Etendre le gestionnaire de clic delegue de `DocViewer.svelte` :

- accepter le geste lorsque `shiftKey` ou `metaKey` est actif ;
- ne pas reagir a Option seul (`altKey`) ni Control seul (`ctrlKey`) ;
- sur une image, conserver le comportement existant ;
- sur un element situe dans un conteneur `.mermaid`, rechercher le SVG rendu ;
- serialiser le SVG avec `XMLSerializer`, l'encoder dans une data URL `image/svg+xml`, puis l'afficher par le meme element `<img>` du lightbox.

Le lightbox reste unique : overlay blanc, bouton de fermeture gris fonce, element contraint au viewport et fermeture par clic sur le fond, bouton ou touche Escape.

La data URL est preferee a l'injection d'une copie SVG dans le DOM. Une copie conserverait les memes identifiants internes que le diagramme original et pourrait provoquer des collisions sur les marqueurs, styles et references SVG.

## Consequences

- Sur macOS, Shift+Click et Command+Click ont le meme effet pour les images et Mermaid.
- Option+Click et Control+Click restent disponibles pour d'autres usages.
- Le fond blanc favorise les contenus clairs mais offre moins de contraste aux images tres blanches sans bordure.
- Le diagramme Mermaid conserve ses proportions et s'adapte au viewport.
- Le SVG doit deja avoir ete rendu par Mermaid ; un conteneur `.mermaid` sans SVG ne declenche rien.
- Le contenu de la data URL reste local au navigateur et n'est ni envoye ni persiste.
