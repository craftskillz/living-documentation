---
type: ADR
title: Survival Kit Dashboard Local Persiste
description: Ajout d'un dashboard Svelte `/survival-kit` pour gerer taches, notes structurees et liens categorises dans un etat JSON local propre au dossier documentaire.
tags:
  - survival-kit
  - dashboard
  - tasks
  - notes
  - links
  - svelte5
  - persistence
  - .survival-kit.json
  - debounce
  - express-router
timestamp: 2026-06-18T22:27:00Z
status: To be validated
sources:
  - path: src/routes/survival-kit.ts
    hash: 16b13a11b4444d565f1cd9e0fa0d50af250dbdd67527fa9afacf6b29af67977a
  - path: src/frontend-svelte/src/routes/SurvivalKit.svelte
    hash: bd6f87fc43252250b522ad12d51a5251c82ae7e2a8ae06e9ad0a041fba0d33af
  - path: src/frontend-svelte/src/lib/survival-kit/store.svelte.ts
    hash: 1164eee619c5c827c8dafacc10f75edab1b2dd6decd6cf2bddee83ea20b62bdc
  - path: src/frontend-svelte/src/lib/survival-kit/types.ts
    hash: 4f77ab9980002b0ba23900819bffe6922d3a276fa5e9cbbab84200ba3f9539fb
  - path: src/frontend-svelte/src/lib/survival-kit/TasksPanel.svelte
    hash: 19a8313683404455617004c609c3b35a1e67e385f577c6b216645c8f8101f830
  - path: src/frontend-svelte/src/lib/survival-kit/NotesPanel.svelte
    hash: 49f6a9c9b8c9b6ca053349585cbaecf8714af643fc2b4111faebd19221aabc7c
  - path: src/frontend-svelte/src/lib/survival-kit/LinksPanel.svelte
    hash: 8da33029fd9b9b92ef0d6bf4a3103303c5359eaef68da10c187dddf093d77e82
  - path: src/frontend-svelte/src/lib/survival-kit/SkModal.svelte
    hash: 9dfd54bc7bcaa8e0c5ea5b8c5ce35338b6715b022d8447a24f751946791520b5
---

# Survival Kit : dashboard local persiste

## Contexte

Living Documentation centralise deja les documents, diagrammes et outils pour agents, mais ne proposait pas d'espace operationnel leger pour conserver des taches personnelles, des notes rapides et des liens utiles sans les transformer en documents Markdown.

## Decision

Ajouter une route applicative `/survival-kit` integree a l'application Svelte unifiee et composee de trois panneaux :

- taches filtrables avec etat termine et priorite `normal`, `urgent` ou `later` ;
- notes thematiques composees de blocs titre, texte, code, liste ou tableau ;
- categories de liens avec nom, description, URL et theme couleur.

Le frontend conserve l'etat dans un store Svelte dedie. Apres le chargement initial, chaque mutation programme une sauvegarde debouncee de 400 ms. L'API `GET /api/survival-kit` retourne l'etat complet et `PUT /api/survival-kit` remplace l'etat complet apres verification de la presence des trois tableaux racine.

L'etat est persiste dans `<docsFolder>/.survival-kit.json`. Ce fichier appartient au dossier documentaire servi : chaque projet peut donc disposer de son propre dashboard sans base de donnees ni service externe.

Les actions destructives reutilisent le composant partage `ConfirmDialog`; les textes visibles sont declares dans les catalogues anglais et francais.

## Consequences

- Le format JSON est volontairement simple et charge en bloc ; il convient a un petit volume de donnees personnelles, pas a l'edition concurrente ni a de grands jeux de donnees.
- Les sauvegardes sont best-effort : une erreur reseau ne bloque pas l'interface et une mutation ulterieure retente l'envoi de l'etat complet.
- La route doit rester declaree dans `App.svelte`, dans la liste SPA Express et dans la topbar.
- Toute evolution du schema doit conserver la lecture defensive des tableaux absents ou invalides.
- Des tests API et E2E dedies devront couvrir la validation, la persistance et les principaux parcours CRUD.
