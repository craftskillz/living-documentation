---
type: ADR
title: Rendu Markdown dans les titres des blocs repliables
description: Un moteur partagé interprète le Markdown inline et les titres ATX dans les balises summary pour les documents, les comparaisons, les exports HTML et les aperçus de templates.
tags:
  - markdown
  - summary
  - details
  - marked
  - renderMarkdownWithSummaries
  - renderMarkdownWithCompareBlocks
  - templates
  - rendering
status: To be validated
sources:
  - path: src/lib/summaryMarkdown.ts
    hash: 4878982820817a9e0709360bbf2f44c487b8fc39787780b54858c679b28c5682
    commit: 4a9ab65aed70c95af497062f35af72beb1048b0c
    dirty: false
  - path: src/lib/compareBlock.ts
    hash: 5b7af8de73b67d1e8944bf747e9398fa7354be76d970b109be52425846983811
    commit: fd42a3e6a9c96e535a0fcc690c8959113b16a15d
    dirty: false
  - path: src/frontend-svelte/src/lib/templates/MarkdownPreview.svelte
    hash: 54564f53f1bcf0a161efc962068c40bb3e374bfe6c6a8e2d0a3c927b582cdd0b
    commit: 7e784bc3d616778f168517d800dbc2b99f2a5962
    dirty: false
  - path: tests/unit/summary-markdown.test.ts
    hash: a232c793d1d7503820a1e99d2de3807a5fc7afcd6ac3d520e6c4d258d0fee690
    commit: 2c3618c1bc9035fc577d314bda7cedf0dd53c103
    dirty: false
---

# Rendu Markdown dans les titres des blocs repliables

## Contexte

Le snippet « Bloc repliable » produit des balises HTML `<details>` et `<summary>`. Le rendu Markdown habituel laisse leur titre en HTML brut : `<summary># Slide 0 > 30</summary>` affichait le caractère `#` au lieu d'un titre. Les auteurs souhaitent utiliser la même syntaxe de mise en forme que dans le reste du document.

Décision implémentée dans le commit `c1d2a1e117c1b595282c866361c746aa72dd66c9` du 23 septembre 2026 ; rétrodocumentation le 24 septembre 2026.

## Décision

Centraliser cette extension dans `renderMarkdownWithSummaries` (`src/lib/summaryMarkdown.ts`), partagé entre serveur et frontend. Le Markdown source enregistré reste inchangé.

Le moteur utilise le lexer de `marked`, parcourt ses tokens HTML avec `walkTokens`, transforme le contenu des balises `summary`, puis appelle le parser. Cette étape ciblée évite un remplacement global sur le Markdown brut qui modifierait aussi les exemples de code.

- Les libellés ordinaires passent par `marked.parseInline` : gras, italique, liens et code inline sont interprétés ; le HTML existant reste accepté.
- Un titre ATX sur une seule ligne, de `#` à `######` suivi d'un espace ou d'une tabulation (ou vide), devient un élément `h1` à `h6`. Son contenu est rendu en Markdown inline et les dièses de fermeture optionnels sont retirés.
- Le titre reçoit `style="display: inline; margin: 0"` pour rester dans la ligne du résumé et conserver l'interaction native du bloc repliable.
- Les attributs et la casse des balises sont conservés. `#tag` sans espace reste un libellé ordinaire.
- Les options explicites sont fusionnées avec `marked.defaults`, afin de préserver notamment les tableaux GFM. L'option `breaks` est transmise au rendu inline.

Exemple :

```html
<summary># Slide **0** > 30</summary>
```

devient :

```html
<summary><h1 style="display: inline; margin: 0">Slide <strong>0</strong> &gt; 30</h1></summary>
```

## Intégration et compatibilité

`renderMarkdownWithCompareBlocks` appelle ce moteur pour le document principal et le contenu rendu de chaque bloc `:::compare`. La colonne source reste littérale. Les routes de lecture des documents et d'export HTML utilisent déjà ce pipeline et bénéficient donc de l'extension.

`MarkdownPreview.svelte` utilise directement le même moteur après retrait du frontmatter, en conservant son iframe sandboxée et sa politique CSP.

Les exemples en code Markdown, les commentaires HTML, les attributs contenant du texte ressemblant à une balise et les régions littérales `pre`, `code`, `script`, `style`, `textarea` ne doivent pas être réécrits. Les blocs repliables imbriqués et les résumés multiples restent pris en charge.

## Conséquences et limites

Le comportement est partagé sans nouvelle dépendance ni migration des documents. Il s'agit d'une extension propre au viewer : un autre moteur Markdown peut continuer à afficher les marqueurs littéralement.

Le résumé accepte du Markdown inline et le cas particulier des titres ATX ; il ne devient pas un conteneur de blocs Markdown arbitraires (listes, tableaux ou paragraphes multiples). Le scanner HTML ciblé n'est pas un parseur DOM général ni un mécanisme de sanitisation. Le contrat de confiance du HTML existant n'est pas modifié.

## Vérification

Six tests unitaires dans `tests/unit/summary-markdown.test.ts` couvrent les options GFM, les six niveaux de titres, la mise en forme et les échappements, la préservation des exemples et régions littérales, les blocs imbriqués avec retours à la ligne et les comparaisons.

Le scénario `tests/api/summary-markdown.spec.ts` sauvegarde puis relit un document via le vrai serveur, vérifie le HTML dans Chromium et l'ouverture/fermeture au clic sur le titre, ainsi que la préservation du code d'exemple.

Pour cette passe documentaire : relecture du code et des tests existants ; tests et build non relancés, aucun code modifié.

## Décisions liées

Cette décision complète les ADR suivants, sans les remplacer : leurs contrats d'insertion, de configuration des retours à la ligne et de gestion des templates restent valides.

- [Markdown Snippet Inserter With Detection](?doc=ADRS%252F2026_04_08_13_00_%255BEDITOR%255D_markdown_snippet_inserter_with_detection)
- [Configurable Markdown Newline Handling Commonmark Vs Gfm Breaks](?doc=ADRS%252F2026_04_23_%255BRENDERING%255D_configurable_markdown_newline_handling_commonmark_vs_gfm_breaks)
- [Templates Markdown Classes Par Dossier](?doc=ADRS%252F2026_09_16_23_36_%255BFRONTEND%255D_templates_markdown_classes_par_dossier)
