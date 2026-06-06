---
**date:** 2026-06-06
**status:** To be validated
**description:** Un panneau TOC sticky et redimensionnable s'ouvre via un bouton fa-list-ul dans le header du viewer; les headings sont extraits après wireDocContent et les clics ouvrent les details fermés avant de scroller avec compensation de hauteur du header sticky.
**tags:** TOC, table-of-contents, DocViewer, sidebar, resizable, sticky, details, scroll, localStorage, headings, wireDocContent
---

## Contexte

Les documents longs n'avaient pas de navigation interne. Astro/Starlight propose une TOC fixe sur la droite. L'objectif était d'avoir le même principe mais opt-in (toggle) plutôt que toujours visible.

## Décision

### Structure

Le header `<header id="home-doc-header">` est sorti de l'`<article>` et placé comme frère du conteneur flex `<div class="flex">`. Cela permet au header d'être toujours pleine largeur (`#home-content-area`), quelle que soit la largeur de la TOC.

Le layout devient :
```
<header sticky full-width>
<div class="flex">
  <article flex-1>contenu</article>
  <div cursor-col-resize>  ← handle resize
  <aside ld-toc-aside sticky>TOC</aside>
</div>
```

### Extraction des headings

L'extraction est faite à la fin de l'effet `wireDocContent` existant (pas dans un `$effect` séparé), pour garantir que les `h1-h6` ont leurs `id` posés avant la lecture. Les headings sans `id` ou sans texte sont filtrés.

### Resize

Le pattern est identique à la sidebar du diagram (`Diagram.svelte`) : `mousedown` sur le handle → `mousemove` sur `document` → calcul de largeur inversé (`startW - (clientX - startX)` car on tire vers la gauche). Largeur persistée en `localStorage` (`ld-toc-w`). Min 160px, Max 400px, défaut 224px.

### Scroll vers un heading

`scrollToHeading(id)` :
1. Remonte les ancêtres et ouvre tout `<details>` fermé avant de mesurer
2. Lit la hauteur réelle du `#home-doc-header` (sticky)
3. Calcule `targetTop` via `getBoundingClientRect` + `scrollTop`
4. `scrollContainer.scrollTo({ top: targetTop - headerH - 16, behavior: "smooth" })`

### Persistance

- `ld-toc-open` (boolean) : état ouvert/fermé
- `ld-toc-w` (pixels) : largeur du panneau

## Conséquences

- Le bouton TOC est visible dans toutes les actions du header, actif en bleu quand ouvert.
- Le panneau est absent à l'impression (`no-print`).
- La séparation verticale (1px `#e5e7eb` / `#374151` dark) est en CSS pur (classe `ld-toc-aside`) car Tailwind CDN JIT ne génère pas toujours `border-l-width`.
