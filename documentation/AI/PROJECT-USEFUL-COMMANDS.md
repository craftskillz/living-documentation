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

### Raccourcis `just` pour les tests

Toutes ces cibles **buildent d'abord** (les tests unit importent `dist/`, les e2e/api lancent le CLI buildé), reproduisant les conditions CI.

| Commande              | Effet                                                                             |
| --------------------- | --------------------------------------------------------------------------------- |
| `just test`           | Suite complète (api + unit + e2e), headless, comme la CI.                         |
| `just test-api`       | Uniquement les tests API (HTTP sur le CLI lancé), headless.                       |
| `just test-unit`      | Uniquement les tests unitaires (parser, constantes de shapes).                    |
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

Il n'existe pas de script ESLint ou `format` dans `package.json` à ce jour. Ne pas annoncer `npm run lint` ou `npm run format` comme vérification disponible tant qu'ils ne sont pas ajoutés. Le typage frontend est assuré par `svelte-check`/`tsc` et le build Vite (le script `check:frontend` a été supprimé avec le frontend vanilla).

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
| `npx living-ai-documentation`                           | Lance le wizard interactif si aucun dossier n'est fourni | Demande le dossier docs et la langue starter EN/FR.                       |
| `npx living-ai-documentation ./docs`                    | Sert un dossier docs existant ou initialisé              | Ouvre par défaut sur `http://localhost:4321` si le port n'est pas changé. |
| `npx living-ai-documentation ./docs --port 4000 --open` | Sert sur un port explicite et ouvre le navigateur        | Le port est persisté dans `.living-doc.json` comme information.           |

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
