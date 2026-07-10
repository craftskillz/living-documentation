---
type: Rule
title: Internationaliser tous les textes visibles
description: Tout texte visible par l'utilisateur doit être déclaré dans les catalogues i18n anglais et français, puis consommé via les attributs data-i18n ou window.t.
tags:
  - frontend
  - i18n
  - ux
  - traductions
sources:
  - path: src/frontend/i18n.js
    hash: c7361f6d7643dfdd469bc4b17296726c79472c71706e234f278effe6d5530f2d
  - path: src/frontend/i18n/en.json
    hash: fcb7206ee6e309871a6590d627d28778e7e247935189b880088900370a2b8768
  - path: src/frontend/i18n/fr.json
    hash: e40ab533bb0429546d666b1b27c42fb296acbc8aa254b2f45e86c776275b7139
id: i18n-user-visible-strings
severity: required
appliesto:
  - src/frontend/**/*.html
  - src/frontend/**/*.js
  - src/frontend/i18n/*.json
---

Chaque libellé, bouton, tooltip, placeholder, message d'erreur, texte de modale ou texte injecté dans l'UI doit exister dans les deux catalogues :

```text
src/frontend/i18n/en.json
src/frontend/i18n/fr.json
```

Règles d'usage :

- HTML texte simple : `data-i18n`.
- HTML `title` : `data-i18n-title`.
- HTML `placeholder` : `data-i18n-placeholder`.
- HTML riche contrôlé : `data-i18n-html`.
- JavaScript dynamique : `window.t("key")`.

Ne pas introduire de chaîne anglaise ou française hardcodée dans `index.html`, `admin.html`, `diagram.html`, `context.html`, `shape-editor.html` ou les modules JavaScript frontend lorsqu'elle est visible par l'utilisateur.
