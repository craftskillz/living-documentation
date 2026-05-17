---
**date:** 2026-05-17
**status:** To be validated
**description:** Le viewer mappe les snippets Markdown rendus vers leurs plages source, ouvre la modale Snippets en édition inline au clic droit sur une zone reconnue ou en insertion inline au clic droit sur une zone non reconnue, verrouille le type détecté en édition, permet la suppression confirmée, spécialise les mini éditeurs des blocs structurés et préserve l'indentation des code blocks imbriqués dans des listes.
**tags:** snippet, inline-edit, inline-insert, contextmenu, viewer, markdown-range, deleteInlineSnippetBlock, detectSnippetType, parseAndFillSnippet, buildSnippetMarkdown, table, code-block, code-block-indent, blockquote, ordered-list, unordered-list, colored-text, colored-section, playwright
---

# Édition inline des snippets depuis le viewer par clic droit

## Contexte

Le mode édition Markdown possède déjà une modale Snippets capable de détecter un snippet sélectionné dans le textarea, de préremplir un mini éditeur puis de remplacer la sélection. Ce flux reste puissant, mais il oblige l'utilisateur à passer en mode `Modifier`, à retrouver la bonne plage Markdown et à la sélectionner manuellement.

Le besoin est de garder cette mécanique telle quelle tout en l'exposant depuis le viewer : clic droit sur une zone rendue, proposition d'édition inline, édition guidée du snippet détecté, puis propagation de la modification au Markdown source.

Les premières itérations ont montré que cette feature deviendra un axe durable : les tables, blocs de code, citations, arborescences, listes et snippets colorés nécessitent chacun une UX de modification plus spécifique qu'un simple aperçu Markdown.

## Décision

### 1. Clic droit plutôt que double-clic

Le déclencheur est `contextmenu` sur le rendu du document. Si la zone ciblée correspond à un snippet connu, le menu natif est intercepté et une petite popup affiche l'action `Edit inline`. Si la zone ciblée ne correspond à aucun snippet reconnu (texte simple, titre, paragraphe brut, espace blanc à l'intérieur de `#doc-content`), la popup affiche `Insert a snippet here` et ouvre la modale Snippets en mode insertion inline.

Le fichier `src/frontend/inline-snippet-edit.js` porte uniquement la correspondance viewer -> Markdown source, le calcul de la position d'insertion pour les zones non reconnues, et l'ouverture de la popup. La logique de formulaire reste dans la modale Snippets existante.

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

L'insertion inline depuis le viewer suit le même schéma via `openSnippetsModalForInlineInsert(insertPos)` :

- `_snippetSelStart` et `_snippetSelEnd` sont positionnés à la même valeur `insertPos` calculée par `_inlineFindInsertPosition()`. La résolution suit une cascade hybride : (a) remonter au top-level child DOM de `#doc-content` à partir de `event.target` ; (a-bis) si `event.target` est `#doc-content` lui-même (clic dans la marge verticale du `prose` entre deux blocs), retomber sur la coordonnée `event.clientY` pour identifier le top-level child le plus proche au-dessus de la souris ; (b) si ce bloc ou un de ses descendants porte `data-inline-snippet-index`, utiliser la `range.end` la plus grande des candidats puis avancer jusqu'au prochain `\n\n` (garantit l'insertion en fin de bloc rendu, pas au milieu d'un paragraphe contenant un snippet) ; (c) sinon, tenter une recherche de signature avec la première ligne du `textContent` (≤ 60 chars) dans le Markdown source ; (d) si tout échoue sur le bloc cliqué, parcourir les frères précédents puis suivants pour trouver une ancre résolvable, en sautant au `\n\n` suivant/précédent ; (e) fallback final : fin du document.
- la modale s'ouvre avec un titre `Insert a snippet`, la selectbox `#snippet-type` reste active, le bouton `Delete block` est caché ;
- la carte de modale est élargie comme en édition inline pour permettre les mini éditeurs structurés ;
- au moment de soumettre, `insertSnippet()` détecte le mode `inline-insert`, encadre le Markdown construit par les sauts de ligne nécessaires (`\n\n` avant/après uniquement si le contexte source ne les fournit pas déjà), puis appelle `saveCurrentDocumentContent()` au lieu d'écrire dans le `#doc-editor`.

