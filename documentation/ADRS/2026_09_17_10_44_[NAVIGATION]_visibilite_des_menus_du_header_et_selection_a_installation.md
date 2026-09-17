---
type: ADR
title: Visibilité des menus du header et sélection à l’installation
description: Les menus optionnels sont filtrés par hiddenHeaderMenus, configurables dans Admin et masqués par défaut lors de la création d’un projet avec sélection interactive au CLI.
tags:
  - navigation
  - header
  - hiddenHeaderMenus
  - OPTIONAL_HEADER_MENUS
  - cli
  - readline
  - svelte
  - configuration
status: To be validated
sources:
  - path: src/shared/headerNavigation.ts
    hash: b74d3a8a068bd36cd5f358b73861fe9c1e10246c015cb2ae45b25ea37dbd2c64
    commit: 7633afce433bfc563f2cbe33a9205e0fc8f331b9
    dirty: false
  - path: src/lib/cli/headerMenuPrompt.ts
    hash: 1a016eff6f72a2e2fc9268f62051b01ca9172597bb57293caa3172c0f957d528
    commit: 7633afce433bfc563f2cbe33a9205e0fc8f331b9
    dirty: false
  - path: src/lib/cli/init.en.json
    hash: 85f6823da57847add619a55a8a6c0ab42a9d2f9f81125d18c5a41b0e84f153bf
    commit: 7633afce433bfc563f2cbe33a9205e0fc8f331b9
    dirty: false
  - path: src/lib/cli/init.fr.json
    hash: 7d51a04640e920b4294e2d2fa9c166aec8112ebb0d79955a777b4a6cc3450517
    commit: 7633afce433bfc563f2cbe33a9205e0fc8f331b9
    dirty: false
  - path: src/frontend-svelte/src/lib/headerNavigation.svelte.ts
    hash: 4a38f86f6a96ac033b7f06d9f18d9f6452727903d99693f91f16ac19dd52526d
    commit: 7633afce433bfc563f2cbe33a9205e0fc8f331b9
    dirty: false
  - path: src/frontend-svelte/src/lib/Topbar.svelte
    hash: c52a4ad1a41d99d966a72919f3ea8da990f4fea37e751d1e73ea184dac771070
    commit: 7633afce433bfc563f2cbe33a9205e0fc8f331b9
    dirty: false
  - path: src/frontend-svelte/src/routes/Admin.svelte
    hash: 0ef5c165e230244cb9fa2d2fa60d45db52a912fb4c42790a79b6c6ec30e9da56
    commit: 7633afce433bfc563f2cbe33a9205e0fc8f331b9
    dirty: false
  - path: src/routes/config.ts
    hash: 417c86a901de21520a1d7d1e0ba931e5b9ed1f9f81b17ea1fe47a80dc581dddc
    commit: 7633afce433bfc563f2cbe33a9205e0fc8f331b9
    dirty: false
  - path: src/lib/config.ts
    hash: e07357da37d1c33da0afb866fa226cfd726270c694245cc484fe636091b98006
    commit: 7633afce433bfc563f2cbe33a9205e0fc8f331b9
    dirty: false
  - path: bin/cli.ts
    hash: cbbf78b195d6066b97e20c1c32914fab4af3cc99fdbbd6038059880f1d9f5fbf
    commit: 7633afce433bfc563f2cbe33a9205e0fc8f331b9
    dirty: false
  - path: starter-doc/.living-doc.json
    hash: 1465ffedd3d3bc7a4b1b456c612763f5f62561c2b3b5294e7d1b36eab141f0ca
    commit: 7633afce433bfc563f2cbe33a9205e0fc8f331b9
    dirty: false
  - path: starter-doc-fr/.living-doc.json
    hash: f02b5818935ce1bccebeaf5364b4a65d8807ee40cecbb2ac494b408e58e9f50e
    commit: 7633afce433bfc563f2cbe33a9205e0fc8f331b9
    dirty: false
---

## Contexte

Le header doit rester compact à la première installation tout en permettant à chaque projet de choisir les outils affichés. Masquer un menu ne désactive pas sa page.

## Décision

Les cinq menus optionnels sont Workspace (`/workspace`), Blueprint (`/blueprint`), Graph (`/graph`), Survival Kit (`/survival-kit`) et AI Context (`/context`). Leur liste et leur normalisation sont partagées dans `src/shared/headerNavigation.ts`.

Admin, Home, Favoris, Diagram, Files, Templates et Agents ne sont jamais masquables. Les liens obligatoires restent présents même sur leur propre page. Les liens de navigation sont dédupliqués par URL.

La configuration portable `.living-doc.json` contient `hiddenHeaderMenus: string[]`, une liste de routes masquées. Le serveur ignore les routes inconnues ou obligatoires et déduplique les valeurs ; PUT rejette une valeur non-tableau avec HTTP 400. Une valeur absente ou invalide à la lecture donne une liste vide : les anciens projets conservent ainsi leurs menus visibles.

Dans Admin → Menus du header, une case cochée signifie « afficher ». L’enregistrement applique immédiatement la réponse serveur au store Svelte. Les lectures de `/api/config` synchronisent également le store partagé via l’observateur existant. Les pages masquées restent accessibles par URL.

## Initialisation

Les starters EN et FR masquent explicitement les cinq routes. Avant le scaffolding, le CLI propose un sélecteur si stdin et stdout sont des terminaux TTY :

- toutes les cases sont initialement décochées ;
- ↑/↓ déplace le curseur, Espace coche ou décoche, Entrée valide ;
- Échap ou Ctrl+C annule avant de créer le projet ;
- les textes suivent la langue du starter ;
- les routes non cochées sont enregistrées comme masquées.

Le sélecteur utilise Node.js readline, sans nouvelle dépendance, et restaure le mode du terminal. En mode non interactif, aucune question supplémentaire n’est posée : les cinq menus restent masqués. `--starter-language` ne désactive pas le sélecteur dans un terminal interactif.

Les projets déjà configurés ne repassent pas par ce sélecteur. Ce défaut appartient au starter et au wizard, pas aux valeurs de repli utilisées pour les configurations existantes.

## Conséquences et validation

Le choix est réversible depuis Admin et ne constitue pas un contrôle d’accès. Les libellés frontend et CLI existent en anglais et français.

Les tests API couvrent persistance, filtrage des menus obligatoires, rejet du type invalide et remise à zéro. Le test navigateur couvre masquage, rechargement et réactivation. Les tests CLI vérifient les défauts des starters EN/FR ; la sélection avec flèches et Espace a aussi été vérifiée dans un terminal interactif.

La compilation et un lancement du CLI local dans un dossier temporaire suffisent pour tester une installation ; aucune publication npm n’est nécessaire. `npm pack` permet en complément d’inspecter le package distribué.
