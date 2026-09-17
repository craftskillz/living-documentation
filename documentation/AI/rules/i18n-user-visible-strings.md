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
  - path: src/frontend/i18n/fr.json
    hash: e40ab533bb0429546d666b1b27c42fb296acbc8aa254b2f45e86c776275b7139
  - path: src/frontend-svelte/src/lib/i18n.svelte.ts
    hash: 0552e6ffb53b1800631e6cc884db6d56003b4c12a687749fa13c07be205d411e
    commit: 8dd036034b277087950d771ff048c3dd43cd428d
    dirty: true
  - path: src/frontend-svelte/public/i18n/en.json
    hash: 423eb04cec68d99d79db2aad0ea509318726eb4f0b4af0c180d0fa06f288a365
    commit: 843a7de9c403bf68e05e7eca1a88a43b00e19f44
    dirty: true
  - path: src/frontend-svelte/public/i18n/fr.json
    hash: 472d5a1cefa66c9cb634427e86678979e03c3d67e8896f7d0636abbbf7c2b913
    commit: 6d051751c80273d380f5179fa61aeec7be115015
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
