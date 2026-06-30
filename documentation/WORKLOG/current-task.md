---
**date:** 2026-06-30
**status:** Completed
**description:** Ajout d'une integration Git configurable dans Admin avec autocommit limite a docsFolder et toast de configuration.
**tags:** worklog, git, admin, docsFolder, autocommit, gitIntegration, gitAutoCommitMiddleware, /api/git/status, persistentToast, push
---

# Current task

## Statut courant

Completed

## Tache realisee

Ajout d'une integration Git configurable depuis la page Admin.

Le comportement retenu est :

- par defaut, `gitIntegration.mode` vaut `unconfigured` et l'application affiche un toast demandant de configurer l'integration Git dans Admin ;
- l'utilisateur peut choisir explicitement `disabled`, ce qui coupe tout commit/push automatique ;
- en mode `enabled`, chaque sauvegarde Living Documentation declenche un autocommit limite au pathspec de `docsFolder`, meme lorsque le depot Git est situe plus haut dans l'arborescence ;
- les changements hors `docsFolder` sont signales par `/api/git/status` et par toast, mais ne sont pas bloques ni stagés ;
- le push est optionnel : jamais, ou tous les N commits locaux d'avance sur l'upstream.

## Contenu modifie

- `src/lib/config.ts`
- `src/lib/git-integration.ts`
- `src/routes/git.ts`
- `src/routes/config.ts`
- `src/server.ts`
- `src/frontend-svelte/src/App.svelte`
- `src/frontend-svelte/src/lib/gitToast.ts`
- `src/frontend-svelte/src/lib/persistentToast.ts`
- `src/frontend-svelte/src/routes/Admin.svelte`
- `src/frontend-svelte/src/styles/app.css`
- `src/frontend-svelte/public/i18n/fr.json`
- `src/frontend-svelte/public/i18n/en.json`
- `tests/api/git.spec.ts`

## Documentation

ADR cree : `documentation/ADRS/2026_06_30_10_39_[INTEGRATION]_integration_git_admin_et_autocommit_du_dossier_docs.md`.

Metadonnees ADR attachees puis rafraichies pour les fichiers source qui portent la feature. Note : les metadonnees indiquent un working tree dirty au moment du rafraichissement.

## Verifications realisees

- `npm run build` : OK.
- `npx playwright test tests/api/git.spec.ts` : OK, 2 passed.
- `npx playwright test tests/api/config.spec.ts tests/api/config-validation.spec.ts` : OK, 13 passed.
- `npx playwright test tests/api/documents.spec.ts tests/api/files.spec.ts tests/api/images.spec.ts` : OK, 33 passed.
- `npx playwright test tests/api/workspace.spec.ts tests/api/mcp.spec.ts tests/api/git.spec.ts` : OK, 43 passed.
- `npx playwright test tests/e2e/admin.spec.ts` : OK, 4 passed.
- `git diff --check` : OK.
- `graphify update .` : OK.

## Prochaine action recommandee

Tester manuellement dans un projet reel avec un depot Git parent de `docsFolder` : activer Git dans Admin, modifier un document, verifier qu'un commit `docs: update living documentation` ne contient que les chemins sous `docsFolder`, puis tester le mode push avec une branche upstream configuree.
