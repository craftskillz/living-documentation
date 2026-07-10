---
type: Document
title: Graphifyout
description: "Le dossier `graphify-out/` contient les sorties Graphify qui transforment le projet en graphe consultable : rapport, vues HTML, JSON et cache."
tags:
  - graphify-out
  - graphify
  - knowledge-graph
  - graph-report
  - graph-json
  - html
  - cache
  - architecture
timestamp: 2026-06-24T20:56:00Z
status: To be validated
sources:
  - path: graphify-out/GRAPH_REPORT.md
    hash: f86e570b6f1180eb34a3672da5cacf11dcf3485ea4c011aa1049d20b0d095dcc
    commit: 0189b560cdcf2b26a6383d20633f92bc5940c254
    dirty: true
  - path: graphify-out/manifest.json
    hash: 7a0118d0df3b7bc886924ba6ee7bc4011dd7acffcab7d94457c34dbc84fdacc4
    commit: 0189b560cdcf2b26a6383d20633f92bc5940c254
    dirty: true
  - path: graphify-out/graph.json
    hash: c90ad73baa4f8377a47557ac8744a38ca858114d65f88d2868f5b87d16857696
    commit: 0189b560cdcf2b26a6383d20633f92bc5940c254
    dirty: true
---

Le dossier `graphify-out/` contient les sorties générées par Graphify pour représenter le projet sous forme de graphe de connaissances.

Il sert à explorer les relations entre fichiers, concepts, communautés et zones fonctionnelles du projet, avec une vue plus structurée qu'une simple recherche texte.

L'objectif est simple : offrir une carte navigable du projet pour comprendre plus vite où regarder, quelles zones sont liées, et quels documents ou fichiers portent une même fonctionnalité.

Vue d'ensemble : `GRAPH_REPORT.md` donne la synthèse lisible, `graph.html` et `GRAPH_TREE.html` fournissent les vues interactives, `graph.json` contient les données exploitables par les outils, `manifest.json` décrit l'état du graphe, et `cache/` accélère les mises à jour.

Fonctionnellement, ce dossier couvre cinq usages importants :

- consulter une synthèse globale du graphe du projet ;
- naviguer visuellement entre fichiers, concepts et communautés ;
- fournir un JSON réutilisable pour les requêtes Graphify ;
- garder une trace de fraîcheur du graphe après les changements de code ;
- accélérer les mises à jour incrémentales grâce au cache.
