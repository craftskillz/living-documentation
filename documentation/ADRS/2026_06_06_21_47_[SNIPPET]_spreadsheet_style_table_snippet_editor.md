---
type: ADR
title: Spreadsheet Style Table Snippet Editor
description: Le snippet tableau remplace l'editeur global ligne/colonne par une grille type tableur 2x2 navigable au clavier, stylable en direct, editable au double-clic et suppressible par menu contextuel.
tags:
  - snippet
  - table
  - spreadsheet-grid
  - keyboard-navigation
  - tab-navigation
  - double-click-edit
  - context-menu
  - live-style
  - row-deletion
  - column-deletion
  - markdown-builder
  - parseTableSnippetMarkdown
  - tableRenderGrid
  - inlineSnippetEdit
  - Svelte
timestamp: 2026-06-06T21:47:00Z
status: To be validated
---

# Spreadsheet style table snippet editor

## Contexte

L'ADR `2026_04_08_13_00_[EDITOR]_markdown_snippet_inserter_with_detection` a introduit le snippet tableau avec une grille dynamique pilotee par des controles `+`/`-` de lignes et colonnes. Ce modele fonctionnait et preservait le round-trip d'edition : selectionner un tableau rendu, ouvrir "Edit table", parser le Markdown source, puis replacer les cellules au bon endroit.

L'UX restait cependant trop formulaire : les cellules etaient editees individuellement, l'ajout de lignes ou colonnes passait par des boutons globaux, et la suppression d'une ligne ou colonne n'etait pas contextualisee sur la cellule travaillee.

## Decision

Conserver le modele de donnees existant `TableController.data: string[][]`, le parser `parseTableSnippetMarkdown` et le builder `buildTableMarkdown`. La feature change seulement l'editeur visuel et les interactions de saisie.

Le snippet tableau neuf demarre maintenant avec une grille 2x2 : une ligne d'en-tete et une ligne de contenu, deux colonnes. Le rendu de l'editeur utilise une table editable qui reprend en direct les controles `style`, `bordered` et `color` du formulaire : changer le style compact/striped, la checkbox de bordure ou la couleur re-rend immediatement la grille en popup sans attendre l'insertion ou la sauvegarde.

La toolbar du panneau table affiche un hint i18n court (`Tab pour se deplacer`, `-> ajoute une colonne`, fleche bas pour ajouter une ligne) afin d'exposer les raccourcis clavier principaux sans remettre de controles globaux ligne/colonne.

La couche CSS `ld-table-editor` applique explicitement les memes semantics que le rendu Markdown : sans `bordered`, seules les separations horizontales restent visibles ; avec `bordered`, les bordures completes apparaissent ; les classes `table-color-*` redefinissent les variables d'accent et teintent l'en-tete et les separateurs. Ces regles sont plus specifiques que le style par defaut de l'editeur afin que la select couleur agisse immediatement dans la popup.

La navigation clavier suit une logique de tableur :

- `Tab` deplace le focus vers la cellule suivante et selectionne son contenu ;
- `Shift+Tab` deplace le focus vers la cellule precedente et selectionne son contenu ;
- depuis la derniere colonne, `Tab` va a la premiere cellule de la ligne suivante si elle existe ; sinon une nouvelle ligne est creee ;
- `ArrowLeft`, `ArrowRight`, `ArrowUp` et `ArrowDown` deplacent le focus dans la grille ;
- `ArrowRight` depuis la derniere colonne cree une nouvelle colonne ;
- `ArrowDown` depuis la derniere ligne cree une nouvelle ligne.

Les controles globaux `Lignes - +` et `Colonnes` sont retires de la toolbar. La suppression passe par un menu contextuel sur chaque cellule, ouvert au clic droit, avec deux actions i18n : supprimer la ligne et supprimer la colonne.

Dans le document rendu, un double-clic sur une table reconnue comme snippet ouvre directement la meme popup que l'action "Edit table" du menu contextuel. Si le double-clic cible une cellule, `inlineSnippetEdit` transmet la coordonnee `{ row, col }` au modal ; `SnippetsModal` donne alors le focus a la cellule correspondante dans la grille editable et selectionne son contenu.

Le modal `SnippetsModal` est monte dans le DOM sous le conteneur scrollable `#home-content-area`. Le focus programmatique d'une cellule d'edition peut donc demander au navigateur de scroller ce conteneur, surtout au premier affichage apres F5. `focusTableCell` utilise `input.focus({ preventScroll: true })` pour garder le focus et la selection de cellule sans deplacer le document.

## Consequences

### PROS

- L'edition d'un tableau est plus directe et proche d'un tableur.
- Le round-trip des anciens tableaux reste preserve : le parsing Markdown remplit toujours `string[][]`, puis la nouvelle grille rend ces donnees.
- Le format Markdown genere ne change pas, donc les documents existants et les tests de rendu de styles restent compatibles.
- L'ajout automatique de ligne ou colonne reduit la friction lors de la saisie au clavier.
- La suppression ligne/colonne est contextualisee sur la cellule cible au lieu d'etre exposee par des boutons globaux.
- Le double-clic reduit le nombre d'actions necessaires pour modifier une table deja affichee.
- La popup donne un feedback visuel coherent avec ce qui sera rendu dans la page.
- Le hint clavier rend les interactions principales decouvrables sans alourdir l'editeur.
- Le premier double-clic apres F5 ne deplace plus le document pendant le focus de la cellule cible.

### CONS

- La grille reste rendue imperativement avec `innerHTML` dans `tableRenderGrid`, comme l'ancien editeur ; ce n'est pas encore un composant Svelte declaratif.
- Le style live de la popup ajoute une petite couche CSS dediee (`ld-table-editor`) en plus des classes de rendu Markdown.
- Le menu contextuel, le double-clic et le focus sans scroll ajoutent une gestion DOM supplementaire (`contextmenu`, `dblclick`, `focus({ preventScroll: true })`) qui doit rester couverte par tests E2E.

## Verification

- `npm run build`
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "table editor uses spreadsheet keyboard navigation" --project=chromium`
