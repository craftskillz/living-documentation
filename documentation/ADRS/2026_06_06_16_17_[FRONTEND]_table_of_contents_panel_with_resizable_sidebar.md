---
**date:** 2026-06-06
**status:** To be validated
**description:** Un panneau TOC sticky redimensionnable s'ouvre via un bouton fa-list-ul; le header reste pleine largeur au-dessus du contenu et la TOC se colle à top=hauteurHeader (mesurée par ResizeObserver) pour zéro sticky-travel; les clics ouvrent les details fermés avant de scroller.
**tags:** TOC, table-of-contents, DocViewer, sticky, ResizeObserver, zero-travel, resizable, details, scroll, localStorage, headings
---

## Contexte

Les documents longs n'avaient pas de navigation interne. Astro/Starlight propose une TOC fixe sur la droite. Objectif : même principe mais opt-in (toggle) plutôt que toujours visible.

## Décision

### Layout (version finale)

Le header `#home-doc-header` est **pleine largeur**, sticky `top-0`, placé comme frère AU-DESSUS de la ligne de contenu. La ligne de contenu est un flex `items-start` contenant l'article (`flex-1`) + handle de resize + aside TOC.

```
<header sticky top-0 full-width>      ← bande grise sur toute la largeur, par-dessus la TOC
<div class="flex items-start">
  <article flex-1>contenu</article>
  <div cursor-col-resize>             ← handle resize
  <aside sticky top:{headerH}px>TOC</aside>
</div>
```

### Sticky zéro-travel (point critique)

Un `position: sticky` placé plus bas que le haut du scroller (ici sous un header en flux normal) doit parcourir la hauteur du header AVANT de se figer — pendant ce trajet il « scrolle avec la page » (bug observé : « la table bouge avec la page puis s'arrête »).

Solution : coller la TOC à `top = hauteur du header` au lieu de `top: 0`. Sa position naturelle (offsetTop) égale alors déjà sa valeur `top` → **zéro travel**, la TOC ne bouge jamais.

La hauteur du header est dynamique (badges dossier/catégorie, jauge accuracy, historique de nav, notice de résultats de recherche). Elle est suivie en continu par un `ResizeObserver` sur le header → `headerH` (state). L'aside utilise `style="top: {headerH}px; max-height: calc(100vh - {headerH}px)"`.

C'est ce qui réconcilie « header pleine largeur » ET « TOC figée » (ce ne sont PAS des exigences en conflit).

### Extraction des headings

À la fin de l'effet `wireDocContent` existant (pas un `$effect` séparé), pour garantir que les `h1-h6` ont leurs `id` posés. Filtre les headings sans `id` ou sans texte.

### Resize

Pattern identique à la sidebar du diagram : `mousedown` sur le handle → `mousemove` sur `document` → largeur inversée (`startW - (clientX - startX)`, on tire vers la gauche). Persistée en `localStorage` (`ld-toc-w`). Min 160, Max 400, défaut 224px.

### Scroll vers un heading

`scrollToHeading(id)` : ouvre les `<details>` ancêtres fermés avant de mesurer, lit la hauteur réelle du header sticky, puis `scrollContainer.scrollTo({ top: targetTop - headerH - 16, behavior: "smooth" })`.

Les liens TOC ont `onmousedown preventDefault` pour empêcher le focus de scroller le conteneur overflow de la TOC quand on clique un lien partiellement hors-vue.

### Espacement contenu ↔ TOC

Padding et largeur calibrés pour un petit écart (~12px) entre le contenu et le séparateur, sans grand vide.

### Persistance

- `ld-toc-open` (boolean) : état ouvert/fermé
- `ld-toc-w` (pixels) : largeur du panneau

## Conséquences

- Bouton TOC visible dans les actions du header, actif en bleu quand ouvert.
- Panneau absent à l'impression (`no-print`).
- Séparation verticale 1px (`#e5e7eb` / `#374151` dark) en CSS pur (`.ld-toc-aside`) car Tailwind CDN JIT ne génère pas toujours `border-l-width`.
- Le `derived showToc` (`tocOpen && tocEntries.length > 0`) pilote l'affichage et évite un panneau vide sur les docs sans heading.
