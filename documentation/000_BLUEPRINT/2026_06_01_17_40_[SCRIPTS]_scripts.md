---
**date:** 2026-06-01
**status:** To be validated
**description:** Le dossier `scripts/` regroupe les scripts d'automatisation qui relient le build, le serveur de développement, les contrôles frontend, les hooks Git et les gates CI du projet.
**tags:** scripts, build, dev, npm, hooks, ci, readme-sync, zizmor, frontend-check, copy-assets
---

# Dossier `scripts/`

Le dossier `scripts/` contient l'outillage local du projet. Il ne fait pas partie du code applicatif servi directement par Living Documentation ; il sert à automatiser les tâches qui entourent le développement : préparer `dist/`, lancer un environnement de dev confortable, vérifier la syntaxe du frontend statique, et appliquer quelques garde-fous avant commit ou publication.

C'est un dossier volontairement petit : chaque script correspond à une responsabilité opérationnelle précise, appelée depuis `package.json`, depuis les hooks Git, ou depuis GitHub Actions.

## Vue d'ensemble

| Script | Déclencheur principal | Rôle |
|---|---|---|
| `scripts/copy-assets.ts` | `npm run build` | Copie les assets non compilés vers `dist/` après la compilation TypeScript. |
| `scripts/dev.js` | `npm run dev -- ./documentation` | Lance le serveur de développement avec compilation/watch du workspace frontend et redémarrage `nodemon`. |
| `scripts/check-frontend-js.js` | `npm run check:frontend` | Vérifie la syntaxe des fichiers `src/frontend/**/*.js` avec `node --check`. |
| `scripts/check-readme-sync.sh` | hook pre-commit, CI, `npm run check:readme-sync` | Impose que `README.md` et `README.fr.md` soient modifiés ensemble. |
| `scripts/check-workflows.sh` | hook pre-commit | Audite les workflows GitHub Actions staged avec `zizmor` quand l'outil est installé. |

## Pourquoi ce dossier existe

Le projet a une architecture mixte : un serveur/CLI TypeScript compilé, un frontend statique sans bundler, des starters de documentation embarqués dans le package npm, et des règles de contribution qui doivent rester faciles à exécuter localement.

Le dossier `scripts/` centralise donc les opérations qui ne sont ni du code métier, ni des tests, ni de la configuration pure :

- préparer le contenu publié dans `dist/` ;
- lancer plusieurs processus de développement en un seul `npm run dev` ;
- compenser l'absence de bundler frontend par un contrôle syntaxique explicite ;
- préserver le contrat bilingue des README ;
- détecter tôt les erreurs dangereuses dans les workflows GitHub Actions.

## Build et packaging

`copy-assets.ts` est l'étape de packaging des fichiers non produits par `tsc`.

Le build compile d'abord le TypeScript serveur/CLI, puis les frontends TypeScript spécialisés, puis appelle ce script pour recopier les assets nécessaires à l'exécution du package publié.

```bash
npm run build
```

Concrètement, le script :

1. supprime puis recopie `src/frontend/` vers `dist/src/frontend/` ;
2. supprime les anciens dossiers legacy `dist/starting-doc` et `dist/starting-doc-fr` ;
3. recopie `starter-doc/` et `starter-doc-fr/` vers `dist/` s'ils existent.

Cette étape est nécessaire parce que le frontend principal n'est pas bundlé : les fichiers HTML, CSS, JS navigateur, catalogues i18n et assets vendor doivent être présents tels quels dans `dist/`.

## Développement local

`dev.js` encapsule le mode développement.

```bash
npm run dev -- ./documentation
```

Il fait trois choses utiles :

1. compile une première fois le workspace frontend TypeScript ;
2. lance `tsc --watch` sur `src/frontend/workspace/tsconfig.json` ;
3. lance le CLI avec `ts-node bin/cli.ts` via `nodemon`, en surveillant `src/` et `bin/`.

Le script garde aussi la main sur les processus enfants. Si le watcher ou le serveur s'arrête, il stoppe les autres processus pour éviter de laisser un environnement de dev partiellement vivant.

## Qualité frontend

