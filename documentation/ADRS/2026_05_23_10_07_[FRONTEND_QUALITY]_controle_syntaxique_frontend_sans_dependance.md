---
type: ADR
title: Controle Syntaxique Frontend Sans Dependance
description: "[SuperSeeded par la migration Svelte] Script npm `check:frontend` (`node --check` sur `src/frontend/**/*.js`) , supprime en meme temps que le frontend vanilla."
tags:
  - frontend
  - quality
  - javascript
  - syntax-check
  - node-check
  - npm-script
  - superseeded
  - check-frontend
  - scripts
timestamp: 2026-05-23T10:07:00Z
status: SuperSeeded
sources:
  - path: scripts/check-frontend-js.js
    hash: 23b0919fac275e93dd924382ffbe16a8be08ca863e402539270b77851aa1387d
---

> **SuperSeeded** par [Migration du frontend vers une application Svelte unifiee](?doc=ADRS%252F2026_06_03_10_53_%255BFRONTEND%255D_migration_du_frontend_vers_une_application_svelte_unifiee).
> Le frontend vanilla `src/frontend/` et le script `scripts/check-frontend-js.js` (commande npm `check:frontend`) ont ete supprimes lors de la migration vers l'application Svelte unifiee. Le typage est desormais assure par `svelte-check` / `tsc` et le build Vite ; ce controle syntaxique dedie n'a plus d'objet.

# Controle syntaxique frontend sans dependance (historique)

## Contexte

Le frontend du viewer reste en JavaScript classique charge directement par les pages HTML, sans bundler ni transpilation. Les refactorings recents ont decoupe les snippets en helpers dedies, ce qui augmente le nombre de fichiers JavaScript charges par ordre de scripts.

Le build TypeScript compile le serveur et copie les assets frontend, mais il ne valide pas la syntaxe des fichiers `src/frontend/**/*.js`. Une erreur de syntaxe dans un script navigateur peut donc passer le build et n'etre detectee qu'au chargement d'une page ou par un test E2E qui traverse precisement ce script.

## Decision

Ajouter `scripts/check-frontend-js.js`, un script Node sans dependance externe qui parcourt recursivement `src/frontend/`, collecte les fichiers `.js`, puis lance `node --check <file>` sur chacun d'eux.

Ajouter le script npm :

```json
"check:frontend": "node scripts/check-frontend-js.js"
```

Ce controle est volontairement conservateur : il verifie uniquement la validite syntaxique des scripts JavaScript frontend. Il ne remplace pas un linter de style ni une analyse de globals navigateur. Il ne modifie pas le modele frontend sans bundler et n'ajoute aucune dependance ni changement de lockfile.

`PROJECT-STACK.md` et `PROJECT-USEFUL-COMMANDS.md` documentent explicitement cette limite pour eviter de presenter `check:frontend` comme un ESLint.

## Consequences

### PROS

- Une erreur de syntaxe frontend est detectee par une commande rapide et explicite, meme si aucun test E2E cible ne charge le fichier fautif.
- Aucun cout de dependance, aucun impact sur le package publie, aucun bundler introduit.
- La commande s'integre naturellement aux increments frontend : `npm run check:frontend` apres changement JavaScript, puis tests E2E cibles quand un comportement est touche.

### CONS

- Le controle ne detecte pas les variables globales manquantes, les problemes d'ordre de chargement, les conventions de style, ni les patterns dangereux mais syntaxiquement valides.
- ESLint reste une etape separee a envisager plus tard si le projet accepte une configuration et des corrections dediees.
- La commande n'est pas encore integree a `npm run build` ou `npm test`; elle doit etre lancee explicitement jusqu'a decision contraire.
