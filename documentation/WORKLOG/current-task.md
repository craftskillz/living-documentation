---
**date:** 2026-06-30
**status:** Completed
**description:** Ajustement de la modale Versions pour comparer HEAD au commit selectionne, avec selection par defaut du commit precedent.
**tags:** worklog, git, versions, head, visual-diff, baseRef, document-versions, home, svelte
---

# Current task

## Statut courant

Completed

## Tache realisee

Ajustement de la fonctionnalite `Versions` sur les documents lorsque l'integration Git est active et correctement configuree.

Le comportement retenu est :

- `DocViewer.svelte` interroge `/api/git/status` et affiche le bouton `Versions` apres `Metadonnees` uniquement si Git est en mode `enabled` et `ok` ;
- le clic ouvre une grande modale `VersionsModal.svelte` ;
- la modale compare cote-a-cote un commit selectionne avec le `HEAD` courant ;
- la selection par defaut a l'ouverture est le commit precedent du document (`commits[1]`) quand il existe ;
- les pastilles de commits sont cliquables et la pastille selectionnee est highlighted ;
- la modale liste les commits Git relatifs au document sur une periode configurable, par defaut 30 jours ;
- l'API `GET /api/git/document-versions?documentId=...&sinceDays=...&baseRef=...` retourne `baseContent`, `headContent`, `relativePath`, `baseRef` et les commits du document ;
- les ids de documents deja encodes par l'UI sont decodes une fois par la route Git avant resolution du chemin.

## Contenu modifie

- `src/lib/git-integration.ts`
- `src/routes/git.ts`
- `src/frontend-svelte/src/lib/home/DocViewer.svelte`
- `src/frontend-svelte/src/lib/home/VersionsModal.svelte`
- `src/frontend-svelte/public/i18n/fr.json`
- `src/frontend-svelte/public/i18n/en.json`
- `tests/api/git.spec.ts`

## Documentation

ADR mise a jour : `documentation/ADRS/2026_06_30_11_21_[INTEGRATION]_versions_visuelles_des_documents_depuis_git_head.md`.

Metadonnees ADR attachees aux fichiers source qui portent la feature. Note : les metadonnees ont ete capturees avec un working tree source dirty, car les fichiers de code de la feature n'etaient pas encore committes.

## Verifications realisees

- `npm run build` : OK.
- `npx playwright test tests/api/git.spec.ts` : OK, 3 passed.
- `git diff --check` : OK.

## Verifications restantes

- Verification manuelle recommandee dans Home avec Git active : ouvrir un document ayant au moins deux commits, cliquer `Versions`, verifier que le commit precedent est selectionne par defaut, puis cliquer une autre pastille.
- Apres commit des changements source, rafraichir les metadonnees de l'ADR si une tracabilite Git propre est souhaitee.

## Prochaine action recommandee

Tester sur un projet reel avec un depot Git parent de `docsFolder`, puis decider si une prochaine iteration doit supporter les renommages de fichiers dans l'historique avec une resolution de chemin par commit.
