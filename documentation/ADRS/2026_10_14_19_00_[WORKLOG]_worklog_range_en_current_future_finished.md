---
type: ADR
title: WORKLOG rangé en CURRENT, FUTURE et FINISHED
description: Le dossier WORKLOG garde current-task.md à sa racine et range roadmaps et traces de tickets dans CURRENT, FUTURE et FINISHED selon leur cycle de vie ; les starters livrent cette structure et la décrivent aux agents IA.
tags:
  - worklog
  - starter-doc
  - roadmap
  - agents
status: To be validated
---

## Contexte

Le dossier `WORKLOG/` empilait à plat `current-task.md`, plusieurs roadmaps et une trace par ticket terminé (plus de trente fichiers dans ce dépôt). Rien ne distinguait une roadmap livrée d'une roadmap à venir, et un agent qui cherchait « la » roadmap tombait sur `WORKLOG/ROADMAP.md`, déjà terminée.

## Décision

`WORKLOG/` contient :

- `current-task.md` à la racine : point d'entrée stable, référencé en dur par `CLAUDE.md`, `AGENTS.md`, `PROJECT-INSTRUCTIONS.md` et la règle `track-current-work` ;
- `CURRENT/` : la roadmap en cours de réalisation et les traces de ses tickets terminés ;
- `FUTURE/` : les roadmaps cadrées mais pas encore démarrées ;
- `FINISHED/` : les roadmaps entièrement livrées, avec les traces de leurs tickets.

Une roadmap est créée dans `FUTURE/`, passe dans `CURRENT/` à son premier ticket, puis rejoint `FINISHED/` avec ses traces à son dernier ticket. Les déplacements passent par l'explorateur ou `POST /api/tree/move`, qui réécrivent les liens entrants. L'ordre du manifeste `WORKLOG/liv-doc-main.md` est `current-task.md`, `CURRENT`, `FUTURE`, `FINISHED`.

Les deux starters livrent les trois dossiers, chacun avec son `liv-doc-main.md` pour que les dossiers vides survivent à Git et au paquet npm ; leur roadmap d'exemple est dans `FUTURE/`. `PROJECT-INSTRUCTIONS.md`, `track-current-work`, `AGENTS.md` et `CLAUDE.md` décrivent la convention aux agents.

Le générateur d'`index.md` ne liste plus un sous-dossier sans concept, qui n'a pas d'`index.md` à lui : le lien serait cassé (cas de `CURRENT/` vide).

## Conséquences

### AVANTAGES

- L'état de chaque roadmap se lit dans l'arborescence.
- Un agent trouve la roadmap active dans `CURRENT/` sans parcourir l'historique.

### INCONVÉNIENTS

- Clore une roadmap demande un déplacement de fichiers en plus du cochage.
- Les liens `?doc=` qui pointent vers une trace sont réécrits par le déplacement, mais un lien déjà cassé avant reste cassé.

## ADR liés

- [Convention WORKLOG pour la reprise entre agents IA](./2026_05_14_11_33_%5BSTARTER_DOC%5D_worklog_convention_for_ai_handoff_in_bilingual_starter.md), que cet ADR complète.
