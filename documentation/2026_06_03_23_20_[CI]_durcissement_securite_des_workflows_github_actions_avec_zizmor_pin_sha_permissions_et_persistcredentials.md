---
type: Document
title: Durcissement Securite Des Workflows Github Actions Avec Zizmor Pin Sha Permissions Et Persistcredentials
description: "Durcissement des 5 workflows GitHub Actions sur la base de l'audit zizmor : toutes les actions pinnees sur SHA de commit, `permissions: contents: read` minimal par job, `persist-credentials: false` sur les checkouts, neutralisation d'une template-injection, et suppression documentee de 2 faux positifs cache-poisoning via `.github/zizmor.yml`."
tags:
  - ci
  - github-actions
  - zizmor
  - supply-chain
  - pinned-uses
  - persist-credentials
  - template-injection
  - least-privilege
  - cache-poisoning
  - just-audit
timestamp: 2026-06-03T23:20:00Z
status: To be validated
sources:
  - path: .github/workflows/publish.yml
    hash: 4fd88ac69bbae78808be98e85f34ba9ba470bce5a81d78bd56f9a1a58b6f7d88
  - path: .github/workflows/e2e.yml
    hash: f2a7981d24b588832951dff2560f91fdaa5bb499bb70a21d9c8aaf404a4ca9ba
  - path: .github/workflows/readme-sync.yml
    hash: d42d67093e506ea2b07d282298444906bfbb18db484cf1e9dc1f8199226f8bb3
  - path: .github/workflows/codeql.yml
    hash: 9421c5e996e73ef420bb5cb1ef183a6f2f75bb359f9da520822af0f25cb44761
  - path: .github/workflows/zizmor.yml
    hash: 5e850966afe47f1433d8dcc88abc7dd4ce23050464eb8e1651fc9fbf1ff46bff
  - path: .github/zizmor.yml
    hash: ebc81c6f965228ed9bc5437fe884de7fb89c62c9e6799928e5daf21d7f969760
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
