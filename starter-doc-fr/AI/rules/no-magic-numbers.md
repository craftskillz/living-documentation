---
type: Rule
title: Éviter les magic numbers
description: Les valeurs numériques porteuses de sens métier ou technique doivent être nommées par des constantes plutôt que répétées comme littéraux bruts.
tags:
  - qualite-code
  - maintenabilite
id: no-magic-numbers
severity: warning
appliesto:
  - src/**/*.ts
  - src/frontend/**/*.js
---

Les valeurs numériques qui portent un sens doivent être nommées là où elles sont introduites.

Préférer une constante dont le nom explique l'intention :

```ts
const DEFAULT_CUSTOM_SHAPE_SIZE = 65;
```

Éviter de répéter des nombres bruts dans le code quand la valeur porte un sens produit, rendu, dimensionnement, timing ou protocole.
