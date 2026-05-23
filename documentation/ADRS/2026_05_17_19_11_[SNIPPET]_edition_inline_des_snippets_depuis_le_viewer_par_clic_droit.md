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

Le déclencheur est `contextmenu` sur le rendu du document. Si la zone ciblée correspond à un snippet connu, le menu natif est intercepté et une petite popup affiche **deux** actions typées :

- `Éditer ...` (icône `fa-pen-to-square` ou icône spécifique au type — `fa-table-cells`, `fa-code`, etc.) qui ouvre la modale Snippets en édition inline avec le type détecté et les champs préremplis.
- `Supprimer ...` (icône `fa-trash`, classe danger rouge) qui ouvre directement la modale `showConfirm` de suppression — la même modale que celle déclenchée par le bouton `Supprimer le bloc` à l'intérieur de la modale d'édition. Sur confirmation, la plage Markdown source est retirée via `saveCurrentDocumentContent` ; sur annulation, le snippet reste intact. Les labels sont typés (`Éditer le tableau` / `Supprimer le tableau`, `Éditer le bloc repliable` / `Supprimer le bloc repliable`, …) pour que l'utilisateur sache sans ambiguïté ce qu'il s'apprête à modifier ou retirer.

Si la zone ciblée ne correspond à aucun snippet reconnu (texte simple, titre, paragraphe brut, espace blanc à l'intérieur de `#doc-content`), la popup affiche une **unique** action `Insert a snippet here` car le type sera choisi dans le picker de la modale.

Quand le document est très court (un titre seul, document quasi vide), la zone rendue `#doc-content` peut être trop petite pour recevoir le clic dans la marge de la `<main>`. Un second handler `contextmenu` est posé sur `<main id="content-area">` comme **fallback secondaire** : il ne se déclenche qu'aux conditions cumulées (a) la cible n'est pas à l'intérieur de `#doc-content`, `#doc-editor`, `<textarea>` ou `<input>` ; (b) `#doc-content` est rendu et visible ; (c) le handler primaire n'a pas déjà fait `preventDefault()` (`event.defaultPrevented` false). Dans ce cas la popup propose `Insérer un snippet ici` et la position d'insertion est `currentDocContent.length` — le snippet est ajouté en fin de document.

Le fichier `src/frontend/inline-snippet-edit.js` porte uniquement la correspondance viewer -> Markdown source, le calcul de la position d'insertion pour les zones non reconnues, et l'ouverture de la popup. La logique de formulaire reste dans la modale Snippets existante.

### 2. Source map légère par correspondance ordonnée

Le rendu HTML produit par `marked` ne fournit pas de source map vers le Markdown. `src/frontend/inline-snippet-edit.js` reconstruit donc une correspondance pragmatique :

1. scanner `currentDocContent` avec des regex couvrant les patterns déjà reconnus par `detectSnippetType()`. Le contrôle d'overlap dans `_inlineAddRange` autorise désormais le **nesting strict** : si une plage candidate est entièrement contenue dans une plage existante (ou inversement), les deux coexistent. Seuls les chevauchements partiels et les positions identiques (deux regex matchant la même chaîne) sont rejetés. Cela permet à un `<details>` ET à un code block (ou heading, liste, lien) intérieurs d'être tous deux mappés à leurs éléments DOM respectifs ;
2. filtrer les plages dont le type n'est pas un snippet éditable ;
3. associer ces plages aux éléments HTML rendus équivalents dans l'ordre du document (`span[style*=color]`, `div[style*=border-left]`, `pre`, `table`, `blockquote`, `hr`, listes de premier niveau, `h1`/`h2`/`h3`/`h4`, images, liens, `details`). Tous les éléments mappables (y compris ceux à l'intérieur d'un container déjà mappé) reçoivent un `data-inline-snippet-index`. Au clic droit, `event.target.closest("[data-inline-snippet-index]")` retourne l'ancêtre mappé le plus proche : clic sur le code block intérieur → édition du code block ; clic sur le `<summary>` ou une zone non mappée du `<details>` → édition du collapsible ;
4. poser `data-inline-snippet-index` sur les éléments mappés pour retrouver la plage source au clic droit.

La capture des tables s'étend volontairement vers le haut et le bas à partir d'une ligne `|...|` pour inclure l'en-tête, la ligne séparatrice et toutes les lignes de données. Les listes rendues sont mappées sur les listes de premier niveau afin d'éviter d'attacher une plage Markdown complète à un sous-`ul` ou sous-`ol` imbriqué.

Cette approche évite d'introduire un parser Markdown/source-map complet. Elle est suffisamment fiable pour les snippets canoniques générés par la modale existante, avec la limite assumée que des snippets fortement modifiés à la main peuvent ne pas être reconnus.

### 2bis. Picker catégorisé pour le choix de snippet à l'insertion

Le `<select id="snippet-type">` avec ~20 options est devenu peu ergonomique. La modale Snippets affiche désormais, en mode insertion, un **picker** : grille de cards (icône FontAwesome + label nettoyé via `_snippetPickerCleanLabel` qui retire les emojis prefixes hérités des labels du `<select>`), regroupées en 4 catégories (`structure`, `lists-code-data`, `rich-text`, `links-media`). Le groupe `rich-text` contient aussi `emojis` et `local-search` afin de rassembler les snippets d'enrichissement du contenu.

Les deux modes d'insertion (bouton `Snippets` du textarea et insertion via clic droit hors snippet) partagent la même largeur (`max-w-6xl`) pour éviter deux expériences visuelles différentes. L'édition inline d'un bloc détecté reste en `max-w-5xl` pour conserver l'espace de travail des mini éditeurs. Les cards utilisent une grille dense (`3 -> 8` colonnes selon viewport), conservent les icônes en `text-xl`, et reçoivent une palette par type via `_SNIPPET_PICKER_TYPE_PALETTE` : titres en bleus progressifs, séparateur gris, repliable et code en sombre, listes en deux verts, arborescence et recherche locale en cyan, tableau orange, diagramme rouge, emojis jaune, liens/médias en tons orange/ambre.

Une barre de recherche au-dessus de la grille filtre les cards en temps réel par substring du label (case-insensitive). Les sections sans match sont masquées. `Enter` dans la recherche sélectionne automatiquement la première card visible. Un message `Aucun snippet ne correspond.` s'affiche si rien ne match.

Click sur une card → masque le picker, affiche le panel correspondant et un bouton **« ← Retour »** pour revenir au picker (utile si mauvais choix). Le `<select id="snippet-type">` est conservé caché (`#snippet-type-wrapper` avec `hidden`) — il reste le binding interne du type courant pour `snippetTypeChanged()`, `buildSnippetMarkdown()`, `parseAndFillSnippet()` et les tests qui interrogent `#snippet-type`.

Routing dans `_openSnippetsModalForText` :
- **inline-insert** (clic droit sur zone non mappée) → picker, jamais de détection à appliquer ;
- **type détecté** (inline-edit OU sélection textarea reconnue) → bypass picker, panel direct (et bouton Retour caché pour inline-edit qui verrouille le type) ;
- **sélection textarea sans détection** → picker (au lieu de retomber sur diagram comme avant) ;
- **aucune sélection** → picker.

Garde dans `insertSnippet` (versus types spéciaux qui déclenchent un flow custom) :
- **inline-edit + diagram/attachment** → bloqué (édition inline n'est pas faite pour redéclencher un flow de création de diagramme ou un file picker) ;
- **inline-insert + diagram** → autorisé. `insertDiagramSnippet()` détecte `_snippetInlineInsert` (capturé avant `closeSnippetsModal`), construit le Markdown du diagramme avec le padding `\n\n` cohérent avec les autres insertions inline, sauvegarde via `saveCurrentDocumentContent` (PUT + re-fetch HTML + ré-application des décorations viewer pour que le DOM reflète l'image-link AVANT la redirection — sinon un retour navigateur depuis l'éditeur de diagramme via bfcache aurait affiché l'ancien état), puis redirige vers `/diagram?id=…` pour ouvrir l'éditeur du nouveau diagramme. Le mode textarea (édition classique) conserve le `fetch` brut historique : la vue rendue n'est pas affichée en édition et sera refraîchie automatiquement au retour ;
- **inline-insert + attachment** → bloqué pour l'instant car `openFilePicker` lit/écrit la textarea `#doc-editor` qui n'est pas en mode édition.

La catégorisation est définie en JS (`_SNIPPET_PICKER_CATEGORIES`) avec icônes FontAwesome (`_SNIPPET_PICKER_ICONS`), labels via `_SNIPPET_TYPE_I18N_KEY` et couleurs via `_SNIPPET_PICKER_TYPE_PALETTE` ; ajouter un nouveau type de snippet ne nécessite qu'un nouvel entry dans ces maps.

### 3. Réutilisation de la modale Snippets avec mode inline explicite

L'édition inline ne duplique aucun mini éditeur. La popup appelle `openSnippetsModalForInlineEdit(range)` dans `src/frontend/snippets.js`, qui :

- garde la plage Markdown source (`start`, `end`) ;
- réutilise `detectSnippetType()` et `parseAndFillSnippet()` ;
- adapte le titre de la modale et le bouton principal en mode `Save` ;
- élargit la carte de modale pour les éditeurs structurés ;
- désactive la selectbox `#snippet-type` en mode inline pour empêcher de changer le type détecté et d'écraser la plage source avec un autre format ;
- masque le message historique `snippet-detect-msg` : le panel prérempli et le titre de la popup suffisent à confirmer le type reconnu ;
- appelle `buildSnippetMarkdown()` au moment de sauvegarder. Cette fonction reste le point d'entrée historique de la modale, mais elle ne porte plus les templates Markdown : `src/frontend/snippets.js` collecte les valeurs de formulaire dans `_snippetMarkdownBuildData(type)`, puis délègue à `ldBuildSnippetMarkdown(type, data)` dans `src/frontend/snippet-builders.js`. Le helper centralise la reconstruction par type et réutilise les helpers de domaine existants pour les listes et les attributs de table.

L'insertion inline depuis le viewer suit le même schéma via `openSnippetsModalForInlineInsert(insertPos)` :

- `_snippetSelStart` et `_snippetSelEnd` sont positionnés à la même valeur `insertPos` calculée par `_inlineFindInsertPosition()`. La résolution suit une cascade hybride : (a) remonter au top-level child DOM de `#doc-content` à partir de `event.target` ; (a-bis) si `event.target` est `#doc-content` lui-même (clic dans la marge verticale du `prose` entre deux blocs), retomber sur la coordonnée `event.clientY` pour identifier le top-level child le plus proche au-dessus de la souris ; (b) si ce bloc ou un de ses descendants porte `data-inline-snippet-index`, utiliser la `range.end` la plus grande des candidats puis avancer jusqu'au prochain `\n\n` (garantit l'insertion en fin de bloc rendu, pas au milieu d'un paragraphe contenant un snippet) ; (c) sinon, tenter une recherche de signature avec la première ligne du `textContent` (≤ 60 chars) dans le Markdown source ; (d) si tout échoue sur le bloc cliqué, parcourir les frères précédents puis suivants pour trouver une ancre résolvable, en sautant au `\n\n` suivant/précédent ; (e) fallback final : fin du document.
- la modale s'ouvre avec un titre `Insert a snippet`, la selectbox `#snippet-type` reste active, le bouton `Delete block` est caché ;
- la carte de modale est élargie comme en édition inline pour permettre les mini éditeurs structurés ;
- au moment de soumettre, `insertSnippet()` détecte le mode `inline-insert`, encadre le Markdown construit par les sauts de ligne nécessaires (`\n\n` avant/après uniquement si le contexte source ne les fournit pas déjà), puis appelle `saveCurrentDocumentContent()` au lieu d'écrire dans le `#doc-editor`.

La modale historique reste modifiable en mode insertion : le bouton Snippets du textarea continue d'ouvrir la même selectbox active et remplace la sélection dans `#doc-editor`.

`_setSnippetModalMode(mode)` accepte désormais une chaîne `"insert" | "inline-edit" | "inline-insert"` plutôt qu'un booléen pour différencier explicitement les trois flux.

### 4. Mini éditeurs dédiés aux snippets structurés

Les types suivants ont un formulaire éditable en mode inline, sans dépendre de l'aperçu Markdown :

- `collapsible` (`<details>`) : la modale expose un champ `summary` (input) ET un textarea `body` qui contient le Markdown intérieur entre `</summary>` et `</details>`. `parseAndFillSnippet` extrait les deux, `buildSnippetMarkdown` les reconcatène. L'aperçu Markdown est masqué. Le corps peut contenir d'autres patterns Markdown (titre, code block, liste…) qui sont par ailleurs eux-mêmes détectés et mappés à leur élément DOM intérieur (voir décision 2 — règle de nesting). Conséquence pratique : clic droit sur le `<summary>` ou sur un texte non mappé du body → édition du collapsible ; clic droit sur un code block ou une liste à l'intérieur → édition individuelle de ce snippet.
- `table` : la modale expose trois contrôles indépendants au-dessus de la grille : `Style` (Default / Compact / Striped), une checkbox `Borders`, et `Color` (None / Info bleu / Success vert / Warning orange / Danger rouge / Note violet). Le style, la bordure et la couleur se cumulent : un tableau peut être rayé avec ou sans bordures, compact avec ou sans couleur, ou simplement coloré. Le type par défaut est visuellement l'ancien `<!-- table-style: borderless -->` : padding généreux, lignes horizontales entre les rangées, aucune bordure verticale ni grille complète. Les attributs sont portés en source par jusqu'à **trois** lignes de commentaires HTML immédiatement avant la table : `<!-- table-style: compact|striped -->`, `<!-- table-border: bordered -->` et/ou `<!-- table-color: <name> -->` (ordre libre, sans ligne vide). `src/frontend/snippet-table-attributes.js` centralise les valeurs autorisées, la compatibilité legacy (`table-style: bordered|borderless`), le parsing des commentaires, la détection des snippets table avec commentaires, la collecte des attributs depuis `currentDocContent`, et la reconstruction du préfixe canonique style → border → color. `parseAndFillSnippet` lit ces trois dimensions via `ldParseTableAttributesFromMarkdown()`, `buildSnippetMarkdown` réinjecte le préfixe via `ldBuildTableAttributesPrefix()`, et `_applyTableStyles(contentEl)` applique aux `<table>` du DOM les attributs collectés par `ldCollectTableAttributesFromSource()`. La ligne séparatrice doit contenir au moins un `-` sinon une ligne d'en-tête vide pleine d'espaces et de pipes serait confondue avec un séparateur. Aucune couleur neutre n'est émise : `striped` sans couleur se comporte visuellement comme l'ancien neutre, avec des rayures grises (`rgb(243 244 246)` en clair, `rgb(55 65 81)` en sombre). CSS dans `index.html` : palette de **CSS variables** (`--tbl-accent`, `--tbl-accent-soft`, `--tbl-accent-stripe`, `--tbl-accent-text`) déclinée par classe `table-color-X` en light + dark mode, où `--tbl-accent-soft` est la teinte de header plus soutenue et `--tbl-accent-stripe` la teinte de rayure plus claire. `table-style-compact` réduit densité et fonte ; `table-style-striped` consomme `--tbl-accent-stripe` avec fallback gris neutre ; en mode sans grille complète, les séparateurs horizontaux prennent `--tbl-accent-soft` et la ligne sous header prend `--tbl-accent` quand une couleur est sélectionnée ; `table-border-bordered` consomme `--tbl-accent` pour tracer la grille complète ; `table-border-borderless` reste reconnu pour les sources legacy explicites et conserve seulement les séparateurs horizontaux.
- `heading-1`, `heading-2`, `heading-3`, `heading-4` : quatre types distincts qui partagent un panel unique `snip-panel-heading` (un seul input `snip-heading-content`). `_SNIPPET_TYPE_TO_PANEL` mappe les 4 types vers le panel partagé dans `snippetTypeChanged`. Le niveau est porté par le type (suffixe `-N`), `parseAndFillSnippet` extrait le texte avec un regex `^#{N}\s+(.+)$`, `buildSnippetMarkdown` rebuild via `"#".repeat(level)`. La détection inline utilise `/(?:^|\n\n)(#{1,4} [^\n]+)/g` — un préfixe `\n\n` ou début de document est exigé pour éviter de matcher un caractère `#` dans une liste ou un autre contexte interne. L'aperçu Markdown est masqué. Les containers (`<details>`, colored-section) ont précédence : une heading à l'intérieur d'un container n'est pas détectée comme snippet séparé.

- `table` : la plage Markdown complète est parsée en grille. Les cellules vides sont préservées et ne sont pas confondues avec la ligne séparatrice. Au rendu viewer, `_fillEmptyTableCells(contentEl)` remplace les cellules `<th>` / `<td>` dont le texte trimé est vide par `\u00A0` afin de stabiliser l'affichage sans modifier le Markdown source ni le contenu réédité dans la grille.
- `code-block` : le langage de la fence est prérempli et le contenu du code est éditable dans un textarea monospace. Le regex de parsing utilise `[ \t]*` (whitespace horizontal seulement) après la fence d'ouverture pour éviter d'absorber un `\n` et donc d'attribuer la première ligne de contenu comme langage quand la fence n'a pas de langage explicite. Les fences indentés à l'intérieur d'une liste sont aussi reconnus : l'indentation canonique (espaces avant la fence d'ouverture) est capturée dans la plage source, retirée de chaque ligne dans le textarea, puis réappliquée à chaque ligne (fences incluses) lors de la sauvegarde, de sorte que le bloc reste imbriqué dans son item de liste.
- `blockquote` : les préfixes `>` sont retirés dans le textarea, puis réappliqués ligne par ligne à l'enregistrement, y compris sur les lignes vides.
- `unordered-list` : le textarea conserve désormais le Markdown à puces complet (`- ...`, `* ...` ou `+ ...`) au lieu de retirer les marqueurs. Cette représentation garde les lignes de continuation indentées (`  toto`) et les continuations paresseuses Markdown non indentées (`toto`) sans ambiguïté, et permet de préserver la structure réelle lors de l'édition. `src/frontend/snippet-list-markdown.js` centralise le Markdown par défaut, la détection simple, la regex de capture inline et la reconstruction de ce type. La plage source d'une liste à puces inclut les lignes indentées non marquées, les continuations paresseuses et les sous-items indentés afin qu'une liste contenant du texte de continuation soit éditée comme un bloc complet. Lors de la reconstruction, si le contenu contient déjà des marqueurs de puce, il est sauvegardé tel quel (hors lignes vides) ; sinon, le fallback historique reconstruit des `-` par indentation. En insertion inline ou textarea, le contenu par défaut inclut les marqueurs `-` pour refléter le nouveau contrat d'édition.
- `ordered-list` : le textarea conserve désormais le Markdown numéroté complet (`1. ...`, `2. ...`) au lieu de retirer les marqueurs numériques. Cette représentation garde les lignes de continuation indentées (`   toto`) et les continuations paresseuses Markdown non indentées (`toto`) sans ambiguïté, et permet de préserver la structure réelle lors de l'édition. `src/frontend/snippet-list-markdown.js` centralise le Markdown par défaut, la détection simple, la regex de capture inline et la reconstruction de ce type. La plage source d'une liste ordonnée inclut les sous-items indentés à puces (`   - ...`) et les continuations paresseuses afin qu'une liste `1.` / `2.` contenant une sous-liste non ordonnée ou du texte de continuation soit éditée comme un bloc complet. Lors de la reconstruction, si le contenu contient déjà des marqueurs numérotés, il est sauvegardé tel quel (hors lignes vides) ; sinon, le fallback historique régénère des compteurs par indentation. En insertion inline ou textarea, le contenu par défaut inclut les marqueurs numériques pour refléter le nouveau contrat d'édition.
- `tree` : l'éditeur d'arborescence existant reste utilisé ; son aperçu Markdown est masqué en inline.
- `colored-text` et `colored-section` : les champs couleur/contenu restent les éditeurs principaux ; l'aperçu Markdown est masqué.

L'aperçu Markdown reste utile pour les snippets simples en insertion, mais il est supprimé des modes inline où l'utilisateur travaille dans un mini éditeur déjà spécialisé.

### 5. Suppression confirmée du bloc source

Deux points d'entrée déclenchent la même modale `showConfirm()` en mode danger puis la même routine de suppression (slice de `currentDocContent` entre `range.start` et `range.end` + `saveCurrentDocumentContent`) :

- Le bouton `Supprimer le bloc` à l'intérieur de la modale d'édition inline (visible uniquement en mode `inline-edit`, à côté du bouton `Enregistrer`). Utilisé quand l'utilisateur est déjà entré en édition.
- Le bouton secondaire `Supprimer ...` dans la mini popup du clic droit (voir décision 1). Permet de retirer un snippet sans ouvrir la modale d'édition. La fonction `confirmAndDeleteInlineSnippetRange(range)` exposée sur `window` accepte directement la plage source. Les helpers `_confirmInlineSnippetDeletion()` et `_performInlineSnippetDeletion(start, end)` factorisent la confirmation et la suppression entre les deux flows.

Cette suppression est volontairement faite au niveau de la plage Markdown détectée, pas au niveau du DOM rendu, pour conserver le même contrat que l'édition inline : le viewer n'est qu'un point d'entrée, le Markdown reste la source de vérité.

### 6. Sauvegarde partagée du document

`src/frontend/documents.js` expose `saveCurrentDocumentContent(content)`, qui centralise le PUT `/api/documents/:id`, le rechargement du HTML rendu, la réapplication des décorations viewer, la mise à jour des compteurs de fichiers, du bouton `Valider` et de la jauge métadonnées.

Le mode édition classique appelle désormais ce helper, et l'édition inline l'utilise après avoir remplacé ou supprimé la plage source.

### 7. Internationalisation et tests

Les textes visibles ajoutés (`Edit inline` générique fallback, `Edit <type>` typés par snippet — `Edit table`, `Edit code block`, `Edit blockquote`, etc. dans les deux langues —, `Insert a snippet here`, titres de modales inline, bouton `Save`, bouton et confirmation de suppression, erreurs de sauvegarde/insertion/suppression, libellés des nouveaux textareas) sont déclarés dans `src/frontend/i18n/en.json` et `src/frontend/i18n/fr.json`. Le label spécifique au type est résolu par `_inlineEditAffordance(type)` dans `inline-snippet-edit.js`, qui retourne aussi une icône FontAwesome adaptée (`fa-table-cells`, `fa-code`, `fa-quote-right`, `fa-list-ol`, `fa-list-ul`, `fa-folder-tree`, `fa-fill-drip`, `fa-highlighter`, `fa-caret-right`, `fa-link`, `fa-file-lines`, `fa-anchor`, `fa-image`, `fa-minus`) — fallback `fa-pen-to-square` si le type n'est pas mappé.

La fixture `with-inline-snippets` et `tests/e2e/inline-snippet-edit.spec.ts` couvrent les cas de round-trip et de suppression pour : texte coloré, section colorée, table avec cellules vides, bloc de code, bloc de code sans langage (style requête CloudWatch Logs Insights), bloc de code indenté dans une liste numérotée, citation, liste à puces, liste numérotée, préremplissage des éditeurs de listes depuis le picker d'insertion inline, insertion inline d'un snippet depuis un titre non mappé du viewer, ainsi que le verrouillage de la selectbox en mode inline-edit et sa disponibilité en modes insertion et inline-insert.

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
- Le fallback de génération des listes ordonnées sans marqueurs explicites renumérote les items au lieu de préserver des numéros volontairement non séquentiels ; l'édition inline d'une liste existante conserve maintenant le Markdown numéroté original.
- Les snippets `diagram` et `attachment` ne sont pas proposés en édition inline, car ils déclenchent des workflows spécifiques (création de diagramme, picker de fichier) qui ne sont pas de simples remplacements de plage Markdown.
