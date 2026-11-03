---
type: Worklog
title: Tâche courante
description: Point de reprise partagé entre assistants IA pour suivre la tâche courante, son statut, les fichiers touchés, les vérifications et la prochaine action.
tags:
  - worklog
  - handoff
  - progression
  - reprise
  - agents-ia
timestamp: 2026-10-31T10:00:00Z
status: To be validated
---

# Repli des lignes inchangées dans « Versions du document » — 3 novembre 2026

Statut : terminé et commité sur la branche `feat/repli-contexte-versions`, non mergé, en attente de validation par l'utilisateur.

Livré : le diff est replié par défaut, avec 3 lignes de contexte autour de chaque changement. Chaque zone masquée devient une barre `N lignes identiques` qui se déplie et se replie, et un bouton `Tout déplier / Tout replier` s'ajoute à la barre d'outils.

Fichiers : `home/diffFolding.ts` (nouveau), `home/VersionsModal.svelte`, `i18n/en.json`, `i18n/fr.json`, `tests/unit/diff-folding.test.ts`, `tests/e2e/versions-folding.spec.ts`, ADR des versions visuelles (section « Repli des lignes inchangees »).

Vérifications : test unitaire rouge puis vert. Unitaires : 131 réussis. API : 235 réussis, 1 ignoré. E2E : 186 réussis. Lint sans erreur sur les modules TypeScript ajoutés. Rendu contrôlé sur une capture.

Hors périmètre : dépliage partiel (« 20 lignes de plus ») et navigation entre changements. `buildSimpleDiffView` compare toujours position par position au-delà de `MAX_LCS_CELLS` : une insertion en haut d'un très gros document ne laisse alors rien à replier.

Prochaine action : validation par l'utilisateur, puis merge. Le MCP n'expose pas ses outils dans cette session : métadonnées et hashes non mis à jour ; attacher `home/diffFolding.ts` à l'ADR et rafraîchir ses hashes.
