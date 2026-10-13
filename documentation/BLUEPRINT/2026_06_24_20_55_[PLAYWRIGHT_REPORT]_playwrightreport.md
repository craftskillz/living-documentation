---
type: Document
title: Playwrightreport
description: Le dossier `playwright-report/` contient le rapport HTML généré par Playwright pour consulter les résultats de test et rejouer les traces.
tags:
  - playwright-report
  - playwright
  - html-report
  - traces
  - test-results
  - diagnostics
  - generated
timestamp: 2026-06-24T20:55:00Z
status: To be validated
sources:
  - path: playwright.config.ts
    hash: bd5ec053a7955be0aff01d803d5b8ccf76f5caf3975d14d01add39131305dfa0
    commit: 0189b560cdcf2b26a6383d20633f92bc5940c254
    dirty: true
  - path: documentation/AI/PROJECT-USEFUL-COMMANDS.md
    hash: d27b0f8559f26632e1a5bce6babb0cd5224dafc4800fc4cd4c3faa91def68066
    commit: 0189b560cdcf2b26a6383d20633f92bc5940c254
    dirty: true
  - path: .gitignore
    hash: 14c3ac62cdc2e940716d0927ea1408da2f099924a4623a58cf84519b136f823d
    commit: 0189b560cdcf2b26a6383d20633f92bc5940c254
    dirty: true
---

Le dossier `playwright-report/` contient le rapport HTML généré par Playwright après l'exécution des tests. C'est un dossier de consultation, produit automatiquement par le runner de test.

Il sert à parcourir les résultats de test dans une interface lisible : statut des scénarios, détails d'échec, liens vers les traces et informations utiles au diagnostic.

L'objectif est simple : offrir une vue navigable des tests exécutés, afin de comprendre rapidement ce qui a réussi, échoué ou doit être rejoué.

Vue d'ensemble : `index.html` ouvre le rapport, `data/` contient les données utilisées par cette page, et `trace/` permet d'accéder aux éléments nécessaires au replay Playwright.

Fonctionnellement, ce dossier couvre trois usages importants :

- consulter un rapport visuel après une exécution Playwright ;
- retrouver les détails d'un scénario en échec ;
- accéder aux traces utiles pour rejouer ou analyser un comportement.
