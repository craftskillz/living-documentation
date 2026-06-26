---
**date:** 2026-03-22
**status:** Accepted
**description:** Utiliser systématiquement le thème github-dark de highlight.js quel que soit le mode clair ou sombre, en supprimant entièrement la feuille de style claire.
**tags:** style, coloration-syntaxique, mode-sombre, highlight.js, frontend, github-dark, prose
---

## Contexte

Le visualiseur chargeait auparavant deux feuilles de style highlight.js, `github.min.css` (clair) et `github-dark.min.css` (sombre), et basculait entre elles via l'attribut `disabled` lorsque l'utilisateur changeait de thème. Le thème clair affichait les blocs de code avec un fond blanc qui se confondait avec l'arrière-plan de la page, les rendant difficiles à distinguer de la prose.

## Décision

Supprimer entièrement la feuille de style claire. Toujours charger `github-dark.min.css` quel que soit le thème actif (mode clair ou sombre). L'arrière-plan des `pre` est codé en dur à `#0d1117` (le fond de github-dark) via l'utilitaire Tailwind `prose-pre:bg-[#0d1117]`.

## Conséquences

### AVANTAGES

- Les blocs de code ont une apparence sombre et à fort contraste, constante en mode clair comme en mode sombre.
- Le bloc sombre sépare visuellement le code de la prose dans les deux modes, améliorant la lisibilité.
- Le basculement de mode sombre en JS n'a plus besoin de manipuler les flags `disabled` des feuilles de style, ce qui simplifie `applyDarkMode` et `setupDarkToggle`.

### INCONVÉNIENTS

- Il s'agit d'un compromis UX assumé : la lisibilité du code est priorisée par rapport à une cohérence stricte du thème (le mode clair comporte des blocs de code sombres).