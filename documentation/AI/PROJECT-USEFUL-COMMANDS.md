---
type: Technical Doc
title: PROJECT USEFUL COMMANDS
sources:
  - path: bin/cli.ts
    hash: cbbf78b195d6066b97e20c1c32914fab4af3cc99fdbbd6038059880f1d9f5fbf
    commit: 87b83ec5cc9a45ba0ad694778e1965f4fadbf7c9
    dirty: false
  - path: scripts/copy-assets.ts
    hash: ffdb3d3b63a943a0d0eb4988f8fe71aa7e4fb937f4426a1e94bd6436ce4ae240
    commit: 87b83ec5cc9a45ba0ad694778e1965f4fadbf7c9
    dirty: false
  - path: playwright.config.ts
    hash: bd5ec053a7955be0aff01d803d5b8ccf76f5caf3975d14d01add39131305dfa0
    commit: 87b83ec5cc9a45ba0ad694778e1965f4fadbf7c9
    dirty: false
  - path: tests/helpers/coverage.ts
    hash: b0618f93d98a05007f90655a43399c0d1dde0ffc821714fca078ebcc314159fe
    commit: 87b83ec5cc9a45ba0ad694778e1965f4fadbf7c9
    dirty: false
  - path: justfile
    hash: 59f755e76ae6bb1d9ac82a369d7aa6c1690b210929503d2e444e755203fee785
    commit: 87b83ec5cc9a45ba0ad694778e1965f4fadbf7c9
    dirty: false
  - path: tests/helpers/ld-fixture.ts
    hash: c515f734fecb2cbce3d6865da3587e6ee076aa9653bdf4bb328f9fb3a187cb53
    commit: 87b83ec5cc9a45ba0ad694778e1965f4fadbf7c9
    dirty: false
  - path: src/lib/cli/headerMenuPrompt.ts
    hash: 1a016eff6f72a2e2fc9268f62051b01ca9172597bb57293caa3172c0f957d528
    commit: 87b83ec5cc9a45ba0ad694778e1965f4fadbf7c9
    dirty: false
  - path: package.json
    hash: 73586ecb456b3247ce7d9444eca70c7920b166e90678bfb85ded2aebbdbadf7b
    commit: 87b83ec5cc9a45ba0ad694778e1965f4fadbf7c9
    dirty: false
  - path: tests/api/cli.spec.ts
    hash: 12887cfe8f8c0084d6c7b6a31f12b1286087627eb6bca3706bba9767290c42bf
    commit: 87b83ec5cc9a45ba0ad694778e1965f4fadbf7c9
    dirty: false
  - path: tests/api/config.spec.ts
    hash: 630668a6acedaf6e86bb365056c6efbb7fe70cd610d48accd32bb9f9647e3332
    commit: 87b83ec5cc9a45ba0ad694778e1965f4fadbf7c9
    dirty: false
  - path: tests/e2e/header-navigation.spec.ts
    hash: ece5b5a0d23f1e1ab9155719ef51f5702ddface6ac0bf9b32a393dce70e00a8f
    commit: 87b83ec5cc9a45ba0ad694778e1965f4fadbf7c9
    dirty: false
---

# PROJECT-USEFUL-COMMANDS - Living Documentation

Ce fichier décrit les commandes réellement utiles pour travailler sur le projet. Il doit permettre à une IA de choisir la bonne vérification sans deviner.

Il doit rester à jour. Une commande fausse coûte plus cher qu'une commande absente.

## Règle de maintenance

L'IA doit proposer une mise à jour de ce fichier lorsqu'une tâche :

- ajoute, retire ou renomme un script de développement ;
- change le package manager ;
- change la commande de build, test, lint ou formatage ;
- introduit une étape de setup nécessaire ;
- révèle qu'une commande documentée ne marche plus.

Avant d'ajouter une commande, vérifier qu'elle existe réellement dans `package.json`, un Makefile, un script ou la documentation du projet.

## Package manager

Le projet utilise `npm`.

Indices : `package-lock.json` est présent, les scripts officiels sont dans `package.json`, et les commandes documentées ci-dessous utilisent `npm run ...`.

## Installation

