---
**date:** 2026-06-18
**status:** Completed
**description:** Ajout de directives Markdown par commentaires pour controler la largeur relative et l'alignement horizontal des images dans le viewer Home et le snippet Image.
**tags:** worklog, image, markdown, image-width, image-align, snippets, viewer, svelte5, playwright, documentation
---

# Current task

## Statut courant

Completed

## Tache courante

Etendre le principe de commentaires HTML des tableaux et callouts aux images Markdown afin de choisir une largeur relative et un alignement horizontal, avec rendu Home, insertion et edition inline coherents.

## Fonctionnalite livree

Deux directives facultatives et independantes sont reconnues immediatement avant une image :

```markdown
<!-- image-width: 1/2 -->
<!-- image-align: center -->
![Schema](/images/schema.png)
```

Valeurs supportees :

- largeur : `full`, `3/4`, `2/3`, `1/2`, `1/3`, `1/4` ;
- alignement : `left`, `center`, `right`.

Sans directive, le rendu existant est conserve. L'alignement local surcharge l'option globale Admin `imageCentered` uniquement pour l'image cible.

## Implementation

- Nouveau module `imageAttributes.ts` : validation, parsing, collecte source, prefixe canonique et mapping ratio → classe CSS.
- `wireContent.ts` applique les classes et attributs `data-image-width` / `data-image-align` aux images rendues.
- `inlineSnippetEdit.ts` capture les commentaires avec l'image pour le round-trip d'edition au clic droit.
- Builders, parsers et detection des snippets Image etendus.
- Deux selects Largeur/Alignement ajoutes au panneau Image avec traductions EN/FR.
- CSS responsive avec hauteur automatique, largeur maximale 100 % et alignement local prioritaire.
- Fixture et tests E2E ajoutes pour le rendu, l'edition inline et l'insertion.

## Documentation

- ADR `[IMAGE] directives de largeur et alignement des images markdown` cree via MCP.
- 9 fichiers source/tests attaches ; accuracy MCP = 1.
- Guide `Styles, images et blocs de code` corrige et complete ; les options obsoletes ont ete retirees.
- 4 fichiers source attaches au guide ; accuracy MCP = 1.

## Verifications realisees

- `npm run build` : OK.
- Validation JSON des catalogues i18n : OK.
- Tests cibles image : 2/2 OK.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts --project=chromium` : 37/37 OK.
- `git diff --check` : OK.

## Note de coexistence

Le document `documentation/2026_05_20_13_28_[CONFERENCE]_test.md` a recu pendant la tache les directives `image-width: full` et `image-align: center`. Cette modification a ete preservee comme verification/contenu utilisateur et n'a pas ete remplacee.

## Prochaine action recommandee

Valider visuellement dans Home les ratios souhaites sur une image reelle, puis accepter l'ADR si le contrat de commentaires convient.
