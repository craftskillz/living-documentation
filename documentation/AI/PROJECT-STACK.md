---
type: Technical Doc
title: PROJECT STACK
sources:
  - path: bin/cli.ts
    hash: 11345c1291c720eb4d2c9f7ec6c047a94f3b205d2c169be1cc12e5c5b966841a
    commit: be260560beaadd1bcaf8dfadf1a73d4679b5f1d5
    dirty: false
  - path: src/server.ts
    hash: d2e9da7a978c63f86016c00a55ba313c58cc03b5ad8ca8da36cc5e1472a52c52
    commit: be260560beaadd1bcaf8dfadf1a73d4679b5f1d5
    dirty: false
  - path: src/lib/config.ts
    hash: 363d4620f8e48feff650fe6a4dcfac737c27a754f0f608c2854966d448a7e157
    commit: be260560beaadd1bcaf8dfadf1a73d4679b5f1d5
    dirty: false
  - path: src/lib/parser.ts
    hash: 371fbb9676a0b8144f9f8a009d8f9ecf1fa785985308fc95083e90603cff6aed
    commit: be260560beaadd1bcaf8dfadf1a73d4679b5f1d5
    dirty: false
  - path: src/lib/metadata.ts
    hash: 0498b125bfb38061564a132641c123f1d0ca634664c81f13cd25d465de1f9175
    commit: be260560beaadd1bcaf8dfadf1a73d4679b5f1d5
    dirty: false
  - path: src/mcp/server.ts
    hash: 30439109036b7a19bf4b17dbf125fde8ec15b4a805a04de78529365690f06341
    commit: be260560beaadd1bcaf8dfadf1a73d4679b5f1d5
    dirty: false
  - path: src/frontend/diagram/main.js
    hash: 0d59628fd8a24326e20b82ad224df83775d41ca19381261686756e1ee69535d4
  - path: scripts/copy-assets.ts
    hash: ffdb3d3b63a943a0d0eb4988f8fe71aa7e4fb937f4426a1e94bd6436ce4ae240
    commit: be260560beaadd1bcaf8dfadf1a73d4679b5f1d5
    dirty: false
---

# PROJECT-STACK - Living Documentation

Ce fichier donne à l'assistant IA une vue rapide et factuelle du projet. Il doit rester court, concret et maintenu en continu.

Il ne remplace pas les ADR : il sert à savoir rapidement où regarder, quelles technologies sont en jeu et quels concepts structurent le code. Pour le pourquoi détaillé d'une décision, lire les ADR pertinents.

## Règle de maintenance

L'IA doit proposer une mise à jour de ce fichier lorsqu'une tâche :

- introduit, retire ou remplace une technologie importante ;
- modifie une convention structurante ;
- ajoute ou déplace une zone source importante ;
- change un concept métier ou technique central ;
- rend une information ci-dessous fausse ou incomplète.

Ne pas documenter ici les détails volatils, les TODO temporaires ou les informations qui appartiennent clairement à un ADR.

## Vue d'ensemble

Living Documentation est un outil CLI Node.js/TypeScript qui sert un viewer local de documentation Markdown via Express. Il vise deux usages complémentaires : hub de documentation local pour projets Git, et source de vérité active pour agents IA via un serveur MCP intégré.

L'utilisateur lance le CLI avec un dossier de documentation relatif, par exemple `npx living-ai-documentation ./documentation`. L'application sert ensuite une UI locale permettant de lire, rechercher, éditer, annoter, exporter et diagrammer les documents Markdown. Les documents, images, fichiers joints, diagrammes, métadonnées et configuration restent sur disque, dans ou près du dossier de documentation.

## Stack technique

