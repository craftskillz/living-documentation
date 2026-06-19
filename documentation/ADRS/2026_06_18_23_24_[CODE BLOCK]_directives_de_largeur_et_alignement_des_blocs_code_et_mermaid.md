---
**date:** 2026-06-18
**status:** To be validated
**description:** Les fences Markdown acceptent des directives locales code-width/code-align ou mermaid-width/mermaid-align, appliquees au rendu et preservees par le panneau Snippets et l'edition inline.
**tags:** code-block, mermaid, code-width, code-align, mermaid-width, mermaid-align, codeBlockAttributes, wireContent, inlineSnippetEdit, SnippetsModal
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
