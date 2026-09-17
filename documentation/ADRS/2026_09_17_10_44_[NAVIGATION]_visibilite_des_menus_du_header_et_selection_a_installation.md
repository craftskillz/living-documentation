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
    commit: 312b19e73af7e14376026829c53993831639facb
    dirty: false
  - path: src/lib/cli/headerMenuPrompt.ts
    hash: 1a016eff6f72a2e2fc9268f62051b01ca9172597bb57293caa3172c0f957d528
    commit: b31c7fa53a6bd332a292b97d6c0f99785b5d7020
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