- **Langage principal** : TypeScript côté serveur/CLI ; côté frontend, application Svelte 5 (TypeScript + composants `.svelte`).
- **Runtime** : Node.js >= 20.19.0, minimum imposé par Vite 8 ; Commander 14 requiert également Node.js >= 20.
- **Framework frontend** : application **Vite + Svelte 5 (runes)** unifiée sous `src/frontend-svelte/`, routée par `pathname` dans `App.svelte`, regroupant les 10 écrans (Home, Workspace, Admin, Blueprint, Agents, Files, AI Context, Diagram, Shape-editor, Survival Kit). Voir l'ADR `[FRONTEND] migration du frontend vers une application svelte unifiee`.
- **Framework backend / serveur** : Express 5.
- **Base de données / stockage** : système de fichiers local ; `.living-doc.json`, `.metadata.json`, `.diagrams.json`, `.annotations.json`, `.shape-libraries.json` et `.survival-kit.json` selon les fonctionnalités.
- **API externes / intégrations** : MCP Streamable HTTP sur `/mcp` via `@modelcontextprotocol/sdk`; assets CDN côté frontend pour Tailwind, highlight.js, Font Awesome, mermaid et vis-network selon les routes; TTS local optionnel via `kokoro-js` pour l'anglais.
- **Authentification / autorisation** : aucune authentification applicative ; outil local-first, avec protections de path traversal côté routes.
- **Styles / design system** : Tailwind via CDN avec plugin Typography ; CSS partagée `src/frontend-svelte/src/styles/app.css` ; thème clair/sombre piloté par config/localStorage (la Home porte le dark mode) ; syntax highlighting toujours sombre. ATTENTION : toute CSS importée par un composant Svelte est bundlée **globalement** par Vite , scoper les sélecteurs génériques (`[data-blueprint]`, `.ld-shape-editor`).
- **Gestion d'état frontend** : runes Svelte (`$state`) , stores réactifs (ex. `lib/home/state.svelte.ts`, `lib/i18n.svelte.ts`) ; les moteurs impératifs réutilisés (Workspace canvas, Diagram vis-network) gardent un état mutable (`lib/diagram/state.js`) ; persistance ciblée via `localStorage`.
- **Build / bundler** : `tsc` compile le serveur/CLI ; **Vite** build le frontend (`src/frontend-svelte/vite.config.ts` → `dist/frontend-svelte/`) ; `scripts/copy-assets.ts` ne copie plus que `starter-doc/` et `starter-doc-fr/` vers `dist/`.
- **Package manager** : npm, avec `package-lock.json`.
- **Tests** : Playwright comme runner unique API/E2E/unit ; les tests serveur lancent un vrai CLI isolé sur port libre. NOTE : les specs E2E ciblant l'ancien frontend vanilla sont à réécrire pour l'UI Svelte.
- **Coverage** : c8 + couverture V8 native, agrégée depuis les processus CLI/serveur lancés par Playwright.
- **Qualité frontend** : typage via `svelte-check` / `tsc` et build Vite (le script legacy `check:frontend` a été supprimé avec le frontend vanilla).
- **Lint / formatage** : aucun script ESLint/format dédié documenté dans `package.json` à ce jour.
- **Déploiement / publication** : package npm `living-ai-documentation`; `prepublishOnly` lance le build.

## Arborescence source utile

