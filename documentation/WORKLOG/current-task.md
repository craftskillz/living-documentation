---
**date:** 2026-06-18
**status:** Completed
**description:** Alignement du runtime minimal sur Node.js 20.19.0 et remise en coherence de la documentation apres l'ajout du Survival Kit.
**tags:** worklog, nodejs, runtime, vite8, commander14, survival-kit, svelte5, adr, metadata, documentation
---

# Current task

## Statut courant

Completed

## Tache courante

Aligner le contrat de compatibilite Node.js avec les dependances installees, puis documenter le module Survival Kit committe dans `8a5315a` et remettre la documentation d'architecture en coherence.

## Actions realisees

### Compatibilite Node.js

- Runtime minimal passe de Node.js 18 a `>=20.19.0` dans `package.json` et `package-lock.json`.
- README anglais et francais alignes avec cette exigence.
- Jobs de test des workflows `e2e.yml` et `publish.yml` epingles sur Node.js 20.19.0 ; le job de publication reste sur Node.js 22.
- `PROJECT-STACK.md` et `PROJECT-USEFUL-COMMANDS.md` corriges.
- ADR Runtime cree via MCP et lie aux deux workflows CI.

### Survival Kit et frontend Svelte

- ADR Survival Kit cree via MCP pour la route `/survival-kit`, l'API GET/PUT, le store Svelte, les panneaux taches/notes/liens et la persistance `.survival-kit.json`.
- Huit fichiers source specifiques lies a l'ADR ; accuracy MCP = 1.
- ADR de migration Svelte actualise : l'application comporte maintenant 10 ecrans et la convention d'ajout de route est explicitee.
- Metadonnees de l'ADR de migration Svelte rafraichies ; accuracy MCP = 1.
- `PROJECT-STACK.md` complete avec la route, le feature folder et le stockage Survival Kit.

## Fichiers ou zones concernes

- `package.json`
- `package-lock.json`
- `README.md`
- `README.fr.md`
- `.github/workflows/e2e.yml`
- `.github/workflows/publish.yml`
- `documentation/AI/PROJECT-STACK.md`
- `documentation/AI/PROJECT-USEFUL-COMMANDS.md`
- `documentation/ADRS/2026_06_03_10_53_[FRONTEND]_migration_du_frontend_vers_une_application_svelte_unifiee.md`
- `documentation/ADRS/2026_06_18_22_27_[SURVIVAL KIT]_survival_kit_dashboard_local_persiste.md`
- `documentation/ADRS/2026_06_18_22_27_[RUNTIME]_runtime_minimal_node_20_19_pour_vite_8.md`

## Verifications realisees

- `npm run build` : OK sous Node.js 25.2.1 ; avertissement Vite non bloquant sur un chunk de 500.13 kB.
- `npm run check:readme-sync` : OK.
- `./scripts/check-workflows.sh` : OK.
- Accuracy MCP ADR Survival Kit : 1, 8 fichiers inchanges.
- Accuracy MCP ADR Runtime : 1, 2 fichiers inchanges.
- Accuracy MCP ADR migration Svelte : 1, 6 fichiers inchanges.

## Verification restante

- La borne exacte Node.js 20.19.0 n'a pas ete executee localement ; elle sera exercee par les workflows CI epingles sur cette version.
- Le Survival Kit ne possede pas encore de tests API/E2E dedies.

## Prochaine action recommandee

Demarrer le prochain besoin sur cette base documentee. Si le prochain changement touche le Survival Kit, ajouter en priorite des tests de persistance API et un parcours CRUD E2E cible.
