---
**date:** 2026-06-24
**status:** To be validated
**description:** Le dossier `playwright-report/` contient le rapport HTML généré par Playwright pour consulter les résultats de test et rejouer les traces.
**tags:** playwright-report, playwright, html-report, traces, test-results, diagnostics, generated
---

Le dossier `playwright-report/` contient le rapport HTML généré par Playwright après l'exécution des tests. C'est un dossier de consultation, produit automatiquement par le runner de test.

Il sert à parcourir les résultats de test dans une interface lisible : statut des scénarios, détails d'échec, liens vers les traces et informations utiles au diagnostic.

L'objectif est simple : offrir une vue navigable des tests exécutés, afin de comprendre rapidement ce qui a réussi, échoué ou doit être rejoué.

Vue d'ensemble : `index.html` ouvre le rapport, `data/` contient les données utilisées par cette page, et `trace/` permet d'accéder aux éléments nécessaires au replay Playwright.

Fonctionnellement, ce dossier couvre trois usages importants :

- consulter un rapport visuel après une exécution Playwright ;
- retrouver les détails d'un scénario en échec ;
- accéder aux traces utiles pour rejouer ou analyser un comportement.
