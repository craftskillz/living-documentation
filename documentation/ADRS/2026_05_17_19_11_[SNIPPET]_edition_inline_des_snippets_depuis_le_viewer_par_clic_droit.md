---
**date:** 2026-05-17
**status:** To be validated
**description:** Le viewer mappe les snippets Markdown rendus vers leurs plages source, ouvre la modale Snippets en édition inline au clic droit, verrouille le type détecté, permet la suppression confirmée et spécialise les mini éditeurs des blocs structurés.
**tags:** snippet, inline-edit, contextmenu, viewer, markdown-range, deleteInlineSnippetBlock, detectSnippetType, parseAndFillSnippet, buildSnippetMarkdown, table, code-block, blockquote, ordered-list, unordered-list, colored-text, colored-section, playwright
---

# Édition inline des snippets depuis le viewer par clic droit

## Contexte

Le mode édition Markdown possède déjà une modale Snippets capable de détecter un snippet sélectionné dans le textarea, de préremplir un mini éditeur puis de remplacer la sélection. Ce flux reste puissant, mais il oblige l'utilisateur à passer en mode `Modifier`, à retrouver la bonne plage Markdown et à la sélectionner manuellement.

Le besoin est de garder cette mécanique telle quelle tout en l'exposant depuis le viewer : clic droit sur une zone rendue, proposition d'édition inline, édition guidée du snippet détecté, puis propagation de la modification au Markdown source.

Les premières itérations ont montré que cette feature deviendra un axe durable : les tables, blocs de code, citations, arborescences, listes et snippets colorés nécessitent chacun une UX de modification plus spécifique qu'un simple aperçu Markdown.

## Décision

### 1. Clic droit plutôt que double-clic

Le déclencheur est `contextmenu` sur le rendu du document. Si la zone ciblée correspond à un snippet connu, le menu natif est intercepté et une petite popup affiche l'action `Edit inline`. Si aucun snippet n'est reconnu, le clic droit natif reste inchangé.

Le fichier `src/frontend/inline-snippet-edit.js` porte uniquement la correspondance viewer -> Markdown source et l'ouverture de la popup. La logique de formulaire reste dans la modale Snippets existante.

### 2. Source map légère par correspondance ordonnée

Le rendu HTML produit par `marked` ne fournit pas de source map vers le Markdown. `src/frontend/inline-snippet-edit.js` reconstruit donc une correspondance pragmatique :

1. scanner `currentDocContent` avec des regex couvrant les patterns déjà reconnus par `detectSnippetType()` ;
2. filtrer les plages dont le type n'est pas un snippet éditable ;
3. associer ces plages aux éléments HTML rendus équivalents dans l'ordre du document (`span[style*=color]`, `div[style*=border-left]`, `pre`, `table`, `blockquote`, `hr`, listes de premier niveau, images, liens, `details`) ;
4. poser `data-inline-snippet-index` sur les éléments mappés pour retrouver la plage source au clic droit.

La capture des tables s'étend volontairement vers le haut et le bas à partir d'une ligne `|...|` pour inclure l'en-tête, la ligne séparatrice et toutes les lignes de données. Les listes rendues sont mappées sur les listes de premier niveau afin d'éviter d'attacher une plage Markdown complète à un sous-`ul` ou sous-`ol` imbriqué.

Cette approche évite d'introduire un parser Markdown/source-map complet. Elle est suffisamment fiable pour les snippets canoniques générés par la modale existante, avec la limite assumée que des snippets fortement modifiés à la main peuvent ne pas être reconnus.

### 3. Réutilisation de la modale Snippets avec mode inline explicite

L'édition inline ne duplique aucun mini éditeur. La popup appelle `openSnippetsModalForInlineEdit(range)` dans `src/frontend/snippets.js`, qui :

- garde la plage Markdown source (`start`, `end`) ;
- réutilise `detectSnippetType()` et `parseAndFillSnippet()` ;
- adapte le titre de la modale et le bouton principal en mode `Save` ;
- élargit la carte de modale pour les éditeurs structurés ;
- désactive la selectbox `#snippet-type` en mode inline pour empêcher de changer le type détecté et d'écraser la plage source avec un autre format ;
- appelle `buildSnippetMarkdown()` au moment de sauvegarder.

La modale historique reste modifiable en mode insertion : le bouton Snippets du textarea continue d'ouvrir la même selectbox active et remplace la sélection dans `#doc-editor`.

### 4. Mini éditeurs dédiés aux snippets structurés

