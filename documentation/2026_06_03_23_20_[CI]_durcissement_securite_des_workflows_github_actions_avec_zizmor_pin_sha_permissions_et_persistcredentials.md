---
**date:** 2026-06-03
**status:** To be validated
**description:** Durcissement des 5 workflows GitHub Actions sur la base de l'audit zizmor : toutes les actions pinnees sur SHA de commit, `permissions: contents: read` minimal par job, `persist-credentials: false` sur les checkouts, neutralisation d'une template-injection, et suppression documentee de 2 faux positifs cache-poisoning via `.github/zizmor.yml`.
**tags:** ci, github-actions, zizmor, supply-chain, pinned-uses, persist-credentials, template-injection, least-privilege, cache-poisoning, just-audit
---

## Contexte

Le workflow `zizmor.yml` audite deja les workflows en CI, mais l'audit local complet (`zizmor .github/workflows/`) remontait **53 findings** (dont 23 `high`) sur les 5 workflows : actions referencees par tag flottant (`@v6`), checkouts persistant le token git, jobs sans bloc `permissions`, une injection de template via `${{ github.base_ref }}` dans un `run:`, et des alertes cache-poisoning.

L'absence de pin sur SHA est le risque majeur : une action compromise re-taguee prendrait le controle du runner avec les permissions du job.

## Decision

Appliquer le durcissement recommande par zizmor, en local, et le rendre reproductible.

### Corrections appliquees

- **`unpinned-uses` (le gros du lot)** : toutes les actions (`actions/checkout`, `actions/setup-node`, `actions/cache`, `actions/upload-artifact`, `github/codeql-action/*`) sont **pinnees sur leur SHA de commit** (`zizmor --fix=all --gh-token` resout les SHA via l'API GitHub). Le tag humain reste en commentaire `# v6`.
- **`artipacked`** : `persist-credentials: false` ajoute sur tous les `actions/checkout` (le token git n'est plus persiste plus longtemps que necessaire).
- **`template-injection`** : `${{ github.base_ref }}` n'est plus interpole directement dans un `run:` de `readme-sync.yml` ; il passe par une variable d'environnement intermediaire.
- **`excessive-permissions`** : bloc `permissions: contents: read` ajoute aux jobs `e2e` et `check` (principe du moindre privilege ; les autres jobs avaient deja leurs permissions).
- **`cache-poisoning` (2 faux positifs)** : zizmor marque tout `actions/setup-node` d'un workflow declenche par tag comme cache-poisoning, quelle que soit la valeur de `cache:` (confidence Low ; la doc zizmor elle-meme dit "can likely be ignored"). Le cache npm et le cache Playwright ont neanmoins ete retires de `publish.yml`, et les 2 findings residuels sont supprimes via `.github/zizmor.yml`.

### Outillage local

Deux recipes `just` rendent l'audit reproductible hors CI :

- `just audit` -> `zizmor .github/workflows/` (exit 14 si findings actifs).
- `just audit-fix` -> `zizmor --fix=all --gh-token "$(gh auth token)" .github/workflows/` puis re-audit.

## Consequences

- **0 finding actif** ; restent 19 suppressions internes a zizmor + 2 faux positifs cache-poisoning documentes dans `.github/zizmor.yml`.
- Les bumps d'actions passent desormais par Dependabot (PR mettant a jour le SHA + le commentaire de version) ; merge manuel ou via `@dependabot merge`.
- Le `publish.yml` n'utilise plus de cache (npm ni Playwright) : leger surcout de temps sur les releases, en echange de la suppression du vecteur cache-poisoning.
- Complete l'ADR CI du 2026-05-14 (gate publish sur tests/CodeQL/README-sync) sans la remplacer : celui-la porte sur l'orchestration des jobs, celui-ci sur la posture de securite des steps.
