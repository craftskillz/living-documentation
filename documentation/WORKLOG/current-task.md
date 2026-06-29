---
**date:** 2026-06-29
**status:** Completed
**description:** Les créations de dossiers Home normalisent désormais les espaces, accents et caractères spéciaux en segments sûrs avec underscores.
**tags:** worklog, home, folder, normalization, accents, spaces, mkdir, svelte, api, playwright
---

# Current task

## Statut courant

Completed

## Tache realisee

La création de dossiers depuis la page Home a été corrigée pour produire des noms de dossiers normalisés.

Le flux retenu est :

- un segment de dossier est normalisé par suppression des accents ;
- les espaces et caractères spéciaux sont remplacés par `_` ;
- les underscores multiples sont compactés ;
- les underscores en début/fin sont retirés ;
- `204_CONNAISSANCE PERSONNE` devient `204_CONNAISSANCE_PERSONNE` ;
- la normalisation est appliquée dans la modale `Nouveau dossier` ;
- la normalisation est appliquée dans la création de sous-dossier inline depuis `Nouveau document` ;
- l'API `POST /api/browse/mkdir` normalise aussi le dernier segment reçu, pour garder le comportement robuste même si un client ancien envoie un nom brut.

## Contenu modifie

- Ajout de `src/lib/folderName.ts` avec `normalizeFolderSegment` et `normalizeFolderPath`.
- Extension de `NewFolderModal.svelte` pour normaliser la saisie et l'aperçu.
- Extension de `NewDocModal.svelte` pour normaliser le nouveau sous-dossier inline.
- Extension de `src/routes/browse.ts` pour normaliser côté serveur le nom de dossier créé.
- Ajout de tests unitaires, API et E2E ciblés.

## Fichiers concernes

- `src/lib/folderName.ts`
- `src/frontend-svelte/src/lib/home/NewFolderModal.svelte`
- `src/frontend-svelte/src/lib/home/NewDocModal.svelte`
- `src/routes/browse.ts`
- `tests/unit/folder-name.spec.ts`
- `tests/api/browse.spec.ts`
- `tests/e2e/folder-creation.spec.ts`
- `graphify-out/*`

## Verifications realisees

- `npm run build` : OK.
- `npx playwright test tests/unit/folder-name.spec.ts --project=chromium` : OK, 3 tests passes.
- `npx playwright test tests/api/browse.spec.ts --project=chromium` : OK, 7 tests passes.
- `npx playwright test tests/e2e/folder-creation.spec.ts --project=chromium` : OK, 1 test passe.
- `graphify update .` : OK.

## Limites connues

- Les dossiers déjà créés avec espaces ou accents ne sont pas migrés automatiquement.
- La correction se limite à la création de dossiers ; elle ne renomme pas les chemins existants dans les documents.
- Aucun ADR n'a été créé pendant cette passe : l'arbre Git contient déjà des modifications non commitées, et les métadonnées Living Documentation seraient marquées sur un état dirty.

## Prochaine action recommandee

Valider manuellement dans Home avec un nom comme `204_CONNAISSANCE PERSONNE déjà!`, puis committer la correction avec la feature Files précédente ou créer un commit séparé selon le découpage souhaité.
