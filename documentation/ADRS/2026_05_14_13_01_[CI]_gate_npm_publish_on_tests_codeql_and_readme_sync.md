---
**date:** 2026-05-14
**status:** To be validated
**description:** Le workflow `.github/workflows/publish.yml` exécute désormais Playwright, CodeQL et le check README sync comme jobs séparés, et le job `publish` les attend via `needs: [test, codeql, readme-sync]` ; un tag `v*` ne peut plus publier sur npm si une vérification échoue, alors qu'auparavant les 4 workflows tournaient en parallèle sans dépendance.
**tags:** ci, github-actions, npm-publish, release, codeql, playwright, gate, needs, defense-in-depth
---

# Gate npm publish sur tests, CodeQL et README sync

## Contexte

Sur ce projet, `just publish patch|minor|major` pousse simultanément un commit de bump de version sur `main` et un tag `v*`. GitHub Actions déclenche alors 4 workflows en parallèle sur le même SHA :

- `publish.yml` (sur le tag) → publie sur npm
- `e2e.yml` (sur main) → tests Playwright
- `codeql.yml` (sur main) → scan sécurité
- `readme-sync.yml` (sur main) → vérification EN ↔ FR

Le job `publish` est rapide (~30s) et termine **avant** la fin de Playwright (~3 min) et CodeQL (~5 min). Conséquence observée : un package potentiellement cassé peut être publié sur npm pendant que les autres checks tournent encore. La protection n'existait que sur les PR via la branch protection, pas sur la release elle-même. Une régression de comportement, une régression de sécurité détectée par CodeQL, ou un README désynchronisé pouvait être publié sans bloqueur.

## Décision

`.github/workflows/publish.yml` est restructuré en 4 jobs au sein du même workflow :

1. `test` — inline les étapes de `e2e.yml` (build + `npx playwright test`, avec cache navigateur et upload du report en cas d'échec).
2. `codeql` — inline `codeql.yml` (init `javascript-typescript` + analyse `security-extended`).
3. `readme-sync` — inline `readme-sync.yml` (compare HEAD~1 → HEAD).
4. `publish` — `needs: [test, codeql, readme-sync]`. C'est la seule étape qui appelle `npm publish --provenance`.

Sur un tag push :

- Les 3 jobs de checks tournent en parallèle dans `publish.yml`.
- Le job `publish` ne démarre que si les 3 retournent `success`.
- Si un seul échoue, `publish` est skippé. Aucun artefact n'atteint npm.

Les 4 workflows existants (`e2e.yml`, `codeql.yml`, `readme-sync.yml`, `zizmor.yml`) restent en place inchangés. Ils continuent de gater les PR et les pushs main ordinaires.

### Pourquoi pas `workflow_run`

`workflow_run` permet à un workflow de déclencher après la complétion d'un autre. C'est plus DRY (pas de duplication des jobs), mais :

- l'opérateur ne prend qu'un seul nom de workflow → il faudrait soit attendre le plus lent puis vérifier les autres via API, soit chaîner trois `workflow_run` en cascade ;
- les logs sont déroutants (un workflow déclenche un autre déclenche un autre) ;
- diagnostiquer un échec demande de comprendre la sémantique du `workflow_run.head_sha` vs `github.sha`.

Pour un projet avec un seul consommateur (le publish) et trois workflows à vérifier, le coût de complexité dépasse le bénéfice de DRY.

### Pourquoi pas reusable workflows

Extraire `_test.yml`, `_codeql.yml`, `_readme-sync.yml` en `workflow_call` éviterait la duplication entre les workflows standalone et `publish.yml`. Tradeoff : 3 fichiers supplémentaires, un niveau d'indirection pour comprendre ce qui tourne réellement. À reconsidérer si la maintenance des deux endroits devient pénible — pour l'instant les workflows changent rarement et la duplication est lisible.

### Pourquoi zizmor n'est pas gaté

`zizmor.yml` audite les fichiers `.github/workflows/**`. Il est pertinent en PR (pour bloquer un workflow mal configuré avant merge) mais pas comme gate de release : à l'étape tag, les workflows sont déjà ceux validés en PR. L'inclure ferait tourner l'audit deux fois sans valeur ajoutée.

## Conséquences

### PROS

- Aucune release npm ne peut être publiée si un test, CodeQL ou la sync README échouent. Cohérent avec l'attente d'un projet open source publié.
- Les comments inline des workflows source sont préservés dans `publish.yml`, donc une seule lecture suffit pour comprendre toute la pipeline de release.
- Pas de modification des 4 autres workflows — le rôle de gate sur PR et le scan hebdo CodeQL restent inchangés.
- La duplication est confinée à un seul fichier (`publish.yml`) ; toute évolution du test ou de la sécurité reste localisée si le standalone et le publish doivent rester alignés.

### CONS

- Les checks tournent deux fois sur un tag push (une fois via le standalone sur main, une fois via `publish.yml`) — coût ~10 min de runner doublé, négligeable en pratique mais à surveiller si le projet grossit.
- Duplication de ~140 lignes entre `publish.yml` et les 3 workflows standalone. Tout changement de procédure de test/scan/check doit être appliqué aux deux endroits — un drift potentiel à détecter manuellement.
- Le check README sync utilise `HEAD~1` sur tag push (le commit précédent sur main, le tag pointant sur le bump). Fonctionne tant que `just publish` ne crée qu'un commit avant le tag ; si la procédure évolue (par exemple un changelog auto-généré dans un commit supplémentaire), il faudra ajuster.
- Pas de couverture pour le cas où l'humain pousse un tag manuellement sans passer par `just publish` (par exemple sur un commit qui n'a jamais touché main). Acceptable car la pratique sur ce projet passe par la commande dédiée — à formaliser dans `PROJECT-USEFUL-COMMANDS.md` si nécessaire.

### Action complémentaire recommandée hors scope

Activer une branch protection rule sur `main` exigeant que `E2E Tests`, `CodeQL` et `README sync` passent avant tout merge. Ça empêche un commit cassé d'atterrir sur `main` avant même l'étape tag. Combiné avec le gate dans `publish.yml`, ça donne défense en profondeur : main propre + release propre.
