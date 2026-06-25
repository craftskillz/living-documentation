---
**date:** 2026-06-08
**status:** À valider
**description:** Rendu des blocs :::compare via un placeholder + remplacement post-parse au lieu d'injecter le HTML rendu avant marked.parse(), afin que les blocs de code internes contenant des lignes vides ne brisent plus le document.
**tags:** compare, marked, rendering, html-block, commonmark, preprocessCompareBlocks, renderMarkdownWithCompareBlocks, placeholder, documents, export
---

## Contexte

La directive `:::compare … :::` produit une vue côte à côte : une colonne source en Markdown brut et une colonne HTML rendu. L'implémentation d'origine (`preprocessCompareBlocks`) remplaçait chaque bloc `:::compare` par son `<div class="ld-compare">…<pre><code>…</code></pre>…</div>` entièrement rendu **à l'intérieur de la source Markdown**, puis exécutait `marked.parse()` sur l'ensemble du document.

Ceci est dangereux. Selon CommonMark, un bloc HTML est **terminé par la première ligne vide**. Lorsque l'échantillon de code interne contenait une ligne vide (par ex. une ligne vide entre une `interface` et une `async function` dans un exemple TypeScript), `marked` cessait de traiter le `<div>` injecté comme du HTML brut à cette ligne vide et re-parsait le reste du document en Markdown. Le résultat était une corruption en cascade : la colonne rendue était aplatie en texte de paragraphe, les titres suivants perdaient leur `<h2>`, et les blocs `:::compare` subséquents étaient émis sous forme de HTML brut.

Symptôme observé : un bloc compare JavaScript (sans ligne vide interne) s'affichait correctement, tandis qu'un bloc TypeScript avec une ligne vide interne cassait — et détruisait tout ce qui suivait.

## Décision

Remplacer `preprocessCompareBlocks` par `renderMarkdownWithCompareBlocks(source, markedOpts)` dans `src/lib/compareBlock.ts`, en utilisant une approche de placeholder en deux phases :

1. Chaque bloc `:::compare` est rendu séparément et stocké dans un tableau ; dans la source, il est remplacé par un placeholder de commentaire HTML autonome `<!--LD_COMPARE_BLOCK_N-->` (un bloc HTML d'une seule ligne sans ligne vide, transmis tel quel par `marked`).
2. Le document est parsé avec `marked.parse()`.
3. Les placeholders sont réinjectés avec les `<div>` de compare rendus **après** le parsing (en tolérant un wrapper `<p>…</p>` que marked peut ajouter).

Parce que le HTML rendu — y compris toute ligne vide à l'intérieur de `<pre><code>` — ne se trouve jamais dans la source pendant le parsing externe, il ne peut plus terminer un bloc HTML ni perturber le reste du document.

Les trois sites d'appel ont été migrés de `marked.parse(preprocessCompareBlocks(...))` vers `renderMarkdownWithCompareBlocks(...)` : deux dans `src/routes/documents.ts` et un dans `src/routes/export.ts`. Les imports `marked` désormais inutilisés dans ces deux fichiers de route ont été supprimés.

## Conséquences

### AVANTAGES

- Les blocs `:::compare` avec des lignes vides internes (le cas courant pour de vrais échantillons de code) s'affichent correctement.
- La corruption est entièrement contenue : un bloc compare malformé ou cas-limite ne peut plus se propager en cascade dans le reste du document.
- Source unique de vérité : la logique de rendu réside dans une seule fonction réutilisée par l'API document et l'export HTML.
- Couvert par un test de régression (`tests/unit/compare-block.spec.ts`), incluant le cas de la ligne vide.

### INCONVÉNIENTS

- Le chemin de rendu est désormais en deux passes (remplacer → parser → remplacer), marginalement plus de travail que la passe inline unique. Négligeable pour des entrées de la taille d'un document.
- Le token placeholder `LD_COMPARE_BLOCK_N` est un marqueur interne réservé ; un contenu rédigé contenant ce commentaire exact serait mal interprété (extrêmement improbable, acceptable pour un outil de documentation local).