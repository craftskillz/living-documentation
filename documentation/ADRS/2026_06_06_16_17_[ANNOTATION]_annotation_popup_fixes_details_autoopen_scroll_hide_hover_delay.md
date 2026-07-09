---
type: ADR
title: Annotation Popup Fixes Details Autoopen Scroll Hide Hover Delay
description: "Trois corrections sur les post-its: ouverture automatique des details ancêtres avant scroll, fermeture immédiate au scroll du conteneur, et délai de fermeture porté à 1500ms pour laisser le temps d'atteindre la popup depuis le pill."
tags:
  - annotation
  - post-it
  - details
  - scroll
  - pillEnter
  - pillClick
  - scheduleHide
  - hideTimer
  - openAncestorDetails
  - Annotations.svelte
timestamp: 2026-06-06T16:17:00Z
status: To be validated
---

## Contexte

Trois bugs liés aux interactions avec les post-its (elevator pills) :

1. Un post-it dont la cible est dans un `<details>` fermé provoquait un scroll vers une position invisible.
2. Après un survol (scroll centré), un clic sur le pill re-scrollait vers `-120px` fixe → décalage visuel.
3. La popup jaune disparaissait en 300ms, trop court pour déplacer la souris et cliquer sur Supprimer.
4. Bonus : la popup restait visible pendant un scroll alors qu'elle n'avait plus de rapport avec la position visible.

## Décision

### `openAncestorDetails(el, boundary)`

```ts
function openAncestorDetails(el: HTMLElement, boundary: HTMLElement) {
  let cur: HTMLElement | null = el.parentElement;
  while (cur && cur !== boundary) {
    if (cur.tagName === "DETAILS") (cur as HTMLDetailsElement).open = true;
    cur = cur.parentElement;
  }
}
```

Appelée dans `pillEnter` et `pillClick` avant tout `scrollTo`, pour rendre le mark visible et permettre une mesure de position correcte. Même pattern que dans `scrollToHeading` (DocViewer) et `scrollToMatch` (searchNotice).

### `pillClick` , pas de re-scroll si popup déjà ouverte

Si `readPopup?.ann.id === id` (survol déjà effectué), on annule simplement le `hideTimer` sans re-scroller. Évite le décalage entre offset de centrage (pillEnter) et offset fixe `-120` (pillClick).

### `scheduleHide` , délai 300ms → 1500ms

La popup reste visible 1,5 seconde après que la souris quitte le pill, laissant le temps de déplacer la souris et de cliquer sur Supprimer. `clearTimeout(hideTimer)` dans `onmouseenter` de la popup annule le timer si l'utilisateur atteint la popup.

### Fermeture immédiate au scroll

`onMount` ajoute un listener `{ passive: true }` sur `#home-content-area` qui vide `readPopup` et annule `hideTimer` immédiatement dès le premier événement scroll. Le listener est nettoyé au démontage.

## Conséquences

- Les post-its ciblant du contenu dans des `<details>` fonctionnent correctement.
- L'UX de suppression est praticable sans timing serré.
- La popup ne flotte pas hors-contexte lors d'un scroll.
