---
okf_version: "0.1"
---

# documentation

## Concepts

* [Welcome](./2026_04_08_20_52_[General]_welcome.md)
* [Premiers Pas](./2026_04_11_12_55_[General]_premiers_pas.md)
* [Test](./2026_05_20_13_28_[CONFERENCE]_test.md)
* [Stabilisation De La Suite E2e Playwright Apres Migration Svelte Ancrage De Test Et Regressions](./2026_06_03_23_19_[TESTING]_stabilisation_de_la_suite_e2e_playwright_apres_migration_svelte_ancrage_de_test_et_regressions.md) - Reparation des 49 tests e2e casses par la migration Svelte via une convention d'ancrage `data-testid` + ids fonctionnels reutilises, une surface de test `window.openSnippetsModal*`, des attentes de montage anti-race CI, l'acceptation d'un comportement liste source-fidele, et la correction de 6 vraies regressions de parsing/rendu.
* [Durcissement Securite Des Workflows Github Actions Avec Zizmor Pin Sha Permissions Et Persistcredentials](./2026_06_03_23_20_[CI]_durcissement_securite_des_workflows_github_actions_avec_zizmor_pin_sha_permissions_et_persistcredentials.md) - Durcissement des 5 workflows GitHub Actions sur la base de l'audit zizmor : toutes les actions pinnees sur SHA de commit, `permissions: contents: read` minimal par job, `persist-credentials: false` sur les checkouts, neutralisation d'une template-injection, et suppression documentee de 2 faux positifs cache-poisoning via `.github/zizmor.yml`.
* [Compare Block Two Phase Rendering](./2026_06_08_00_17_[FRONTEND]_compare_block_two_phase_rendering.md) - Rendu des blocs :::compare via un placeholder + remplacement post-parse au lieu d'injecter le HTML rendu avant marked.parse(), afin que les blocs de code internes contenant des lignes vides ne brisent plus le document.

## Directories

* [001_BLUEPRINT](./001_BLUEPRINT/index.md)
* [1_tutorial](./1_tutorial/index.md)
* [2_guide](./2_guide/index.md)
* [3_concept](./3_concept/index.md)
* [4_reference](./4_reference/index.md)
* [5_talks](./5_talks/index.md)
* [ADRS](./ADRS/index.md)
* [AI](./AI/index.md)
* [DOCUMENTATION](./DOCUMENTATION/index.md)
* [images-ai](./images-ai/index.md)
* [TEST](./TEST/index.md)
* [WORKLOG](./WORKLOG/index.md)
* [ZZTEST_KANBAN](./ZZTEST_KANBAN/index.md)
