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

- **Langage principal** : TypeScript côté serveur/CLI, JavaScript navigateur côté frontend.
- **Runtime** : Node.js >= 18.
- **Framework frontend** : HTML statique + scripts JavaScript modulaires, sans framework SPA.
- **Framework backend / serveur** : Express 5.
- **Base de données / stockage** : système de fichiers local ; `.living-doc.json`, `.metadata.json`, `.diagrams.json`, `.annotations.json`, `.shape-libraries.json` selon les fonctionnalités.
- **API externes / intégrations** : MCP Streamable HTTP sur `/mcp` via `@modelcontextprotocol/sdk`; assets CDN côté frontend pour Tailwind, highlight.js, Font Awesome et vis-network selon les pages.
- **Authentification / autorisation** : aucune authentification applicative ; outil local-first, avec protections de path traversal côté routes.
- **Styles / design system** : Tailwind via CDN avec plugin Typography ; thème clair/sombre piloté par config/localStorage ; syntax highlighting toujours sombre.
- **Gestion d'état frontend** : état mutable par modules plain JS (`src/frontend/state.js`, `src/frontend/diagram/state.js`) et persistance navigateur ciblée via `localStorage`.
- **Build / bundler** : pas de bundler frontend ; `tsc` compile le serveur/CLI puis `scripts/copy-assets.ts` copie `src/frontend/`, `starter-doc/` et `starter-doc-fr/` vers `dist/`.
- **Package manager** : npm, avec `package-lock.json`.
- **Tests** : Playwright comme runner unique API/E2E/unit ; les tests serveur lancent un vrai CLI isolé sur port libre.
- **Coverage** : c8 + couverture V8 native, agrégée depuis les processus CLI/serveur lancés par Playwright.
- **Qualité frontend** : `npm run check:frontend` exécute un contrôle syntaxique conservateur (`node --check`) sur `src/frontend/**/*.js`, sans bundler ni transpilation.
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
src/routes/*.ts                    <- routes REST documents, config, browse, files, diagrams, metadata, context, export...
src/mcp/server.ts                  <- serveur MCP Streamable HTTP exposé sur `/mcp`
src/mcp/tools/*.ts                 <- tools MCP documents, diagrams, source, metadata
src/frontend/index.html            <- shell viewer Markdown
src/frontend/admin.html            <- configuration projet
src/frontend/context.html          <- contexte IA, règles, instructions et explorateur MCP
src/frontend/diagram.html          <- shell éditeur de diagrammes
src/frontend/shape-editor.html     <- éditeur de bibliothèques de formes personnalisées
src/frontend/*.js                  <- modules frontend viewer/admin/context/search/metadata/export encore à plat
src/frontend/snippets/*.js         <- domaine snippets : détection, inline-edit, tables, listes, builders, parsers
src/frontend/modals/*.js           <- modales réutilisables ou spécialisées du viewer
src/frontend/diagram/*.js          <- modules spécialisés de l'éditeur vis-network
src/frontend/i18n/en.json          <- catalogue anglais obligatoire pour les libellés UI
src/frontend/i18n/fr.json          <- catalogue français obligatoire pour les libellés UI
scripts/copy-assets.ts             <- copie des assets non compilés vers `dist/`
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
- **Starter doc** : initialisation interactive bilingue qui scaffold un dossier docs, `AGENTS.md`, `CLAUDE.md`, `memory/MEMORY.md` et les symlinks sous `AI/`, plus un dossier `WORKLOG/` avec `current-task.md` et une règle `track-current-work` pour la reprise opérationnelle entre assistants IA.

## Conventions structurantes

- **Documentation comme source de vérité** : pour les diagrammes MCP, lire ou créer les documents source-of-truth avant de dessiner ; ne pas inventer d'acteurs ou relations absents des documents.
- **MCP avant édition manuelle** : quand le MCP est disponible, utiliser `read_document`, `update_document`, `create_document`, `add_metadata` et `refresh_metadata` pour maintenir la documentation.
- **Internationalisation obligatoire** : tout texte visible utilisateur doit exister dans `src/frontend/i18n/en.json` et `src/frontend/i18n/fr.json`; HTML via `data-i18n*`, JS dynamique via `window.t('key')`.
- **Frontend sans bundler** : les scripts sont chargés directement par les HTML ; tenir compte de l'ordre de chargement et éviter les imports impossibles côté navigateur. Regrouper les sous-domaines stables en feature folders (`snippets/`, `modals/`, `diagram/`) tout en conservant des chemins de scripts explicites dans les pages HTML.
- **Diagram editor modulaire** : modifier le module responsable sous `src/frontend/diagram/`; `vis` doit rester le seul global CDN de l'éditeur.
- **vis-network fragile** : avant de toucher au rendu diagramme, vérifier les ADR et règles sur `ctxRenderer`, `getBoundingBox`, `refreshNeeded`, `_drawNodes` et `_canonicalOrder`.
- **Confirmation destructive** : utiliser `window.showConfirm(...)` depuis `modals/confirm-modal.js` au lieu de `window.confirm()` pour les actions destructives côté frontend.
- **Chemins sûrs** : les routes qui lisent/écrivent des chemins utilisateur doivent résoudre puis vérifier que le chemin reste sous `docsFolder` ou `sourceRoot` selon le cas.
- **Config portable** : ne pas persister de chemins absolus dans `.living-doc.json`; stocker en relatif POSIX.
- **Tests de comportement** : privilégier les tests qui exercent le vrai CLI/serveur via Playwright et fixtures isolées ; les imports directs de `dist/` dans les specs ne doivent pas être la stratégie principale de coverage.
- **Règles IA** : appliquer toutes les règles de `documentation/AI/rules/*.md` dont `appliesTo` couvre les fichiers modifiés.
