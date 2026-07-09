---
type: Document
title: Stabilisation De La Suite E2e Playwright Apres Migration Svelte Ancrage De Test Et Regressions
description: Reparation des 49 tests e2e casses par la migration Svelte via une convention d'ancrage `data-testid` + ids fonctionnels reutilises, une surface de test `window.openSnippetsModal*`, des attentes de montage anti-race CI, l'acceptation d'un comportement liste source-fidele, et la correction de 6 vraies regressions de parsing/rendu.
tags:
  - playwright
  - e2e
  - data-testid
  - svelte5
  - window-hooks
  - ci-race
  - table-attributes
  - confirm-dialog
  - regression
  - getByTestId
timestamp: 2026-06-03T23:19:00Z
status: To be validated
---

## Contexte

La migration du frontend vers une application Svelte unifiee (voir l'ADR migration du 2026-06-03) a casse l'integralite de la suite e2e : sur 54 tests, **49 echouaient** car ils ciblaient le DOM de l'ancien front vanilla , ids `#category-tree`, `#doc-title`, `#mcpToolList`, attributs `[data-i18n]`, globals `window.openSnippetsModal*` , tous disparus du markup Svelte. Les 17 tests API et 2 unit, eux, restaient verts (port libre dynamique, routes inchangees), ce qui a confirme que seule la couche UI etait touchee.

La reparation a aussi revele que certains echecs n'etaient **pas** du simple drift de selecteur mais de **vraies regressions de comportement** introduites par le portage.

## Decision

### Convention d'ancrage des tests UI

- **`data-testid`** est la convention d'ancrage par defaut pour les nouveaux points de test (sidebar, viewer, modales metadata/confirm, explorateur MCP, panneaux AI Context). Robuste aux refactors CSS/markup.
- **Les `id` fonctionnels existants sont reutilises** la ou ils sont _load-bearing_ : la modale `SnippetsModal` fait `document.getElementById("snip-*")` dans sa propre logique, donc ses ids sont conserves et cibles via `#id` plutot que convertis en `data-testid`.
- Resultat : convention mixte assumee , `data-testid` pour les nouveaux ancrages, `#id` la ou l'app en depend deja.

### Surface de test programmatique

L'ancien front exposait `window.openSnippetsModal()` et `window.openSnippetsModalForInlineInsert(pos)` comme surface d'automatisation. Ces hooks sont **re-exposes** depuis `DocViewer.svelte` dans un `onMount` (et retires au demontage), pilotant l'etat Svelte de la modale. Ce n'est pas une regression produit mais une surface de test deliberee.

### Attentes de montage , race CI deterministe

Les tests qui appellent un hook `window.*` ou accedent au DOM via `page.evaluate` **immediatement apres `page.goto`** echouaient en CI (runner lent) mais passaient en local (machine rapide) : la SPA Svelte n'avait pas fini de monter `DocViewer`, donc `onMount` n'avait pas pose les hooks. Correctif systematique : intercaler `await expect(page.locator('#doc-content')).toBeVisible()` entre le `goto` et le `evaluate`. `#doc-content` visible garantit que `DocViewer` est monte (hooks poses, DOM rendu).

### Comportement liste source-fidele (changement assume)

L'ancien viewer re-serialisait les listes depuis le DOM rendu, normalisant certaines continuations. Le port Svelte **preserve fidelement l'indentation source** (ce que tu vois dans l'editeur = ce qui est dans le fichier). C'est une amelioration, pas un bug : les 2 attentes de test concernees ont ete alignees sur la sortie fidele.

## Vraies regressions corrigees (cote produit)

| Regression                                        | Fichier                                | Cause                                                                                       |
| ------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| Separateur de table `--:` rejete                  | `tableAttributes.ts`                   | `isMarkdownTableSeparatorLine` exigeait `-{3,}` au lieu de `:?-+:?` (GFM autorise 1+ tiret) |
| Ligne blanche entre commentaires et table ignoree | `tableAttributes.ts`                   | `PREFIX` exigeait les commentaires colles (`\n` -> `\n+`)                                   |
| Indent code-block en liste non strippe            | `SnippetsModal.svelte`                 | `inlineIndent: ""` code en dur au lieu de la variable `range.indent`                        |
| `ConfirmDialog` sans `id`/`detail`                | `ConfirmDialog.svelte`                 | Le port avait perdu les ids et fusionne le callout ambre dans le message                    |
| Bouton "retour picker" visible en inline-edit     | `SnippetsModal.svelte`                 | `showSnippetPanelOnly()` retirait toujours `hidden` du back                                 |
| Lien diagramme `/images/` absolu                  | `SnippetsModal.svelte` + `builders.ts` | Incoherent avec la convention `./images/` des snippets image                                |

## Consequences

- **211 tests verts** en local et en CI (apres ajout des attentes de montage).
- `config.spec.ts` (tests purement API) a ete deplace de `tests/e2e/` vers `tests/api/`.
- Les hooks `window.*` restent une surface de test exposee en production (cout : 2 globals sur `window`).
- La convention mixte `data-testid` + `#id` doit etre gardee a l'esprit : ne pas retirer les `id` load-bearing de `SnippetsModal`.
- L'ADR migration peut etre promu "Accepted" une fois cette suite validee en usage reel.
