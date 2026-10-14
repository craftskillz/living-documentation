---
type: Worklog
title: US10 — Fichiers réservés avec les éléments cachés
description: « Afficher les éléments cachés » dévoile index.md, log.md et liv-doc-main.md, grisés en tête de dossier, ouverts en lecture seule ; l'API refuse leur écriture, suppression et déplacement.
tags:
  - worklog
  - us
  - explorateur
status: To Be Validated
---

# US10 — Fichiers réservés avec les éléments cachés

## Réalisé

- `src/lib/folderTree.ts` : chaque dossier liste d'abord ses fichiers réservés présents (ordre `RESERVED_OKF_FILES` : `index.md`, `log.md`, `liv-doc-main.md`) avec `reserved: true`. `isListedEntry` et `orderedEntryNames` inchangés : liste des documents, recherche, `index.md` générés, MCP et indices de déplacement non affectés.
- `src/routes/documents.ts` : `GET /:id` ajoute `reserved: true` et rend le frontmatter en bloc ```` ```yaml ```` avant le corps ; `PUT`, `DELETE` et `POST /:id/move` répondent 400 « Reserved files are read-only » (nom comparé sans casse).
- Frontend : `withoutHiddenEntries` retire aussi les réservés ; `countExplorerDocs` les ignore ; `treeDrop.childrenOf` les exclut du calcul d'index (un dépôt sur un réservé ne fait rien). `TreeNode.svelte` : nœud réservé grisé, cadenas, nom de fichier, non déplaçable, sans menu contextuel. `DocViewer.svelte` : badge « Lecture seule » à la place de la barre d'actions ; `EditableMarkdown` gagne `readonly` (pas d'édition inline). i18n `doc.read_only` EN/FR.
- ADR explorateur complété (puce « Fichiers réservés »), `PROJECT-STACK.md` mis à jour.

## Tests

- Unitaire `tree-drop` : les réservés ne décalent pas l'index de dépôt.
- API `tree.spec.ts` : réservés en tête et marqués, absents de `/api/documents` ; lecture avec YAML ; écriture, suppression, déplacement refusés sans toucher au disque. Le helper `names` ignore désormais les réservés (les tests d'ordre portent sur les entrées listées).
- E2E `explorer.spec.ts` : bouton désactivé → aucun réservé ; activé → réservés en tête, non déplaçables, sans menu ; ouverture : YAML visible, badge, ni Modifier ni Supprimer.

Suites au 14/10/2026 : unitaires 57/57, `tests/api` 215/215, `tests/e2e` 114/114, `okf:validate` conforme.

MCP Living Documentation non exposé dans la session : documents écrits à la main, pas de métadonnées attachées.