```text
bin/cli.ts                         <- entrée CLI Commander, wizard d'initialisation, validation du dossier relatif
src/server.ts                      <- app Express, montage des routes API, frontend statique et MCP
src/lib/config.ts                  <- lecture/écriture `.living-doc.json`, chemins relatifs portables, migration legacy
src/lib/parser.ts                  <- parsing du filenamePattern et extraction date/catégorie/titre
src/lib/metadata.ts                <- stockage des bindings source + calcul de fiabilité
src/lib/hash.ts                    <- hash SHA-256 des fichiers source
src/lib/documentLanguage.ts        <- lecture/ecriture de la langue documentaire dans le frontmatter Markdown
src/lib/tts/*                      <- port TTS serveur et adapter Kokoro
src/routes/*.ts                    <- routes REST documents, config, browse, files, diagrams, metadata, context, export...
src/routes/survival-kit.ts         <- persistance JSON du dashboard tâches, notes et liens
src/mcp/server.ts                  <- serveur MCP Streamable HTTP exposé sur `/mcp`
src/mcp/tools/*.ts                 <- tools MCP documents, diagrams, source, metadata
src/frontend-svelte/index.html     <- shell HTML de l'app Vite (charge Tailwind, FA, mermaid, hljs, vis, wordcloud2)
src/frontend-svelte/vite.config.ts <- config Vite (plugin svelte, outDir dist/frontend-svelte, proxy /api,/mcp,/images,/files)
src/frontend-svelte/src/App.svelte <- routeur par pathname → composants de route
src/frontend-svelte/src/routes/*.svelte        <- une route par écran (Home, Workspace, Admin, Blueprint, Agents, Files, AiContext, Diagram, ShapeEditor)
src/frontend-svelte/src/lib/survival-kit/*     <- store et panneaux tâches, notes et liens du Survival Kit
src/frontend-svelte/src/lib/Topbar.svelte      <- topbar partagée (nav + slots children/actions)
src/frontend-svelte/src/lib/i18n.svelte.ts     <- store i18n runes (loadI18n + t), sert /i18n/*.json
src/frontend-svelte/src/lib/home/*             <- domaine viewer Home : sidebar, DocViewer, annotations, metadata, recherche locale, wordcloud, modals
src/frontend-svelte/src/lib/home/snippets/*    <- snippets (builders, parsers, detect, table, tree, listMarkdown, pickerData)
src/frontend-svelte/src/lib/blueprint/*        <- composants Blueprint (canvas Prezi)
src/frontend-svelte/src/lib/workspace/*        <- moteur Workspace (app.ts HTML-in-canvas + persistence)
src/frontend-svelte/src/lib/diagram/*          <- 30 modules ES de l'éditeur vis-network + main.js (initDiagram) + shapeEditor
src/frontend-svelte/public/i18n/en.json        <- catalogue anglais obligatoire pour les libellés UI
src/frontend-svelte/public/i18n/fr.json        <- catalogue français obligatoire pour les libellés UI
scripts/copy-assets.ts             <- copie des starter-docs vers `dist/` (le frontend est buildé par Vite)
starter-doc/                       <- starter de documentation anglais empaqueté
starter-doc-fr/                    <- starter de documentation français empaqueté
tests/api/*.spec.ts                <- tests API et CLI via Playwright
tests/e2e/*.spec.ts                <- tests navigateur E2E
tests/helpers/*.ts                 <- fixtures, serveur CLI isolé, hooks coverage
tests/unit/*.spec.ts               <- tests unitaires de lisibilité, pas la source principale de coverage
playwright.config.ts               <- configuration Playwright Chromium
justfile                           <- raccourcis locaux optionnels (`just dev`, `just build`, `just start`)
documentation/AI/                 <- instructions IA, stack, commandes, règles
documentation/ADRS/               <- journal des décisions durables
memory/                           <- mémoire projet locale indexée par `memory/MEMORY.md`
```

## Concepts centraux

