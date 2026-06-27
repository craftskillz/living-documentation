---
`🗄️ ADR : 2026_04_08_13_00_[EDITOR]_markdown_snippet_inserter_with_detection.md`
**date:** 2026-04-08
**status:** Acceptée
**description:** Ajout d'un bouton 🧩 Snippets en mode édition qui ouvre une modale pour insérer des constructions Markdown préfabriquées à la position du curseur, avec détection automatique et pré-remplissage lorsqu'un snippet existant est sélectionné dans l'éditeur.
**tags:** éditeur, snippet, modale, markdown, table, arbre, détection, frontend, édition-en-ligne, presse-papier
---

## Contexte

L'éditeur en ligne (`<textarea>`) n'accepte que du Markdown brut. Les constructions avancées comme les blocs repliables `<details>`, les tableaux alignés, les diagrammes en arborescence ASCII ou les liens d'ancrage inter-documents nécessitent une syntaxe précise que la plupart des utilisateurs ne connaissent pas par cœur. Il n'existait aucun moyen guidé d'insérer ces motifs ni de les modifier une fois écrits.

## Décision

Un bouton **🧩 Snippets** est ajouté entre les boutons Cancel et Save en mode édition. Cliquer dessus ouvre une modale avec :

- Un `<select>` pour 13 types de snippets :
  - **Simple** (sans éditeur) : bloc repliable (`<details>`/`<summary>`), lien, lien vers un document, lien d'ancrage, lien d'ancrage dans un autre document, liste numérotée (3 niveaux), liste à puces (3 niveaux), bloc de code, citation, séparateur horizontal, image
  - **Complexe** (éditeur dédié) :
    - **Table** , grille dynamique avec contrôles `+`/`−` de lignes/colonnes ; génère un tableau Markdown aligné en largeur
    - **Tree** , liste d'éléments avec contrôles d'indentation `←`/`→` ; génère un bloc de code `text` avec connecteurs `├──` / `└──` / `│` à tous les niveaux d'imbrication
- Un **aperçu Markdown en direct** mis à jour à chaque modification de champ
- Un bouton **Insert** qui insère le texte généré à la position sauvegardée du curseur, en remplaçant toute sélection existante

**Mode détection** : si du texte est sélectionné dans l'éditeur avant l'ouverture de la modale, `detectSnippetType()` exécute une série de tests regex pour identifier le type. En cas de succès :

- Le `<select>` est positionné sur le type détecté
- `parseAndFillSnippet()` extrait les valeurs du Markdown brut et pré-remplit tous les champs
- Une bannière d'information verte confirme la détection
  En cas d'échec (sélection non reconnue), un avertissement orange s'affiche et la modale revient par défaut sur « collapsible » ; le snippet remplacera tout de même la sélection lors de l'insertion.

La position du curseur (`selectionStart` / `selectionEnd`) est sauvegardée à l'ouverture de la modale afin que l'insertion soit déterministe, quels que soient les changements de focus à l'intérieur de la modale.

Pour les liens document/ancrage-doc, le `<select>` est peuplé depuis `allDocs` (déjà en mémoire), sans appel API supplémentaire.

## Conséquences

### AVANTAGES

- Les utilisateurs peuvent insérer n'importe quelle construction Markdown complexe sans connaître la syntaxe
- Édition aller-retour : sélectionner un snippet, ouvrir la modale, ajuster les champs, réinsérer — le flux de travail est cohérent
- Les éditeurs de table et d'arbre éliminent les tâches de formatage manuel les plus sujettes aux erreurs
- La détection couvre les 13 types via regex ; l'ajout de nouveaux types ne nécessite que l'extension de `detectSnippetType` et `parseAndFillSnippet`
- Aucune modification backend, purement frontend

### INCONVÉNIENTS

- La section script de `index.html` s'agrandit significativement (≈ 250 lignes ajoutées)
- La détection est basée sur des regex et ne peut pas gérer les snippets malformés ou modifiés manuellement qui s'écartent du format canonique
- L'éditeur de table ré-affiche la grille entière à chaque clic `+`/`−` (acceptable pour les petits tableaux, mais non optimisé pour les grands)