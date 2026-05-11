---
id: playwright-coverage-through-cli
title: Préférer le CLI réel pour la coverage serveur
severity: warning
description: La couverture c8 des modules serveur est plus fiable quand Playwright exerce le vrai CLI/serveur via fixtures isolées plutôt que des imports directs de dist dans les specs.
tags: ["tests", "playwright", "coverage", "c8", "cli"]
appliesTo: ["tests/**/*.ts", "src/**/*.ts", "bin/**/*.ts"]
---

Pour tester un comportement serveur, API, CLI ou `src/lib/*`, privilégier un test Playwright qui lance le CLI réel via les helpers de fixtures, puis exerce la route ou le flux utilisateur correspondant.

Les imports directs de modules compilés depuis `dist/` dans une spec Playwright peuvent valider la logique mais produire une attribution de coverage V8 trompeuse. Les tests unitaires restent utiles pour la lisibilité, mais ils ne doivent pas devenir la stratégie principale pour améliorer la coverage c8.

Quand une fixture a besoin d'un état spécifique, créer ou adapter un dossier sous `tests/fixtures/` plutôt que muter une fixture partagée pendant le test.
