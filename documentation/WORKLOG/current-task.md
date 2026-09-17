---
type: Worklog
title: Menus du header et initialisation CLI — documentation à jour
description: Clôture de la configuration des menus et du sélecteur CLI, documentation et métadonnées synchronisées via MCP.
tags:
  - worklog
  - okf
  - closure
  - concept-graph
  - workspace
timestamp: 2026-09-16T15:45:00Z
status: To be validated
---

# Mise à jour de l'image d'un diagramme depuis un document — 17 septembre 2026

## État courant

Feature terminée et commitée (`7d989d3d`). ADR créé : `ADRS/2026_09_17_11_46_[DIAGRAM]_mise_a_jour_de_limage_dun_diagramme_depuis_un_document_et_cache_busting` (To be validated, 4 sources attachées, accuracy 100 %). L'ADR `2026_04_12_[DIAGRAM]_insertion_diagramme_via_snippet_et_sauvegarde_auto_png` est passé en « Partially SuperSeeded ». En ouvrant un lien diagramme depuis un document (`[![x](./images/n.png)](/diagram?id=…)`), le viewer ajoute `&img=n.png` au lien. Le bouton PNG écrase donc cette image au lieu de copier dans le presse-papier. Au retour, l'image est rechargée avec `?v=<timestamp>` (version en `sessionStorage` + mémoire) pour ne pas afficher la copie en cache.

Fichiers : `src/frontend-svelte/src/lib/diagramImageLink.ts` (nouveau), `lib/home/wireContent.ts`, `lib/diagram/clipboard.js`, `lib/diagram/main.js`, `tests/e2e/diagram.spec.ts`.

## Vérifications

- `npm run build` réussi.
- `tests/e2e/diagram.spec.ts` (2/2, dont le nouveau parcours complet), `inline-snippet-edit` + `viewer` (50/50).
- Parcours vérifié manuellement dans le navigateur sur une copie de la fixture `with-diagrams`.

## Suite

Aucune implémentation restante. Validation humaine du nouvel ADR ; `npm run okf:validate` : 281 documents, 0 erreur.

---

# Menus du header — 17 septembre 2026

## État courant

Implémentation terminée et commitée : `420b9541` (visibilité depuis Admin), `395db08f` (sélection à l’installation), version `3.57.0` dans `2f6ce62b`. La correction de centrage des boutons du header est incluse dans le travail précédent.

La documentation a été mise à jour via le MCP reconnecté au bon projet : nouvel [ADR navigation](?doc=ADRS%252F2026_09_17_10_44_%255BNAVIGATION%255D_visibilite_des_menus_du_header_et_selection_a_installation), complément de l’ADR starter, guides Admin/démarrage, stack et commandes de test local. Les six documents techniques ont leurs sources attachées et leurs hashes recalculés, tous inchangés avec `dirty: false`.

## Vérifications réalisées pendant l’implémentation

- `npm run build` réussi ; avertissement de taille du bundle.
- Tests CLI, API config et navigateur header : 23/23.
- `npm run lint:ci` : aucune erreur, 63 avertissements et 2 informations.
- Sélecteur testé dans un terminal : cases initialement décochées, navigation, sélection Workspace/Survival Kit, persistance des trois autres routes masquées. Ce test a volontairement utilisé un port invalide pour arrêter après le scaffolding ; les tests automatisés vérifient le démarrage du serveur.
- Package local produit avec `npm pack` et présence des starters, du module CLI et des catalogues EN/FR vérifiée. Pas de publication npm réalisée par l’agent.
- Pour la présente passe documentaire, aucun changement de code ni nouvelle exécution des 23 tests ; relecture MCP et vérification des métadonnées.

- Validation documentaire finale : `npm run okf:validate`, 280 documents vérifiés, 0 erreur et 69 avertissements non bloquants. Arbre Git propre après les écritures et auto-commits du MCP.

## Suite

Aucune implémentation restante pour cette demande. Le nouvel ADR reste « To be validated » pour revue humaine. Les éventuels push restent à la charge de l’utilisateur. Le suivi antérieur ci-dessous est conservé comme historique.

---

# Clôture OKF — 16 septembre 2026

## État

Les 15 tickets sont réalisés dans leur périmètre retenu ; T13 porte sur l’import CLI. Les détails historiques restent dans les worklogs par ticket et Git. Ce résumé remplace les anciennes listes contradictoires de code non commité.

## Livré et commité

- `17a8cda0` : migration des copies de fixtures par le vrai CLI avant la garde de démarrage ; fixtures source conservées.
- `2be1dd1c` : collision de dossiers workspace évitée au renommage, avec test API conservant les fichiers existants.
- `e0e44059` : graphe T14 (`/graph`, `/api/graph`), extraction des vrais liens Markdown via marked, exclusion images/code/frontmatter/liens externes, tests unitaires et API, libellés EN/FR.
- Documentation enregistrée via MCP et auto-commits : ADR T14, complément de l’ADR workspace, stack, commandes, ADR Svelte, blueprint src, roadmap.
- Un contexte workspace sans frontmatter a été normalisé via MCP sans modifier son corps.

## Vérifications

- `npm run test:unit` : 24/24.
- `npx playwright test tests/api/okf-graph.spec.ts tests/api/workspace.spec.ts --project=chromium` : 9/9 (serveurs locaux autorisés hors sandbox).
- `npm run build` : réussi ; avertissement de taille de bundle.
- `npm run lint:ci` : aucune erreur, 61 avertissements et 2 informations.
- `npm run okf:validate` après correction du contexte : 278 documents vérifiés, 0 erreur, 66 avertissements non bloquants.
- Pas de nouvelle revue visuelle navigateur ; validation visuelle T14 historique conservée. Pas de suite E2E complète exécutée.
- Métadonnées T14, workspace, stack, commandes, ADR Svelte, blueprint src et normalisation T04 recalculées après vérification ; captures sur arbre propre (`dirty: false`). Les anciennes dérives hors de ces documents ne sont pas déclarées résolues.

## Suites

1. Les push sont pris en charge par l’utilisateur.
2. Interface d’import Admin/Files et résolution des liens absolus des bundles importés.
3. Audit des dérives documentaires historiques et génération systématique de frontmatter pour les contextes workspace.

ADR T14 : [Graphe de concepts OKF](?doc=ADRS%252F2026_09_16_17_40_%255BOKF%255D_readonly_okf_concept_graph_from_markdown_links).


## Simplification de l’outillage — 16 septembre 2026

Retrait de l’ancien outillage de graphe externe demandé par l’utilisateur. Le format OKF, le MCP Living Documentation et le visualiseur `/graph` sont conservés. Nettoyage des consignes, hooks, skill, caches et références documentaires terminé et commité (`bfd96ee9`). Un ADR dédié consigne la décision. Tests unitaires : 24/24 ; validation OKF sans erreur. Le push reste à la charge de l’utilisateur.


## Correction du header Survival Kit — 17 septembre 2026

Suppression du menu escamotable au survol dans `src/frontend-svelte/src/routes/SurvivalKit.svelte`. La Topbar est maintenant une ligne normale de la grille partagée `app-shell`, hors des zones défilantes, comme sur Home. Suppression du listener mousemove, du déclencheur de survol et des styles de translation du tiroir.

Vérifications : build réussi et `git diff --check` sans erreur. Les tests navigateur grand/petit écran n’ont pas été exécutés : la demande d’exécution hors sandbox a été refusée. Validation visuelle à effectuer. Correction non commitée ; aucun hash documentaire recalculé sur ce code modifié.