| Commande                          | Quand l'utiliser                                                        | Notes                                                                            |
| --------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `npm install`                     | Après clone, changement de dépendances ou suppression de `node_modules` | Requiert Node.js >= 20.19.0 (minimum Vite 8 ; Commander 14 requiert Node.js 20). |
| `npx playwright install chromium` | Si Playwright ne trouve pas Chromium localement                         | Généralement nécessaire dans un environnement frais ou CI sans cache navigateur. |

## Développement local

| Commande                                                  | Effet                                                                 | Notes                                                                                                                                                                                                                                                                |
| --------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev -- ./documentation`                          | Démarre le frontend Vite (port 5174) + le backend Express en mode dev | `scripts/dev.js` lance Vite (HMR frontend) et `nodemon` + `ts-node` (backend seul : surveille `src`/`bin` `.ts`, ignore `src/frontend-svelte`). Backend port 4321 ; **ouvrir l'UI sur http://localhost:5174**. Proxy Vite : `/api`,`/mcp`,`/images`,`/files` → 4321. |
| `npm run dev -- ./example-doc`                            | Démarre le serveur de dev sur la documentation d'exemple              | Utile pour vérifier une UX sans modifier la documentation projet.                                                                                                                                                                                                    |
| `npm run start -- ./documentation`                        | Lance le CLI compilé depuis `dist/bin/cli.js`                         | Nécessite `npm run build` avant si `dist/` n'est pas à jour.                                                                                                                                                                                                         |
| `node dist/bin/cli.js ./documentation --port 4321 --open` | Lance explicitement l'artefact buildé                                 | Utile pour reproduire le comportement publié/npm.                                                                                                                                                                                                                    |
| `npx living-ai-documentation ./documentation`             | Lance la version installée/résolue par npm                            | Sert surtout à vérifier le flux utilisateur publié, pas le code local non buildé.                                                                                                                                                                                    |
| `just dev`                                                | Raccourci local pour `npm run dev -- ./documentation`                 | Optionnel ; `just` est déclaré dans `mise.toml`.                                                                                                                                                                                                                     |
| `just start`                                              | Raccourci local pour `npm run start -- ./documentation`               | Nécessite un build à jour.                                                                                                                                                                                                                                           |

### Configuration TTS locale

Le TTS est low footprint : l'anglais utilise `kokoro-js` côté serveur si l'optional dependency est installée. Le français peut être choisi et persisté dans le frontmatter, mais Kokoro renvoie une erreur explicite tant qu'un moteur de qualité comparable n'est pas disponible.

| Commande / variable                                  | Effet                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `LD_TTS_ENGINE=kokoro npm run dev -- ./documentation` | Force l'adapter serveur Kokoro pour les appels `/api/tts` côté anglais.   |

## Build et qualité

| Commande                                                     | Effet                                                                                                                         | Quand la lancer                                                                     |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run build`                                              | `tsc` (serveur/CLI) + `vite build` (frontend → `dist/frontend-svelte/`) + copie des starter-docs + `chmod +x dist/bin/cli.js` | Après changement TypeScript, frontend Svelte, starter doc ou script de build.       |
| `npx vite build --config src/frontend-svelte/vite.config.ts` | Build/vérifie uniquement le frontend Svelte                                                                                   | Itération frontend rapide sans rebuilder le backend.                                |
| `npm test`                                                   | Alias de `npm run test:e2e`                                                                                                   | Vérification complète par défaut après changement de comportement.                  |
| `npm run test:e2e`                                           | Lance `npm run build` puis `playwright test`                                                                                  | Après changement API, CLI, frontend ou comportement utilisateur.                    |
| `npm run test:e2e:ui`                                        | Ouvre Playwright UI mode                                                                                                      | Pour debug interactif, traces et replay.                                            |
| `npm run test:coverage`                                      | Nettoie `coverage/`, build, lance Playwright avec `COVERAGE=1` et agrège via c8                                               | Pour vérifier la couverture serveur/CLI avant publication ou refactor significatif. |

### Contrôles OKF

- `npm run test:unit` : tests Node.js `node:test` sous `tests/unit/*.test.ts`, chargés via ts-node ; ne requiert pas de build préalable.
- `npm run okf:validate` : validation en lecture seule du bundle `documentation/` ; erreurs bloquantes, avertissements non bloquants.
- `node dist/bin/cli.js migrate ./docs --dry-run` : prévisualise la migration ; retirer `--dry-run` pour migrer réellement.
- `tests/helpers/ld-fixture.ts` migre la copie temporaire via le CLI avant de démarrer le serveur. Les fixtures source restent intactes.

