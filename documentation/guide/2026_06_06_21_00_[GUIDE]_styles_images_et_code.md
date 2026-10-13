---
type: Document
title: Styles Images Et Code
sources:
  - path: src/frontend-svelte/src/lib/home/imageAttributes.ts
    hash: 739269360b62dea053592957a20acb88a6ed70cae02d7f7b687ff635bf288c5a
  - path: src/frontend-svelte/src/lib/home/DocViewer.svelte
    hash: 929ae87838a148b00d469e3dee35c7e4e6fd6f66071f4cd8451f986f2db2a129
  - path: src/frontend-svelte/src/routes/Admin.svelte
    hash: 265e8e7c2a026e8f30ff5d0529abf9cfd62f6f0abeec8453e7c5bb1f97a14640
  - path: src/lib/config.ts
    hash: 034aa32d6fbb232e998017b8c58d5d11db117d4ee1efa4d27326e37751694df3
  - path: src/frontend-svelte/src/lib/home/codeBlockAttributes.ts
    hash: bb126331426517bd2b9fa7ce3d6fb5417d29d2acfa9e6a92b82b710e73efafd0
  - path: src/frontend-svelte/src/lib/home/wireContent.ts
    hash: 58265311658d0ee77c77bd555aed9f1ddb713061f1b32716f4573ce25901ade2
  - path: src/frontend-svelte/src/lib/home/SnippetsModal.svelte
    hash: df8cf85fc589732dce2af6f96116dc035efad709bd3cc2b65d9809011e4560c7
---

# Styles, images et blocs de code

L'apparence generale des images et des blocs de code est configurable depuis le panneau Admin. Une image, un bloc de code ou un diagramme Mermaid peut aussi surcharger localement sa largeur et son alignement avec des commentaires places juste au-dessus.

## Options globales dans Admin

Dans **Admin → Apparence**, les options disponibles sont :

| Option | Defaut | Effet |
| --- | --- | --- |
| Coins arrondis | active | Arrondit toutes les images du viewer |
| Centrage | active | Centre toutes les images par defaut |
| Bordure | active | Ajoute une bordure et une ombre legeres |
| Theme clair des blocs de code | desactive | Utilise le theme highlight.js clair en mode clair |
| Hauteur max des blocs de code | `400px` | Ajoute un controle afficher plus/moins au-dela de cette hauteur |

Ces options sont stockees dans `.living-doc.json` sous `imageRoundedCorners`, `imageCentered`, `imageBorder`, `codeBlockLightTheme` et `codeBlockMaxHeight`.

## Image Markdown standard

```markdown
![Schema d'architecture](./images/schema-architecture.png)
```

Sans directive locale, l'image utilise sa largeur naturelle jusqu'a la largeur maximale du document et les options globales actives.

## Choisir la largeur d'une image

Ajouter `image-width` immediatement avant l'image :

```markdown
<!-- image-width: 1/2 -->
![Schema d'architecture](./images/schema-architecture.png)
```

Valeurs disponibles pour les images, le code et Mermaid :

| Valeur | Largeur |
| --- | ---: |
| `full` | 100 % |
| `3/4` | 75 % |
| `2/3` | 66,67 % |
| `1/2` | 50 % |
| `1/3` | 33,33 % |
| `1/4` | 25 % |

La hauteur reste automatique afin de conserver les proportions de l'image.

## Aligner une image

Ajouter `image-align` avec `left`, `center` ou `right` :

```markdown
<!-- image-align: right -->
![Schema d'architecture](./images/schema-architecture.png)
```

Cette directive locale prend priorite sur l'option globale de centrage.

## Combiner largeur et alignement d'une image

Les deux directives sont independantes et peuvent etre combinees :

```markdown
<!-- image-width: 1/3 -->
<!-- image-align: center -->
![Schema d'architecture](./images/schema-architecture.png)
```

L'ordre canonique produit par l'editeur est largeur puis alignement. Les controles correspondants sont aussi disponibles dans **Snippets → Image** et lors de l'edition inline d'une image par clic droit.

## Image cliquable

Une image peut etre enveloppee dans un lien pour ouvrir sa cible :

```markdown
[![Schema d'architecture](./images/schema-architecture.png)](./images/schema-architecture.png)
```

## Blocs de code

Les blocs fences utilisent highlight.js et proposent un bouton de copie. Quand leur hauteur depasse `codeBlockMaxHeight`, un controle permet de les developper et de les reduire.

````markdown
```typescript
const message = "Bonjour";
```
````

Le theme clair ne s'applique qu'en mode clair ; le mode sombre conserve le theme de code sombre.

### Largeur et alignement d'un bloc de code

Ajouter `code-width` et/ou `code-align` immediatement avant le fence :

````markdown
<!-- code-width: 1/2 -->
<!-- code-align: right -->
```typescript
const message = "Bonjour";
```
````

Les alignements disponibles sont `left`, `center` et `right`. L'absence d'une directive conserve le comportement par defaut pour la dimension concernee.

Les controles sont disponibles dans **Snippets → Bloc de code** et lors de l'edition inline par clic droit.

## Diagrammes Mermaid

Un fence dont le langage est `mermaid` utilise les directives distinctes `mermaid-width` et `mermaid-align` :

````markdown
<!-- mermaid-width: 2/3 -->
<!-- mermaid-align: center -->
```mermaid
flowchart LR
  A[Debut] --> B[Fin]
```
````

Le SVG occupe la largeur choisie tout en conservant son ratio. Le meme panneau de snippet est utilise : quand le langage vaut `mermaid`, les commentaires `mermaid-*` sont produits automatiquement.