`check-frontend-js.js` fournit un garde-fou simple pour le frontend statique.

```bash
npm run check:frontend
```

Le script parcourt récursivement `src/frontend/`, collecte tous les fichiers `.js`, puis exécute :

```bash
node --check <fichier>
```

Ce contrôle valide uniquement la syntaxe JavaScript. Il ne remplace pas ESLint, ne détecte pas les globals manquants, et ne valide pas l'ordre de chargement des scripts dans les pages HTML. Son intérêt est ailleurs : trouver rapidement une erreur de syntaxe dans un frontend sans bundler, sans ajouter de dépendance ni transformer le modèle de chargement navigateur.

## Hooks Git et garde-fous locaux

Deux scripts shell sont appelés par `.githooks/pre-commit` lorsque le développeur a activé les hooks avec :

```bash
npm run setup-hooks
```

### Synchronisation des README

`check-readme-sync.sh` vérifie que les deux README publics restent des miroirs bilingues.

- En pre-commit, il compare l'index Git staged avec `HEAD`.
- En CI, il peut comparer avec une ref explicite, par exemple `origin/main` ou `HEAD~1`.
- Il échoue si un seul des deux fichiers `README.md` / `README.fr.md` est modifié.

Ce même contrôle est repris dans GitHub Actions :

- `.github/workflows/readme-sync.yml` sur les PR et les pushs vers `main` ;
- `.github/workflows/publish.yml` avant publication npm.

### Audit des workflows

`check-workflows.sh` vérifie les workflows GitHub Actions staged avec `zizmor`.

Son comportement est volontairement progressif :

- si aucun workflow n'est staged, il sort sans rien faire ;
- si `zizmor` n'est pas installé localement, il affiche un avertissement et ne bloque pas le commit ;
- si `zizmor` est disponible, il audite les workflows modifiés ;
- avec `--all`, il audite tout `.github/`.

```bash
./scripts/check-workflows.sh --all
```

La CI garde un workflow `zizmor.yml` dédié, donc le contrôle local reste une aide rapide plutôt qu'une dépendance obligatoire pour contribuer.

## Carte mentale des flux

```text
npm run build
  -> tsc
  -> tsc workspace frontend
  -> tsc blueprint frontend
  -> scripts/copy-assets.ts
  -> chmod +x dist/bin/cli.js

npm run dev -- ./documentation
  -> scripts/dev.js
     -> tsc workspace frontend --watch
     -> nodemon --exec "ts-node bin/cli.ts ./documentation"

npm run check:frontend
  -> scripts/check-frontend-js.js
     -> node --check sur src/frontend/**/*.js

git commit
  -> .githooks/pre-commit
     -> scripts/check-readme-sync.sh
     -> scripts/check-workflows.sh

GitHub Actions
  -> readme-sync.yml / publish.yml
     -> scripts/check-readme-sync.sh <base-ref>
```

## Quand modifier un script

Modifier `scripts/` est approprié quand le changement concerne une tâche transversale : build, dev server, packaging, vérification locale, hook Git ou CI.

Quelques règles pratiques :

- si un script change une commande npm, mettre aussi à jour `package.json` et `documentation/AI/PROJECT-USEFUL-COMMANDS.md` ;
- si `copy-assets.ts` change ce qui est embarqué dans `dist/`, vérifier `npm run build` ;
- si `dev.js` change le cycle de dev local, vérifier au moins un démarrage `npm run dev -- ./documentation` ;
- si un script shell de hook change, tester le cas nominal et le cas d'échec ;
- si un workflow GitHub dépend du script, vérifier aussi le YAML qui l'appelle.

## Ce que ce dossier n'est pas

`scripts/` n'est pas une couche métier et ne doit pas devenir un dossier fourre-tout. Le code serveur durable vit sous `src/`, les tests sous `tests/`, les instructions IA sous `documentation/AI/`, et les décisions durables sous `documentation/ADRS/`.

Un nouveau fichier dans `scripts/` devrait répondre à une question simple : quelle action répétable du projet ce script automatise-t-il, et depuis quel point d'entrée est-il appelé ?
