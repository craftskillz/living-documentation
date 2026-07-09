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
