---
type: ADR
title: Directives De Largeur Et Alignement Des Images Markdown
description: Les images Markdown acceptent des directives HTML `image-width` et `image-align` immediatement en prefixe, appliquees au viewer et preservees par l'insertion et l'edition inline des snippets.
tags:
  - image
  - markdown
  - image-width
  - image-align
  - comment-directive
  - wireContent
  - imageAttributes
  - inlineSnippetEdit
  - SnippetsModal
  - playwright
timestamp: 2026-06-18T22:37:00Z
status: To be validated
sources:
  - path: src/frontend-svelte/src/lib/home/imageAttributes.ts
    hash: 739269360b62dea053592957a20acb88a6ed70cae02d7f7b687ff635bf288c5a
  - path: src/frontend-svelte/src/lib/home/wireContent.ts
    hash: 7b567ef3276b528e4bc2bf11144e44c69dfec70c556f75e05d5911afaf6999e0
  - path: src/frontend-svelte/src/lib/home/inlineSnippetEdit.ts
    hash: ef790a393cc5749e0f295e5bdd48bf361e203e62a7d44292087f3070e1355d73
  - path: src/frontend-svelte/src/lib/home/SnippetsModal.svelte
    hash: b203ae69ee2394a4a9044ffd511621f3b8c77a192f9c2bfe3a1b9987f99e3a66
  - path: src/frontend-svelte/src/lib/home/snippets/builders.ts
    hash: 18010bad31e544645239b53e90ac34e395589fe455293604ee410ff7853724ac
  - path: src/frontend-svelte/src/lib/home/snippets/parsers.ts
    hash: 7dbea0ec90862052029571e5d3da59030f6e890b1a2546e49ded01454c550369
  - path: src/frontend-svelte/src/lib/home/home.css
    hash: a5c19bf37fffc52cb2a5f1c1d3ac73d263928e17b302df060ec0dc7c2c5e317e
  - path: tests/e2e/inline-snippet-edit.spec.ts
    hash: ba92114dc514ad28d8e3d28f3406e0b525c8d2826676335f929ac9ba5aef5ac9
  - path: src/frontend-svelte/src/lib/home/snippets/detect.ts
    hash: 9300539386aef77e3d7d9bd9075235f94ee7188dc2d1f17249f30a14f48a264c
---

# Directives de largeur et alignement des images Markdown

## Contexte

Les images Markdown rendues dans Home utilisaient uniquement les options globales Admin : coins arrondis, centrage et bordure. Il n'etait pas possible de reduire une image particuliere a une moitie ou un tiers de la largeur, ni de l'aligner differemment, sans remplacer le Markdown standard par une balise HTML avec style inline.

Les tableaux et callouts utilisent deja des commentaires HTML places juste avant le bloc pour porter des attributs de rendu sans casser la compatibilite Markdown.

## Decision

Etendre ce principe aux images avec deux directives facultatives et independantes :

```markdown
<!-- image-width: 1/2 -->
<!-- image-align: center -->
![Schema](/images/schema.png)
```

### Valeurs supportees

- `image-width` : `full`, `3/4`, `2/3`, `1/2`, `1/3`, `1/4` ;
- `image-align` : `left`, `center`, `right`.

L'absence d'une directive conserve le comportement existant pour la dimension concernee. Les commentaires sont reconstruits dans l'ordre canonique largeur puis alignement.

`imageAttributes.ts` centralise la validation, le parsing, la collecte source dans l'ordre du document, la reconstruction du prefixe et la conversion des ratios vers des classes CSS stables. Les blocs de code et blocs `:::compare` sont ignores pendant la collecte pour ne pas traiter leurs exemples litteraux comme de vraies images.

`wireContent.ts` associe les attributs collectes aux `<img>` rendues et pose des classes et attributs `data-image-*`. Les classes d'alignement utilisent des marges suffisamment specifiques pour surcharger localement l'option globale `imageCentered` sans affecter les autres images.

Le panneau Image de `SnippetsModal` expose deux selects. Le builder emet les commentaires, le parser les recharge et `inlineSnippetEdit` capture le prefixe avec l'image afin que l'edition au clic droit effectue un round-trip complet.

## Consequences

- La syntaxe Markdown de l'image reste standard et lisible hors de Living Documentation ; les commentaires sont ignores par les autres renderers.
- La largeur est relative au conteneur de texte et reste bornee a 100 %, avec hauteur automatique.
- Une directive locale d'alignement prend priorite sur le centrage global Admin.
- Les valeurs inconnues sont ignorees et ne produisent aucune classe arbitraire.
- Les images sans directives ne changent pas de rendu.
