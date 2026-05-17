---
**date:** 2026-05-17
**status:** To be validated
**description:** Le viewer associe des éléments HTML rendus à leurs plages Markdown de snippets connues et ouvre la modale Snippets en édition inline depuis un clic droit pour remplacer puis sauvegarder la plage source.
**tags:** snippet, inline-edit, contextmenu, viewer, markdown-range, detectSnippetType, openSnippetsModalForInlineEdit, saveCurrentDocumentContent, playwright
---

# Édition inline des snippets depuis le viewer par clic droit

## Contexte

Le mode édition Markdown possède déjà une modale Snippets capable de détecter un snippet sélectionné dans le textarea, de préremplir un mini éditeur puis de remplacer la sélection. Ce flux reste puissant, mais il oblige l'utilisateur à passer en mode `Modifier`, à retrouver la bonne plage Markdown et à la sélectionner manuellement.

Le besoin est de garder cette mécanique telle quelle tout en l'exposant depuis le viewer : clic droit sur une zone rendue, proposition d'édition inline, puis propagation de la modification au Markdown source.

## Décision

### 1. Clic droit plutôt que double-clic

Le déclencheur est `contextmenu` sur le rendu du document. Si la zone ciblée correspond à un snippet connu, le menu natif est intercepté et une petite popup affiche l'action `Edit inline`. Si aucun snippet n'est reconnu, le clic droit natif reste inchangé.

### 2. Source map légère par correspondance ordonnée

Le rendu HTML produit par `marked` ne fournit pas de source map vers le Markdown. `src/frontend/inline-snippet-edit.js` reconstruit donc une correspondance pragmatique :

1. scanner `currentDocContent` avec des regex couvrant les patterns déjà reconnus par `detectSnippetType()` ;
2. filtrer les plages dont le type n'est pas un snippet éditable ;
3. associer ces plages aux éléments HTML rendus équivalents dans l'ordre du document (`span[style*=color]`, `div[style*=border-left]`, `pre`, `table`, `blockquote`, `hr`, listes, images, liens, `details`) ;
4. poser `data-inline-snippet-index` sur les éléments mappés pour retrouver la plage source au clic droit.

Cette approche évite d'introduire un parser Markdown/source-map complet. Elle est suffisamment fiable pour les snippets canoniques générés par la modale existante, avec la limite assumée que des snippets fortement modifiés à la main peuvent ne pas être reconnus.

### 3. Réutilisation de la modale Snippets

L'édition inline ne duplique aucun mini éditeur. La popup appelle `openSnippetsModalForInlineEdit(range)` dans `src/frontend/snippets.js`, qui :

- garde la plage Markdown source (`start`, `end`) ;
- réutilise `detectSnippetType()` et `parseAndFillSnippet()` ;
- adapte le titre de la modale et le bouton principal en mode `Save` ;
- appelle `buildSnippetMarkdown()` au moment de sauvegarder.

La modale historique reste inchangée pour le mode textarea : le bouton Snippets en mode édition continue de remplacer la sélection dans `#doc-editor`.

### 4. Sauvegarde partagée du document

`src/frontend/documents.js` expose `saveCurrentDocumentContent(content)`, qui centralise le PUT `/api/documents/:id`, le rechargement du HTML rendu, la réapplication des décorations viewer, la mise à jour des compteurs de fichiers, du bouton `Valider` et de la jauge métadonnées.

Le mode édition classique appelle désormais ce helper, et l'édition inline l'utilise après avoir remplacé la plage source par le Markdown généré par la modale Snippets.

### 5. Internationalisation

Les textes visibles ajoutés (`Edit inline`, titre de modale inline, bouton `Save`, erreur de sauvegarde) sont déclarés dans `src/frontend/i18n/en.json` et `src/frontend/i18n/fr.json`.

## Conséquences

### PROS

- Les utilisateurs peuvent rééditer un snippet depuis le document rendu, sans connaître ni retrouver la syntaxe Markdown.
- Les mini éditeurs existants restent la seule source de vérité ; pas de duplication d'UI ou de parsing de formulaire.
- Le comportement reste progressif : aucune popup n'apparaît sur du contenu non reconnu, et le clic droit natif reste disponible hors snippets.
- Le chemin de sauvegarde du document est partagé entre édition classique et édition inline, ce qui réduit les divergences de rafraîchissement UI.

### CONS

- La correspondance Markdown → HTML est heuristique et ordonnée, pas une source map exacte. Des snippets identiques ou du Markdown fortement modifié à la main peuvent produire une association ambiguë.
- La première couverture E2E cible `colored-text` et `colored-section`, les deux cas les plus représentatifs pour valider un snippet inline et un snippet bloc. Les autres types bénéficient du même mécanisme, mais pourront recevoir des tests dédiés si des régressions apparaissent.
- Les snippets `diagram` et `attachment` ne sont pas proposés en édition inline, car ils déclenchent des workflows spécifiques (création de diagramme, picker de fichier) qui ne sont pas de simples remplacements de plage Markdown.