Les types suivants ont un formulaire éditable en mode inline, sans dépendre de l'aperçu Markdown :

- `table` : la plage Markdown complète est parsée en grille. Les cellules vides sont préservées et ne sont pas confondues avec la ligne séparatrice.
- `code-block` : le langage de la fence est prérempli et le contenu du code est éditable dans un textarea monospace.
- `blockquote` : les préfixes `>` sont retirés dans le textarea, puis réappliqués ligne par ligne à l'enregistrement, y compris sur les lignes vides.
- `unordered-list` : les marqueurs `-`, `*` ou `+` sont retirés dans le textarea ; l'indentation est conservée et les `-` sont reconstruits.
- `ordered-list` : les marqueurs numériques sont retirés dans le textarea ; l'indentation est conservée et les compteurs sont régénérés par niveau.
- `tree` : l'éditeur d'arborescence existant reste utilisé ; son aperçu Markdown est masqué en inline.
- `colored-text` et `colored-section` : les champs couleur/contenu restent les éditeurs principaux ; l'aperçu Markdown est masqué.

L'aperçu Markdown reste utile pour les snippets simples en insertion, mais il est supprimé des modes inline où l'utilisateur travaille dans un mini éditeur déjà spécialisé.

### 5. Suppression confirmée du bloc source

La modale inline affiche un bouton `Supprimer le bloc` avant `Enregistrer`. Il n'est visible qu'en mode inline. Le clic ouvre la modale générique `showConfirm()` en mode danger, puis supprime la plage Markdown source (`currentDocContent.slice(0, start) + currentDocContent.slice(end)`) et sauvegarde le document.

Cette suppression est volontairement faite au niveau de la plage Markdown détectée, pas au niveau du DOM rendu, pour conserver le même contrat que l'édition inline : le viewer n'est qu'un point d'entrée, le Markdown reste la source de vérité.

### 6. Sauvegarde partagée du document

`src/frontend/documents.js` expose `saveCurrentDocumentContent(content)`, qui centralise le PUT `/api/documents/:id`, le rechargement du HTML rendu, la réapplication des décorations viewer, la mise à jour des compteurs de fichiers, du bouton `Valider` et de la jauge métadonnées.

Le mode édition classique appelle désormais ce helper, et l'édition inline l'utilise après avoir remplacé ou supprimé la plage source.

### 7. Internationalisation et tests

Les textes visibles ajoutés (`Edit inline`, titre de modale inline, bouton `Save`, bouton et confirmation de suppression, erreurs de sauvegarde/suppression, libellés des nouveaux textareas) sont déclarés dans `src/frontend/i18n/en.json` et `src/frontend/i18n/fr.json`.

La fixture `with-inline-snippets` et `tests/e2e/inline-snippet-edit.spec.ts` couvrent les cas de round-trip et de suppression pour : texte coloré, section colorée, table avec cellules vides, bloc de code, citation, liste à puces, liste numérotée, ainsi que le verrouillage de la selectbox en mode inline et sa disponibilité en mode insertion.

## Conséquences

### PROS

- Les utilisateurs peuvent rééditer un snippet depuis le document rendu, sans connaître ni retrouver la syntaxe Markdown.
- Les mini éditeurs existants restent la seule source de vérité ; pas de duplication d'UI ou de parsing de formulaire.
- Le type détecté est verrouillé en inline, ce qui évite de remplacer accidentellement une plage source par un autre format.
- Les snippets structurés deviennent éditables avec des champs adaptés au contenu réel plutôt qu'avec un aperçu Markdown passif.
- La suppression confirmée permet de retirer un bloc depuis le viewer sans repasser par le textarea Markdown.
- Le chemin de sauvegarde du document est partagé entre édition classique et édition inline, ce qui réduit les divergences de rafraîchissement UI.
- La couverture E2E reflète les snippets qui ont été durcis pendant l'itération.

### CONS

- La correspondance Markdown -> HTML est heuristique et ordonnée, pas une source map exacte. Des snippets identiques ou du Markdown fortement modifié à la main peuvent produire une association ambiguë.
- Les regex de capture doivent évoluer à chaque nouveau pattern Markdown rendu qui ne se mappe pas trivialement sur un élément DOM.
- La régénération des listes ordonnées renumérote les items au lieu de préserver des numéros volontairement non séquentiels.
- Les snippets `diagram` et `attachment` ne sont pas proposés en édition inline, car ils déclenchent des workflows spécifiques (création de diagramme, picker de fichier) qui ne sont pas de simples remplacements de plage Markdown.
