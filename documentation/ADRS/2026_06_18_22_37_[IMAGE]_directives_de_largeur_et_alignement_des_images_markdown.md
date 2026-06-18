---
**date:** 2026-06-18
**status:** To be validated
**description:** Les images Markdown acceptent des directives HTML `image-width` et `image-align` immediatement en prefixe, appliquees au viewer et preservees par l'insertion et l'edition inline des snippets.
**tags:** image, markdown, image-width, image-align, comment-directive, wireContent, imageAttributes, inlineSnippetEdit, SnippetsModal, playwright
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
