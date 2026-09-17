---
type: Rule
title: Internationaliser tous les textes visibles
description: Tout texte visible par l'utilisateur dans le frontend Svelte doit être déclaré dans les catalogues i18n anglais et français, puis consommé via la fonction t() de lib/i18n.svelte.ts.
tags:
  - frontend
  - svelte
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
  - path: src/frontend-svelte/src/lib/i18n.svelte.ts
    hash: 0552e6ffb53b1800631e6cc884db6d56003b4c12a687749fa13c07be205d411e
    commit: 8dd036034b277087950d771ff048c3dd43cd428d
    dirty: true
id: i18n-user-visible-strings
severity: required
appliesto:
  - src/frontend-svelte/src/**/*.svelte
  - src/frontend-svelte/src/**/*.ts
  - src/frontend-svelte/public/i18n/*.json
---

Chaque libellé, bouton, tooltip, placeholder, message d'erreur, toast, texte de modale ou texte injecté dans l'UI doit exister dans les deux catalogues :

```text
src/frontend-svelte/public/i18n/en.json
src/frontend-svelte/public/i18n/fr.json
```

Règles d'usage :

- Importer `t` depuis `lib/i18n.svelte` (chemin relatif, par exemple `import { t } from "../i18n.svelte";`).
- Composant Svelte : `{t("key")}` pour le texte, `title={t("key")}` / `placeholder={t("key")}` pour les attributs.
- Module TypeScript (DOM impératif, toasts, options générées) : `t("key")` au moment du rendu, pas au chargement du module.
- Valeurs dynamiques : `t("key", { count: String(n) })` avec `{count}` dans la chaîne ; prévoir des clés distinctes pour le singulier et le pluriel plutôt que de concaténer un `s`.
- Clés plates, préfixées par domaine (`workspace.model.label`, `agents.run`, `templates.rename`).

Ne pas introduire de chaîne anglaise ou française hardcodée visible par l'utilisateur dans un composant `.svelte` ou un module `.ts` du frontend. Lorsqu'on modifie une zone encore hardcodée, internationaliser au minimum les textes touchés.
