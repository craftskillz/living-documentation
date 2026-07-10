---
type: Document
title: Documentation
description: "Le dossier `documentation/` contient la documentation vivante du projet : guides, ADR, contexte IA, worklog, médias et cartographie Blueprint."
tags:
  - documentation
  - living-documentation
  - adr
  - ai-context
  - worklog
  - blueprint
  - guides
  - images
  - files
timestamp: 2026-06-24T20:34:00Z
status: To be validated
sources:
  - path: documentation/AI/PROJECT-INSTRUCTIONS.md
    hash: def0b3461126e8ba63798713337c038055a98dcc7b629cc502627e575760d61e
    commit: 0189b560cdcf2b26a6383d20633f92bc5940c254
    dirty: true
  - path: documentation/AI/PROJECT-STACK.md
    hash: ac4e9e8a0afc2e2ee4de64e5e90b2410471787ac2ea381640c99393fac7bd37b
    commit: 0189b560cdcf2b26a6383d20633f92bc5940c254
    dirty: true
  - path: documentation/3_concept/2026_04_08_22_15_[DOCUMENTING]_living_documentation.md
    hash: 63736eac53bb5722887854266d7bf652e078ede37a448140c38b5c31a838463e
    commit: 0189b560cdcf2b26a6383d20633f92bc5940c254
    dirty: true
---

Le dossier `documentation/` est le cœur documentaire du projet. C'est l'endroit où sont stockés les documents consultables dans l'application Living Documentation.

Il sert à garder au même endroit la documentation utilisateur, les décisions d'architecture, les règles de travail des assistants IA, les documents de suivi, les images, les fichiers joints et les cartes Blueprint du projet.

L'objectif est simple : faire vivre la connaissance du projet avec le code, dans un espace lisible par les humains et exploitable par les agents IA.

### Vue d'ensemble

Les dossiers numérotés structurent le parcours lecteur, tandis que `ADRS/`, `AI/`, `WORKLOG/` et `001_BLUEPRINT/` portent les décisions, le contexte agent, le suivi courant et la cartographie des dossiers source.

Fonctionnellement, ce dossier couvre cinq usages importants :

- consulter et faire évoluer la documentation du produit ;
- conserver les décisions durables du projet avec les ADR ;
- donner aux agents IA les règles, le contexte et les commandes à suivre ;
- suivre le travail courant et les reprises via `WORKLOG/` ;
- stocker les supports liés aux documents, comme les images et les fichiers joints.
