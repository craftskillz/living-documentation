---
type: Worklog
title: US11b — Renommer depuis l'explorateur (frontend)
description: Entrée « Renommer » du menu contextuel de l'explorateur, modale de saisie, document ouvert suivi après renommage, i18n EN/FR.
tags:
  - worklog
  - us
  - explorateur
status: To Be Validated
---

# US11b — Renommer depuis l'explorateur (frontend)

Suite de [US11a](./2026_10_14_17_00_%5BWORKLOG%5D_us_11a_renommer_et_reecrire_les_liens_backend.md) (backend `PUT /api/tree/rename`).

## Réalisé

- `src/frontend-svelte/src/lib/home/tree.ts` : `canRenameEntry` (faux pour les éléments masqués, réservés et les dossiers racine `files` / `images`).
- `src/frontend-svelte/src/lib/home/api.ts` : `renameTreeEntry(path, newName)` → `{ ok, path }` ou `{ ok: false, status }`.
- `src/frontend-svelte/src/lib/home/RenameEntryModal.svelte` (nouveau) : modale pré-remplie (nom de fichier sans `.md`, nom de dossier tel quel), Entrée / Échap, erreurs dans la modale (400 nom invalide, 409 nom pris, autre échec) ; la modale reste ouverte en cas d'erreur.
- `Sidebar.svelte` : entrée « Renommer » sous « Masquer / Afficher » ; succès → `onmoved(source, path)`, le même chemin que le drag and drop (rechargement de l'arbre, URL du document ouvert et `revealDoc`).
- i18n EN/FR : `sidebar.rename_entry`, `modal.rename_entry.*`.
- ADR explorateur et `PROJECT-STACK.md` complétés.

## Tests

- E2E `explorer.spec.ts` (+3) : renommage du document ouvert (URL, contenu, lien entrant réécrit), renommage de dossier avec refus d'un nom pris dans la modale, entrée absente sur un élément masqué et sur `images` racine.
- Suites complètes : unitaires 64/64, `tests/api` 219/219, `tests/e2e` 117/117, `okf:validate` conforme.

## Suite

US11 terminée ; backlog ROADMAP-EXPLORATEUR épuisé. Revue humaine de l'ADR explorateur.
