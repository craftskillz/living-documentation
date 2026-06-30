---
**date:** 2026-06-30
**status:** Completed
**description:** Ajout d'une modale Versions dans Home pour comparer un document courant a HEAD et lister ses commits Git sur une periode configurable.
**tags:** worklog, git, versions, head, visual-diff, document-versions, home, svelte
---

# Current task

## Statut courant

Completed

## Tache realisee

Ajout d'une fonctionnalite `Versions` sur les documents lorsque l'integration Git est active et correctement configuree.

Le comportement retenu est :

- `DocViewer.svelte` interroge `/api/git/status` et affiche le bouton `Versions` apres `Metadonnees` uniquement si Git est en mode `enabled` et `ok` ;
- le clic ouvre une grande modale `VersionsModal.svelte` ;
- la modale compare cote-a-cote la derniere version committee du document (`HEAD`) avec la version courante chargee dans Home ;
- la modale liste les commits Git relatifs au document sur une periode configurable, par defaut 30 jours ;
- l'API `GET /api/git/document-versions?documentId=...&sinceDays=...` retourne `baseContent`, `relativePath`, `baseRef` et les commits du document ;
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

ADR creee : `documentation/ADRS/2026_06_30_11_21_[INTEGRATION]_versions_visuelles_des_documents_depuis_git_head.md`.

Metadonnees ADR attachees aux fichiers source qui portent la feature. Note : les metadonnees ont ete capturees avec un working tree source dirty, car les fichiers de code de la feature n'etaient pas encore committes.

## Verifications realisees

- `npm run build` : OK.
- `npx playwright test tests/api/git.spec.ts` : OK, 3 passed.
- `git diff --check` : OK.

## Verifications restantes

- Verification manuelle recommandee dans Home avec Git active : ouvrir un document modifie, cliquer `Versions`, verifier le diff cote-a-cote et changer la periode.
- Apres commit des changements source, rafraichir les metadonnees de l'ADR si une tracabilite Git propre est souhaitee.

## Prochaine action recommandee

Tester sur un projet reel avec un depot Git parent de `docsFolder`, puis decider si la prochaine iteration doit permettre de comparer contre un commit selectionne dans la liste plutot que seulement contre `HEAD`.
