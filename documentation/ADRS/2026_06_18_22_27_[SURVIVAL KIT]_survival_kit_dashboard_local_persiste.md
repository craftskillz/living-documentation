---
**date:** 2026-06-18
**status:** To be validated
**description:** Ajout d'un dashboard Svelte `/survival-kit` pour gerer taches, notes structurees et liens categorises dans un etat JSON local propre au dossier documentaire.
**tags:** survival-kit, dashboard, tasks, notes, links, svelte5, persistence, .survival-kit.json, debounce, express-router
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