### Raccourcis `just` pour les tests

Les cibles de test ci-dessous, sauf le mode UI interactif `test-ui-watch`, **buildent d'abord** (les tests unit importent `dist/`, les e2e/api lancent le CLI buildé), reproduisant les conditions CI.

| Commande              | Effet                                                                             |
| --------------------- | --------------------------------------------------------------------------------- |
| `just test`           | Suite complète (api + unit + e2e), headless, comme la CI.                         |
| `just test-api`       | Uniquement les tests API (HTTP sur le CLI lancé), headless.                       |
| `just test-unit`      | Specs Playwright historiques (parser, constantes de shapes) ; les tests OKF `.test.ts` se lancent séparément avec `npm run test:unit`.                    |
| `just test-ui`        | Tests UI/e2e headless (sans fenêtre navigateur). Filtres : `just test-ui viewer`. |
| `just test-ui-headed` | Tests UI/e2e en mode `--headed` : on voit le navigateur exécuter les tests.       |
| `just test-ui-watch`  | Runner interactif Playwright (`--ui`) : watch, traces, replay.                    |

### Raccourcis `just` pour la sécurité CI (zizmor)

Audit local des workflows GitHub Actions (le binaire `zizmor` doit être installé ; il l'est via `~/.local/bin`).

| Commande         | Effet                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `just audit`     | `zizmor .github/workflows/` , liste les findings de sécurité (exit 14 s'il en reste d'actifs).                                                                           |
| `just audit-fix` | `zizmor --fix=all --gh-token "$(gh auth token)"` puis re-audit , pinne les actions sur SHA, corrige les injections, etc. Nécessite un token GitHub (résolution des SHA). |

Les 2 findings `cache-poisoning` résiduels sur `publish.yml` sont des faux positifs documentés et supprimés via `.github/zizmor.yml`.

Biome est disponible : `npm run lint` analyse le code, `npm run lint:ci` exécute les contrôles CI sans modification ; `npm run lint:fix` applique les corrections sûres, `lint:fix:unsafe` demande une revue des changements. Aucun script `format` n'existe. Le typage frontend est assuré par `svelte-check`/`tsc` et le build Vite (le script `check:frontend` a été supprimé avec le frontend vanilla).

## Tests ciblés

Playwright accepte les filtres habituels. Toujours garder en tête que `npm run test:e2e` rebuilde avant de tester.

| Commande                                                                 | Périmètre                                                                                                                        |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `npx playwright test tests/api/documents.spec.ts`                        | Un fichier de tests API précis, sans passer par le script qui build automatiquement. Lancer `npm run build` avant si nécessaire. |
| `npx playwright test tests/e2e/viewer.spec.ts`                           | Un fichier E2E précis.                                                                                                           |
| `npx playwright test -g "nom du test"`                                   | Tests dont le titre matche le grep Playwright.                                                                                   |
| `npx playwright test tests/api/mcp.spec.ts --project=chromium`           | Tests MCP ciblés.                                                                                                                |
| `npm run build && npx playwright test tests/api/parser-branches.spec.ts` | Exemple sûr quand le test dépend du dernier `dist/`.                                                                             |

## Setup initial

```bash
npm install
npx playwright install chromium
npm run build
npm run dev -- ./documentation
```

Le CLI public attend un dossier de documentation relatif. Les chemins absolus et `~` sont rejetés pour garder `.living-doc.json` portable.

## Initialisation utilisateur du produit

| Commande                                                | Effet                                                    | Notes                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npx living-ai-documentation`                           | Détecte un projet existant proche, sinon lance le wizard | Cherche `.living-doc.json` dans le dossier courant puis un niveau en dessous avant de demander le dossier docs et la langue starter EN/FR. |
| `npx living-ai-documentation ./docs`                    | Sert un dossier configure ou initialise ce dossier       | Si `./docs/.living-doc.json` existe, le dossier est servi ; sinon le wizard initialise `./docs`. |
| `npx living-ai-documentation ./docs --port 4000 --open` | Sert sur un port explicite et ouvre le navigateur        | Le port est persisté dans `.living-doc.json` comme information.           |

### Tester une première installation sans publier sur npm

Depuis la racine du dépôt, après installation des dépendances, dans un terminal macOS/Linux :

```bash
npm run build
cli="$PWD/dist/bin/cli.js"
cd "$(mktemp -d)"
node "$cli" ./docs --starter-language fr --port 4399 --open
```

Le dossier temporaire évite les collisions avec les fichiers `AGENTS.md`, `CLAUDE.md` et `memory/MEMORY.md` du dépôt. Remplacer `fr` par `en` pour tester l’autre langue. Arrêter le serveur avec Ctrl+C ; utiliser un nouveau dossier temporaire pour rejouer le wizard.

Les cinq cases de menus optionnels sont initialement décochées. Flèches pour naviguer, Espace pour cocher/décocher, Entrée pour valider. Vérifier le résultat dans le header puis dans Admin → Menus du header, y compris après rechargement. Sans TTY sur stdin ou stdout, le sélecteur est ignoré et les cinq menus restent masqués. `--starter-language` ne rend pas à lui seul un terminal non interactif.

Depuis la racine du dépôt, les tests ciblés sont :

```bash
npx playwright test tests/api/cli.spec.ts tests/api/config.spec.ts tests/e2e/header-navigation.spec.ts --project=chromium
```

Rebuilder avant si les sources ont changé. Ces tests lancent des serveurs locaux et Chromium ; un environnement sandboxé doit les autoriser.

Pour vérifier le contenu distribué, `npm pack --pack-destination /tmp` fabrique après build un fichier `living-ai-documentation-<version>.tgz` sans publication. On peut le tester depuis un dossier temporaire avec :

```bash
npm exec --package=/chemin/absolu/living-ai-documentation-<version>.tgz -- living-ai-documentation ./docs --starter-language fr --port 4399 --open
```

Remplacer le chemin et la version par ceux du fichier produit. npm peut télécharger les dépendances ; cette commande ne publie rien. Le test direct via `node "$cli"` réutilise les dépendances du dépôt et suffit pour tester le wizard.

## Coverage et stratégie de test

- Les tests Playwright utilisent des fixtures isolées et lancent de vrais processus CLI sur ports libres.
- Pour augmenter la coverage de `src/lib/*` ou du serveur, préférer exercer le comportement via routes/CLI plutôt qu'importer directement `dist/` dans une spec Playwright.
- `tests/helpers/coverage.ts` active `NODE_V8_COVERAGE=coverage/tmp` quand `COVERAGE=1`.
- `bin/cli.ts` gère `SIGTERM` pour permettre à V8 de flusher la coverage quand les tests arrêtent le serveur.
- Les tests unitaires restent utiles pour la lisibilité et la correction, mais ne sont pas la stratégie principale de coverage c8.

## Commandes dangereuses ou coûteuses

| Commande                      | Risque                                          | Règle                                                                                                            |
| ----------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| `npm version <patch           | minor                                           | major>`                                                                                                          | Modifie `package.json`, `package-lock.json` et crée un tag Git | Demander validation explicite avant de changer la version. |
| `git push && git push --tags` | Publie commits et tags vers le remote           | Demander validation explicite avant exécution.                                                                   |
| `just publish patch           | minor                                           | major`                                                                                                           | Combine bump version + push + push tags                        | Commande de publication ; demander validation explicite.   |
| `npm publish`                 | Publication npm réelle si exécutée manuellement | Demander validation explicite ; `prepublishOnly` déclenche `npm run build`.                                      |
| `rm -rf coverage`             | Supprime le rapport de coverage local           | Inclus dans `npm run test:coverage`; acceptable dans ce script, mais ne pas généraliser à d'autres suppressions. |

## Notes pour l'IA

- Lancer la plus petite vérification utile avant de terminer.
- Pour un changement documentaire seul, relire le document via MCP et mettre à jour les métadonnées si des fichiers source prouvent le contenu.
- Pour un changement frontend visible, préférer au minimum `npm run build`; lancer un test Playwright ciblé si le comportement est testable.
- Pour un changement serveur/API/MCP, lancer `npm run build` puis le fichier Playwright ciblé ou `npm run test:e2e` selon le risque.
- Si une commande échoue, reporter la commande exacte, le symptôme et l'hypothèse la plus probable.
- Ne pas inventer de scripts : si une commande manque, le dire et proposer de l'ajouter.