La modale historique reste modifiable en mode insertion : le bouton Snippets du textarea continue d'ouvrir la même selectbox active et remplace la sélection dans `#doc-editor`.

`_setSnippetModalMode(mode)` accepte désormais une chaîne `"insert" | "inline-edit" | "inline-insert"` plutôt qu'un booléen pour différencier explicitement les trois flux.

### 4. Mini éditeurs dédiés aux snippets structurés

Les types suivants ont un formulaire éditable en mode inline, sans dépendre de l'aperçu Markdown :

- `table` : la plage Markdown complète est parsée en grille. Les cellules vides sont préservées et ne sont pas confondues avec la ligne séparatrice.
- `code-block` : le langage de la fence est prérempli et le contenu du code est éditable dans un textarea monospace. Le regex de parsing utilise `[ \t]*` (whitespace horizontal seulement) après la fence d'ouverture pour éviter d'absorber un `\n` et donc d'attribuer la première ligne de contenu comme langage quand la fence n'a pas de langage explicite. Les fences indentés à l'intérieur d'une liste sont aussi reconnus : l'indentation canonique (espaces avant la fence d'ouverture) est capturée dans la plage source, retirée de chaque ligne dans le textarea, puis réappliquée à chaque ligne (fences incluses) lors de la sauvegarde, de sorte que le bloc reste imbriqué dans son item de liste.
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

Les textes visibles ajoutés (`Edit inline`, `Insert a snippet here`, titres de modales inline, bouton `Save`, bouton et confirmation de suppression, erreurs de sauvegarde/insertion/suppression, libellés des nouveaux textareas) sont déclarés dans `src/frontend/i18n/en.json` et `src/frontend/i18n/fr.json`.

La fixture `with-inline-snippets` et `tests/e2e/inline-snippet-edit.spec.ts` couvrent les cas de round-trip et de suppression pour : texte coloré, section colorée, table avec cellules vides, bloc de code, bloc de code sans langage (style requête CloudWatch Logs Insights), bloc de code indenté dans une liste numérotée, citation, liste à puces, liste numérotée, insertion inline d'un snippet depuis un titre non mappé du viewer, ainsi que le verrouillage de la selectbox en mode inline-edit et sa disponibilité en modes insertion et inline-insert.

## Conséquences

### PROS

- Les utilisateurs peuvent rééditer un snippet existant ou insérer un nouveau snippet depuis le document rendu, sans connaître ni retrouver la syntaxe Markdown ni basculer en mode édition textarea.
- Les mini éditeurs existants restent la seule source de vérité ; pas de duplication d'UI ou de parsing de formulaire.
- Le type détecté est verrouillé en inline, ce qui évite de remplacer accidentellement une plage source par un autre format.
- Les snippets structurés deviennent éditables avec des champs adaptés au contenu réel plutôt qu'avec un aperçu Markdown passif.
- La suppression confirmée permet de retirer un bloc depuis le viewer sans repasser par le textarea Markdown.
- Le chemin de sauvegarde du document est partagé entre édition classique et édition inline, ce qui réduit les divergences de rafraîchissement UI.
- La couverture E2E reflète les snippets qui ont été durcis pendant l'itération.

### CONS

- La correspondance Markdown -> HTML est heuristique et ordonnée, pas une source map exacte. Des snippets identiques ou du Markdown fortement modifié à la main peuvent produire une association ambiguë.
- Le calcul de la position d'insertion inline cascade plusieurs heuristiques (range-anchor des descendants mappés, puis signature textuelle, puis ancrage sur frères mappés). La cascade évite l'insertion en fin de document tant qu'un frère résolvable existe, mais reste heuristique : si plusieurs blocs partagent le même incipit textuel et qu'aucun snippet n'est présent autour, l'insertion peut se placer après la première occurrence trouvée plutôt qu'après le bloc cliqué.
- Les regex de capture doivent évoluer à chaque nouveau pattern Markdown rendu qui ne se mappe pas trivialement sur un élément DOM.
- La régénération des listes ordonnées renumérote les items au lieu de préserver des numéros volontairement non séquentiels.
- Les snippets `diagram` et `attachment` ne sont pas proposés en édition inline, car ils déclenchent des workflows spécifiques (création de diagramme, picker de fichier) qui ne sont pas de simples remplacements de plage Markdown.
