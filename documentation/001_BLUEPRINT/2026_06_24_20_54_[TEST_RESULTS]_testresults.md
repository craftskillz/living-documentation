---
type: Document
title: Testresults
description: Le dossier `test-results/` contient les artefacts générés par Playwright pour diagnostiquer les tests, notamment traces, captures et vidéos optionnelles.
tags:
  - test-results
  - playwright
  - traces
  - screenshots
  - videos
  - diagnostics
  - e2e
  - generated
timestamp: 2026-06-24T20:54:00Z
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

Le dossier `test-results/` contient les résultats générés par Playwright pendant l'exécution des tests. C'est un dossier de diagnostic, produit automatiquement par les runs de test.

Il sert à retrouver ce qui s'est passé lorsqu'un scénario échoue ou doit être rejoué : traces navigateur, captures d'écran en cas d'échec, et vidéos lorsque l'enregistrement est activé.

L'objectif est simple : donner une preuve consultable du comportement observé pendant les tests, sans mélanger ces artefacts avec le code ou la documentation source.

Vue d'ensemble : chaque sous-dossier correspond à un scénario Playwright exécuté et regroupe les éléments utiles pour analyser ce scénario.

Fonctionnellement, ce dossier couvre trois usages importants :

- conserver les traces nécessaires au replay ou au debug d'un test ;
- stocker les captures d'écran créées lors des échecs ;
- accueillir les vidéos de test lorsque `RECORD_VIDEO=1` est utilisé.