- **Document Markdown** : unité principale de lecture/édition, stockée en `.md` sous le dossier de documentation ou déclarée dans `extraFiles`.
- **Filename pattern** : convention configurable, par défaut `YYYY_MM_DD_HH_mm_[Category]_title`, utilisée pour extraire date, catégorie et titre.
- **Configuration portable** : `.living-doc.json` stocke les chemins en relatif au dossier docs ; `docsFolder` et `sourceRoot` sont résolus à l'exécution.
- **Extra files** : fichiers Markdown hors dossier docs, whitelistés en config et affichés dans la section General.
- **Métadonnées source** : bindings entre documents et fichiers source, stockés avec hash SHA-256 pour détecter la dérive documentaire.
- **Fiabilité / accuracy** : indicateur calculé depuis les métadonnées ; une entrée modifiée ou manquante fait baisser la jauge.
- **MCP Living Documentation** : canal privilégié pour agents IA ; expose lecture/écriture documents, diagrammes, source et métadonnées.
- **ADR** : document durable de décision ; les nouveaux ADR créés par IA commencent en statut `To be validated` et doivent être reliés aux fichiers source pertinents.
- **Worklog** : point de reprise opérationnel partagé entre assistants IA, scaffolde sous `WORKLOG/current-task.md` par le starter ; lu avant action, mis à jour avant handoff, pas un substitut aux ADR.
- **Diagrammes** : vues dérivées de la documentation, stockées en JSON et éditées via vis-network ; les diagrammes MCP doivent citer leur provenance documentaire (`evidence`).
- **Contexte IA** : page `/context` et documents `AI/*` qui exposent instructions, règles, mémoire et explorateur MCP.
- **Survival Kit** : dashboard local `/survival-kit` pour tâches, notes structurées et liens catégorisés, persisté dans `<docsFolder>/.survival-kit.json`.
- **Starter doc** : initialisation interactive bilingue qui scaffold un dossier docs, `AGENTS.md`, `CLAUDE.md`, `memory/MEMORY.md` et les symlinks sous `AI/`, plus un dossier `WORKLOG/` avec `current-task.md` et une règle `track-current-work` pour la reprise opérationnelle entre assistants IA.
- **Lecture TTS** : le viewer Home lit la langue dans le frontmatter (`language`, `lang`, `locale`, `langue`) ou la demande à l'utilisateur; la lecture passe par le port serveur `TtsEngine`/Kokoro, qui supporte actuellement `en` et renvoie une erreur explicite pour `fr`.

## Conventions structurantes

- **Documentation comme source de vérité** : pour les diagrammes MCP, lire ou créer les documents source-of-truth avant de dessiner ; ne pas inventer d'acteurs ou relations absents des documents.
- **MCP avant édition manuelle** : quand le MCP est disponible, utiliser `read_document`, `update_document`, `create_document`, `add_metadata` et `refresh_metadata` pour maintenir la documentation.
- **Internationalisation obligatoire** : tout texte visible utilisateur doit exister dans `src/frontend-svelte/public/i18n/en.json` et `fr.json`; dans les composants Svelte, utiliser `{t('key')}` (import `{ t, loadI18n } from "../lib/i18n.svelte"`), pas de `data-i18n`/`window.t`. Chaque route appelle `loadI18n(lang)` au montage.
- **Frontend bundlé par Vite** : les écrans sont des routes/composants Svelte ; ajouter une route = nouveau `.svelte` dans `routes/` + branche dans `App.svelte`. Les moteurs impératifs réutilisés (Workspace, Diagram) câblent le DOM par `getElementById` → conserver les `id` du markup et exposer un `init*()` appelé dans `onMount` (Diagram importe `main.js` dynamiquement car il touche le DOM au chargement).
- **Diagram editor modulaire** : modifier le module responsable sous `src/frontend-svelte/src/lib/diagram/`; `vis` (vis-network) doit rester le seul global CDN de l'éditeur ; conteneur réseau = `#vis-canvas`.
- **vis-network fragile** : avant de toucher au rendu diagramme, vérifier les ADR et règles sur `ctxRenderer`, `getBoundingBox`, `refreshNeeded`, `_drawNodes` et `_canonicalOrder`.
- **Confirmation destructive** : utiliser le composant partagé `lib/ConfirmDialog.svelte` (`confirmDialog.show({...})`) plutôt que `window.confirm()` pour les actions destructives côté frontend.
- **Chemins sûrs** : les routes qui lisent/écrivent des chemins utilisateur doivent résoudre puis vérifier que le chemin reste sous `docsFolder` ou `sourceRoot` selon le cas.
- **Config portable** : ne pas persister de chemins absolus dans `.living-doc.json`; stocker en relatif POSIX.
- **Tests de comportement** : privilégier les tests qui exercent le vrai CLI/serveur via Playwright et fixtures isolées ; les imports directs de `dist/` dans les specs ne doivent pas être la stratégie principale de coverage.
- **Règles IA** : appliquer toutes les règles de `documentation/AI/rules/*.md` dont `appliesTo` couvre les fichiers modifiés.
