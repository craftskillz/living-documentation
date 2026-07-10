---
type: Rule
title: Préférer le CLI réel pour la coverage serveur
description: La couverture c8 des modules serveur est plus fiable quand Playwright exerce le vrai CLI/serveur via fixtures isolées plutôt que des imports directs de dist dans les specs.
tags:
  - tests
  - playwright
  - coverage
  - c8
  - cli
sources:
  - path: tests/helpers/server.ts
    hash: d818ed9ffed40f8ea60b2c1ddc28b7a8ba0bd227638575bf4cc1354ba96d98cb
  - path: tests/helpers/coverage.ts
    hash: 7c73a492041aed2e61793e13b556b52ba357e30520abe5e937cfdc77c3fbcdd3
  - path: bin/cli.ts
    hash: 4a8a9a84e44d6e6e94dee01f6be680c1fb872fa7e8d52f98e615a81cbd057cda
id: playwright-coverage-through-cli
severity: warning
appliesto:
  - tests/**/*.ts
  - src/**/*.ts
  - bin/**/*.ts
---

Pour tester un comportement serveur, API, CLI ou `src/lib/*`, privilégier un test Playwright qui lance le CLI réel via les helpers de fixtures, puis exerce la route ou le flux utilisateur correspondant.

Les imports directs de modules compilés depuis `dist/` dans une spec Playwright peuvent valider la logique mais produire une attribution de coverage V8 trompeuse. Les tests unitaires restent utiles pour la lisibilité, mais ils ne doivent pas devenir la stratégie principale pour améliorer la coverage c8.

Quand une fixture a besoin d'un état spécifique, créer ou adapter un dossier sous `tests/fixtures/` plutôt que muter une fixture partagée pendant le test.
