---
**date:** 2026-06-18
**status:** Completed
**description:** Ajout de directives de largeur et alignement distinctes pour les blocs de code et les diagrammes Mermaid, avec rendu, edition inline, documentation et tests.
**tags:** worklog, code-block, mermaid, code-width, code-align, mermaid-width, mermaid-align, snippets, viewer, playwright
---

# Current task

## Statut courant

Completed

## Tache realisee

Extension des directives de layout locales aux blocs fences : `code-width` / `code-align` pour le code classique et `mermaid-width` / `mermaid-align` pour les fences de langage `mermaid`.

## Decision d'implementation

Mermaid reste un snippet de type `code-block` avec le langage `mermaid`. Le panneau Code partage les controles largeur/alignement, mais le builder choisit automatiquement le prefixe `mermaid-*` ou `code-*` selon le langage.

## Implementation

- Nouveau module `codeBlockAttributes.ts` pour valider, parser, collecter et reconstruire les directives.
- Ratios `full`, `3/4`, `2/3`, `1/2`, `1/3`, `1/4`.
- Alignements `left`, `center`, `right`.
- Application au `<pre>` des blocs classiques et au conteneur `.mermaid` apres transformation.
- Conservation du scroll horizontal du code et du ratio du SVG Mermaid.
- Round-trip clic droit, y compris pour Mermaid et les fences indentes.
- Controles largeur/alignement dans le panneau Code, avec libelles FR/EN.
- Exclusion des blocs `:::compare` du mapping source-DOM principal.

## Documentation

- ADR `Directives de largeur et alignement des blocs code et Mermaid` cree et lie aux fichiers source.
- Guide `Styles, images et blocs de code` complete avec syntaxe et exemples.

## Verifications

- `npm run build` : OK. Le warning Vite historique sur le chunk superieur a 500 kB reste non bloquant.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts --grep "Mermaid layout comments|right-click on code block captures|indented code block"` : 3 tests passes.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts` : 39 tests passes.
- `git diff --check` : OK.
- Accuracy MCP de l'ADR : 1.0 sur 7 fichiers source.
