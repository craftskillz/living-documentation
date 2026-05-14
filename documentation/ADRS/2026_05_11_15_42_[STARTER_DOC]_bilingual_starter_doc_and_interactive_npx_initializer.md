---
**date:** 2026-05-11
**status:** To be validated
**description:** Le CLI living-ai-documentation lance un wizard interactif quand aucun dossier n'est fourni, scaffolde un starter EN ou FR (starter-doc / starter-doc-fr) avec PROJECT-INSTRUCTIONS et exemples d'ADR, et installe AGENTS.md, CLAUDE.md, memory/MEMORY.md à la racine du projet liés via symlinks dans le dossier AI.
**tags:** cli, npx, init, wizard, starter-doc, starter-doc-fr, language-selection, scaffolding, agents.md, claude.md, memory.md, project-instructions, symlink, DOCS_FOLDER
---

# Starter doc bilingue et initialiseur npx interactif

## Contexte

`npx living-ai-documentation` exigeait jusqu'ici un dossier de documentation **déjà existant** passé en argument. Conséquences :

- L'expérience first-run consistait à se débrouiller pour créer un dossier vide, le passer en argument, puis copier-coller des exemples depuis le repo. Friction élevée pour un outil qui se veut « zero-setup ».
- Aucun **starter pack** n'accompagnait l'outil : pas d'exemples d'ADRs, pas de `PROJECT-INSTRUCTIONS.md`, pas de point d'entrée explicite pour expliquer à un agent IA comment naviguer le projet.
- Le contenu pédagogique du repo principal était figé en français. Les utilisateurs anglophones n'avaient pas d'équivalent localisé.

## Décision

### 1. Deux templates `starter-doc/` et `starter-doc-fr/`

Le repo embarque deux arbres parallèles, copiés tel quel dans `dist/` par [scripts/copy-assets.ts](scripts/copy-assets.ts) :

```
starter-doc/
├── ADRS/
│   └── 2026_01_01_[ADR]_example_architecture_decision.md
├── AI/
│   ├── 2026_01_01_how_to.md
│   ├── PROJECT-INSTRUCTIONS.md
│   ├── default/
│   │   ├── AGENTS.md
│   │   ├── CLAUDE.md
│   │   └── MEMORY.md
│   └── rules/
│       └── no-magic-numbers.md
└── .living-doc.json
```

`starter-doc-fr/` reproduit la même arborescence en français. Le choix de **deux dossiers parallèles** (plutôt qu'un système de templates paramétré) garde le scaffolding lisible : c'est exactement ce que l'utilisateur recevra, mot pour mot.

Le placeholder `DOCS_FOLDER` est remplacé en place après copie (via `replaceDocsFolderPlaceholders` dans [bin/cli.ts](bin/cli.ts)) pour que les exemples référencent le vrai nom de dossier choisi par l'utilisateur.

### 2. Wizard interactif déclenché par l'absence d'argument

Quand `npx living-ai-documentation` est appelé **sans** dossier, `runInitWizard()` prend la main :

1. Demande le dossier cible (relatif, refus des chemins absolus ou `~`).
2. Refuse si le dossier existe et est non vide.
3. Demande la langue du starter (`en` / `fr`), avec defaut `en` en mode non-TTY ou via l'option `--starter-language <en|fr>`.
4. Vérifie que `AGENTS.md`, `CLAUDE.md`, `memory/MEMORY.md` du projet hôte sont **absents ou vides** (refus sinon — on ne réécrit jamais le travail de l'utilisateur).
5. Copie le starter, remplace `DOCS_FOLDER`, copie les 3 fichiers d'orientation depuis `<docs>/AI/default/` vers la racine du projet, puis crée 3 **symlinks** dans `<docs>/AI/` pointant vers ces fichiers racine.
6. Supprime `<docs>/AI/default/` (consommé) et démarre le serveur sur le port choisi.

L'option `--starter-language` reste disponible pour scripter l'init sans interaction.

### 3. Fichiers d'orientation à la racine du projet

Le choix d'écrire `AGENTS.md`, `CLAUDE.md` et `memory/MEMORY.md` **à la racine** (et non dans `<docs>/AI/`) est délibéré :

- Les agents IA (Claude Code, Codex, etc.) cherchent ces fichiers à la racine du projet ou dans `~/.claude/` — pas dans un sous-dossier de documentation.
- Le symlink dans `<docs>/AI/<filename>` les rend visibles depuis la page `/context` du viewer sans dupliquer leur contenu.

Si l'un de ces 3 fichiers existe déjà avec du contenu, l'initialiseur **avorte** plutôt que d'écraser. L'utilisateur doit alors choisir un autre project root ou vider le fichier.

### 4. Convention `PROJECT-INSTRUCTIONS.md` consolidé

Le starter inclut un unique `PROJECT-INSTRUCTIONS.md` (et non plusieurs « flavors » comme dans une itération antérieure). Raison : un projet vit avec un seul jeu d'instructions. Demander à l'utilisateur de choisir entre `backend-api` / `frontend-app` / `library-cli` / `monorepo` ajoutait de la friction sans bénéfice clair — le contenu pertinent peut être ajusté à la main après init.

## Conséquences

### PROS

- L'expérience first-run devient : `npx living-ai-documentation` → réponses au wizard → viewer ouvert avec un projet de doc valide pré-rempli. Démo possible en moins de 30 secondes.
- Le starter bilingue ouvre l'outil à un public non-francophone sans dégrader l'expérience FR.
- Les fichiers d'orientation IA sont posés à la bonne place du premier coup — l'utilisateur n'a pas à connaître la convention d'agent IA pour en bénéficier.
- La séparation `default/` (consommé à l'init) vs `rules/` (conservé) rend le starter auto-explicatif.

### CONS

- Deux arbres parallèles à maintenir : tout ajout pédagogique doit être traduit. Pas de mécanisme de drift detection entre les deux (à la différence des docs versionnées).
- Le wizard suppose un terminal interactif (TTY). En CI sans `--starter-language` explicite, le defaut `en` est imposé silencieusement.
- Les symlinks ne sont pas portables sur tous les filesystems (Windows non-NTFS). Pas de fallback copie ; à ajouter si un utilisateur le demande.
- Le placeholder `DOCS_FOLDER` est remplacé par recherche-substitution simple : un mot littéral `DOCS_FOLDER` dans un exemple de code serait remplacé par erreur. Acceptable tant que le starter contrôle son propre contenu.
