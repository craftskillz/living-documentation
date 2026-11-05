---
type: ADR
title: Édition par section et autosave avec contrôle de concurrence
description: Une popup édite une section et ses sous-sections avec aperçu réel, snippets et collage d'image, et les éditeurs enregistrent toutes les 10 s ; un PUT avec expectedContent refuse par un 409 d'écraser un fichier modifié entre-temps.
tags:
  - editor
  - markdown
  - autosave
  - concurrence
  - api
status: To be validated
---

## Contexte

Corriger un paragraphe obligeait à ouvrir l'éditeur du document entier et à perdre sa position de lecture. Un brouillon n'existait par ailleurs que dans le navigateur jusqu'au clic sur « Enregistrer ». Enfin, `PUT /api/documents/:id` écrasait le fichier sans vérifier qu'il n'avait pas changé depuis l'ouverture de l'éditeur, alors qu'un agent MCP, Git ou un autre onglet peuvent le modifier en parallèle.

## Décision

### Une section est définie par la structure Markdown

`src/lib/markdownSection.ts` calcule la section en offsets dans le fichier à partir des tokens du lexer, et non par une recherche de `#` dans le texte. Une section va de son titre jusqu'au prochain titre de niveau égal ou supérieur : elle inclut donc ses sous-sections. Avant le premier titre, elle couvre le début du corps, sans le frontmatter. Les titres présents dans un bloc `:::compare` sont ignorés, comme dans le viewer.

`replaceMarkdownSection` ne remplace que cette plage et conserve les fins de ligne du fichier, y compris CRLF. Une ligne vide est maintenue avant le titre suivant, même si l'utilisateur supprime les retours à la ligne de fin.

### La popup réutilise le rendu du viewer

L'action « Modifier la section » apparaît dans la popup d'édition inline (`inlineSnippetEdit.ts`, `sectionAtTarget.ts`) et ouvre `SectionEditor.svelte`. L'aperçu rend le document complet après remplacement, avec le même pipeline et les mêmes classes que le viewer (`markdownClasses.svelte.ts`, `wireDocContent`). L'option `preview` de `wireContent.ts` désactive les interactions qui n'ont pas leur place dans un aperçu, comme le kanban. L'aperçu n'affiche que les notes de bas de page utilisées par la section, y compris celles citées par une note conservée (`sectionFootnotes.ts`), et aucun bloc de notes si elle n'en utilise pas ; les numéros restent ceux du document.

Le défilement synchronisé est activé par défaut et peut être désactivé. `sectionScrollSync.ts` aligne les blocs source et rendus : il mesure les lignes de la zone de saisie avec un miroir caché, pour tenir compte du retour à la ligne automatique sans déplacer le curseur.

### Snippets et import de fichiers, comme dans l'éditeur classique

La popup propose le bouton Snippets, le collage d'image, ainsi que le collage et le dépôt de fichiers. Ces fenêtres sont rendues à l'intérieur du `<dialog>` : tout ce qui est en dehors d'un dialogue modal est inerte et s'affiche dessous. Échap ferme d'abord la fenêtre ouverte, puis seulement la popup.

Le textarea ne contient qu'une partie du document, donc `SnippetsModal` reçoit deux props optionnelles : `editorDocument` donne le texte complet pour lister les ancres, et `saveEditor` enregistre le brouillon. Sans `saveEditor`, le snippet Diagramme enverrait `editor.value` comme contenu et remplacerait tout le document par la section.

`EditorFileImport.svelte` regroupe le collage, le dépôt, l'envoi et la fenêtre de nommage pour les deux éditeurs. Il écrit dans le textarea par un événement `input`, ce qui garde `bind:value` et l'autosave de chaque éditeur à jour.

### Sauvegarde : un seul chemin, manuel ou automatique

`src/lib/draftSave.ts` (`createDraftSaver`) représente une session d'édition. La popup de section et l'éditeur global l'utilisent tous les deux, toutes les `AUTOSAVE_INTERVAL_MS` (10 s) et au clic sur « Enregistrer » :

- une seule écriture à la fois : une sauvegarde demandée pendant une requête renvoie `busy` ;
- un brouillon inchangé ne déclenche aucune écriture ;
- le texte saisi pendant une requête n'est pas marqué comme enregistré ;
- l'autosave laisse l'éditeur ouvert, alors qu'un enregistrement manuel le ferme, sauf si du texte a été saisi pendant la requête ;
- après une erreur, le brouillon reste en place et une nouvelle tentative est possible.

Le contrat `SaveDocument` renvoie le contenu réellement persisté. Le serveur peut normaliser le Markdown ou le frontmatter : la session compare donc la sauvegarde suivante à ce contenu, sans remplacer le brouillon en cours.

### Concurrence optimiste sur `PUT /api/documents/:id`

Le corps de la requête accepte un champ optionnel `expectedContent`. S'il est présent et différent du fichier sur disque, le serveur répond `409` sans rien écrire. L'interface affiche `section.conflict` et conserve le brouillon pour que l'utilisateur puisse le copier ; il n'y a pas de fusion automatique.

Sans ce champ, le comportement reste celui d'avant : les clients existants ne sont pas affectés.

## Conséquences

- Les autosaves écrivent réellement dans le fichier. « Annuler » ne revient que sur ce qui n'a pas encore été enregistré, pas sur les autosaves déjà effectués.
- Un document ouvert longtemps pendant qu'un autre acteur l'écrit produira un conflit à la sauvegarde suivante, y compris lors d'un autosave. C'est voulu : aucune écriture externe n'est perdue en silence.
- Le collage s'insère à la position du curseur, qui est placé au début de la section à l'ouverture de la popup. Coller sans cliquer d'abord dans le texte place donc l'image devant le titre et casse celui-ci.
- Les parents qui fournissent `onsave` (`Home.svelte`, `AdrModal.svelte`) doivent respecter `SaveDocument` : transmettre `expectedContent`, lever une erreur sur 409 et renvoyer le contenu persisté.

## Tests

- Unitaires : `tests/unit/markdownSection.test.ts`, `tests/unit/draftSave.test.ts`.
- E2E : `tests/e2e/section-edit.spec.ts`, `tests/e2e/section-scroll.spec.ts`, `tests/e2e/autosave.spec.ts`, `tests/e2e/editor-paste.spec.ts` (les deux éditeurs).
