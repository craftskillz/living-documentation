---
type: ADR
title: Directives De Largeur Et Alignement Des Blocs Code Et Mermaid
description: Les fences Markdown acceptent des directives locales code-width/code-align ou mermaid-width/mermaid-align, appliquees au rendu et preservees par le panneau Snippets et l'edition inline.
tags:
  - code-block
  - mermaid
  - code-width
  - code-align
  - mermaid-width
  - mermaid-align
  - codeBlockAttributes
  - wireContent
  - inlineSnippetEdit
  - SnippetsModal
timestamp: 2026-06-18T23:24:00Z
status: To be validated
sources:
  - path: src/frontend-svelte/src/lib/home/codeBlockAttributes.ts
    hash: bb126331426517bd2b9fa7ce3d6fb5417d29d2acfa9e6a92b82b710e73efafd0
  - path: src/frontend-svelte/src/lib/home/wireContent.ts
    hash: 58265311658d0ee77c77bd555aed9f1ddb713061f1b32716f4573ce25901ade2
  - path: src/frontend-svelte/src/lib/home/inlineSnippetEdit.ts
    hash: 634a6070c707eb00a603421a4e668965e2128f7ab2acd47dda74518aa6ecb9ef
  - path: src/frontend-svelte/src/lib/home/snippets/builders.ts
    hash: d95de66cff90ad4f26b322b5378297febd447f12928fd4903e922903e5cf0152
  - path: src/frontend-svelte/src/lib/home/snippets/parsers.ts
    hash: f393e13c0b121c1e1478f06cc0721760a4491111ebb78e19a4fdd983c9026498
  - path: src/frontend-svelte/src/lib/home/SnippetsModal.svelte
    hash: df8cf85fc589732dce2af6f96116dc035efad709bd3cc2b65d9809011e4560c7
  - path: src/frontend-svelte/src/lib/home/home.css
    hash: a4f90a91cef6eadaed86b3bffa45f4a796804611290a4d690326a5c7f44fa4f4
---

# Directives de largeur et alignement des blocs code et Mermaid

## Contexte

Les images disposent de directives HTML locales pour choisir leur largeur et leur alignement sans abandonner la syntaxe Markdown standard. Les blocs de code et les diagrammes Mermaid restaient toujours dimensionnes selon leur conteneur, alors que les utilisateurs ont les memes besoins de composition visuelle.

Mermaid est saisi comme un fence de langage `mermaid`, puis transforme en conteneur `.mermaid` avant son rendu SVG. Il reste donc pertinent de conserver un seul type de snippet `code-block`, tout en distinguant explicitement les directives de rendu.

## Decision

Deux familles de commentaires facultatifs sont reconnues immediatement avant un fence :

````markdown
<!-- code-width: 1/2 -->
<!-- code-align: right -->
```javascript
console.log("Bonjour");
```
````

et :

````markdown
<!-- mermaid-width: 2/3 -->
<!-- mermaid-align: center -->
```mermaid
flowchart LR
  A --> B
```
````

Les valeurs de largeur autorisees sont `full`, `3/4`, `2/3`, `1/2`, `1/3` et `1/4`. Les alignements autorises sont `left`, `center` et `right`. Une valeur inconnue est ignoree.

`codeBlockAttributes.ts` centralise la detection du langage, la validation, le parsing, la collecte source, la reconstruction canonique du prefixe et les classes CSS. La famille `mermaid-*` n'est acceptee que pour un fence dont le langage est `mermaid`; tous les autres fences utilisent `code-*`.

Dans `wireContent.ts`, les attributs sont appliques au `<pre>` d'un bloc classique. Pour Mermaid, ils sont appliques au conteneur `.mermaid` cree avant l'execution du renderer; le SVG est ensuite contraint a la largeur de ce conteneur avec une hauteur automatique. Les blocs inclus dans `:::compare` sont exclus du mapping principal pour ne pas decaler l'association source-DOM.

Le panneau Code de `SnippetsModal` expose les controles largeur et alignement. Le builder choisit automatiquement la famille de commentaires selon le langage. Le parser et `inlineSnippetEdit` incluent les commentaires dans la plage source, y compris pour les fences indentes, afin d'assurer un round-trip complet par clic droit. Un diagramme Mermaid rendu est aussi une cible d'edition inline du type `code-block`.

## Consequences

- Les documents restent compatibles avec les renderers Markdown qui ignorent les commentaires HTML.
- Les blocs sans directives conservent leur rendu precedent.
- Le scroll horizontal des blocs de code reste porte par le `<pre>` dimensionne.
- Les diagrammes Mermaid conservent leur ratio lors du redimensionnement.
- Mermaid ne cree pas un second type de snippet et reutilise le workflow existant des fences.
- L'ordre canonique reconstruit est largeur puis alignement.
