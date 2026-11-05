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

# Ouvrir les fichiers non Markdown depuis l'explorateur — 5 novembre 2026

Statut : réalisé et commité sur la branche `feat/explorateur-ouvrir-fichiers-non-md`, à valider par l'utilisateur, non mergé.

Livré : un clic sur un fichier non Markdown de l'explorateur affiche le texte, l'image ou la vidéo dans la zone centrale, avec le rendu de Blueprint. Les autres binaires s'ouvrent dans l'application associée de l'OS, avec un message en cas d'échec ou de refus.

Décision sur le point laissé ouvert au cadrage : les trois routes de `/api/other-files` sont limitées à la machine locale, pas seulement l'ouverture OS et les `.env`, car les noms de fichiers sensibles ne s'énumèrent pas. Détails : ADR de l'explorateur.

Fichiers : `src/lib/filePreview.ts`, `src/lib/otherFiles.ts`, `src/lib/localRequest.ts`, `src/routes/otherFiles.ts`, `src/routes/blueprint.ts`, `src/lib/explorerEntries.ts`, `src/server.ts`, `home/otherFile.ts`, `home/OtherFileViewer.svelte`, `home/TreeNode.svelte`, `home/api.ts`, `home/state.svelte.ts`, `home/types.ts`, `routes/Home.svelte`, `lib/filePreview.css` (extrait de `blueprint/styles.css`), `en.json`, `fr.json`, `tests/helpers/fake-opener.ts`, `tests/unit/other-files.test.ts`, `tests/api/other-files.spec.ts`, `tests/e2e/explorer.spec.ts`.

Vérifications : tests unitaires rouges puis verts. Unitaires : 151 réussis. API : 251 réussis, 1 ignoré. E2E : 190 réussis. Lint sans erreur sur les modules TypeScript modifiés. `okf:validate` conforme. Rendu du texte contrôlé sur captures, en thème sombre et clair, avec le thème de code par défaut. Thème de code clair (`ld-code-light`) non contrôlé.

Corrigé après test de l'utilisateur : en mode dev (`localhost:5174`), PDF et DOCX étaient refusés avec `not_local`, car le proxy Vite réécrivait le `Host` alors que le `POST` envoie `Origin: http://localhost:5174`. Le proxy de `/api` garde désormais le `Host` (`vite.config.ts`). Contrôlé avec curl à travers le proxy : `Origin` 5174 accepté, autre site et autre application locale refusés. Aucun test automatisé ne couvre le proxy Vite.

Non vérifié : l'ouverture réelle par l'OS. Les tests remplacent `open` et `xdg-open` par un faux programme, pour ne jamais lancer d'application sur la machine du développeur. La commande Windows (`rundll32`) n'a été exécutée nulle part.

Hors périmètre : URL du fichier affiché (un rechargement revient au document) ; limitation à la machine locale de `GET /api/blueprint/file-content` et `file-raw`, qui restent lisibles depuis le réseau local.

Prochaine action : ouvrir un vrai PDF depuis l'application sur le Mac, puis merger. Le MCP n'expose pas ses outils dans cette session : métadonnées et hashes non mis à jour ; attacher `src/lib/filePreview.ts`, `src/lib/otherFiles.ts`, `src/lib/localRequest.ts`, `src/routes/otherFiles.ts` à l'ADR de l'explorateur et rafraîchir ses hashes.

# Fichiers non Markdown dans l'explorateur — 5 novembre 2026

Statut : terminé et mergé dans `main`, validé par l'utilisateur.

Livré : avec « Afficher les éléments cachés », les fichiers qui ne sont pas en `.md` apparaissent grisés et en italique en fin de dossier, et le compteur des dossiers les inclut. Sans l'œil, rien ne change. Ils ne s'ouvrent pas, ne se déplacent pas et n'ont pas de menu contextuel. `.DS_Store` n'est jamais listé.

Fichiers : `src/lib/explorerEntries.ts`, `src/lib/folderTree.ts`, `home/tree.ts`, `home/treeDrop.ts`, `home/types.ts`, `home/TreeNode.svelte`, `tests/unit/explorer-other-files.test.ts`, `tests/api/tree.spec.ts`, `tests/e2e/explorer.spec.ts`, ADR de l'explorateur (section « Fichiers non Markdown »).

Vérifications : test unitaire rouge puis vert. Unitaires : 145 réussis. API : 242 réussis, 1 ignoré. E2E : 189 réussis. Lint sans erreur sur les modules TypeScript modifiés. Après l'exclusion de `.DS_Store`, seuls `tree.spec.ts` et `explorer.spec.ts` ont été relancés : 41 réussis. Application réelle non ouverte.

Hors périmètre : ouverture ou aperçu de ces fichiers, groupe « Extra Files », compte de la modale de suppression de dossier (documents seulement, alors que tout le contenu est supprimé).

Prochaine action : le MCP n'expose pas ses outils dans cette session : métadonnées et hashes non mis à jour ; attacher `src/lib/explorerEntries.ts` et `src/lib/folderTree.ts` à l'ADR de l'explorateur et rafraîchir ses hashes.

# Générer un document en HTML — 4 novembre 2026

Statut : terminé et mergé dans `main`, validé par l'utilisateur. Suite prévue : ajouter d'autres templates au fil de l'eau.

Livré : boutons `Générer en HTML`, `Voir en HTML` et changement de template dans le viewer, bibliothèque `html-templates/` avec le template « Fiche d'entretien », route `/api/html-templates`. Décisions : ADR `[RENDERING] Générer un document en HTML`.

Vérifications : unitaires 140 réussis. API 240 réussis, 1 ignoré. E2E 188 réussis. Rendu écran, mobile et impression contrôlés sur une copie de `fiche_entretien_coaching_ia.md`, le fichier d'origine n'a pas été modifié.

Hors périmètre : édition des templates depuis l'interface, aperçu dans la fenêtre de choix, Mermaid et coloration du code dans la page générée.

Prochaine action : le MCP n'expose pas ses outils dans cette session : métadonnées et hashes non mis à jour ; attacher à l'ADR `src/lib/htmlTemplates.ts`, `src/lib/htmlDocument.ts`, `src/lib/htmlTemplateField.ts`, `src/routes/htmlTemplates.ts`, `src/frontend-svelte/src/lib/html-templates/HtmlTemplateActions.svelte`, `html-templates/interview-sheet.html`.

# Guide « Bien utiliser Living Documentation » — 4 novembre 2026

Statut : terminé et mergé dans `main`, validé par l'utilisateur.

Fichiers : `bien-utiliser-living-documentation.md` (nouveau, dans `documentation/DOCUMENTATION/` et `starter-doc-fr/DOCUMENTATION/`), `starter-doc/DOCUMENTATION/using-living-documentation-well.md` (traduction), `DOCUMENTATION/index.md` des trois dossiers (régénérés). Les trois copies du guide sont à tenir synchronisées à la main.

Vérifications : `npm run okf:validate` sans erreur. Unitaires 140 réussis. Playwright 439 réussis, 1 ignoré. Rendu dans l'application non contrôlé. Workflows MCP décrits d'après le code, non exécutés.

Hors périmètre : README, document « Document Markdown » dont le contenu porte sur le Workspace, `Plan.md`.

Corrigé à la demande de l'utilisateur, après le merge de la génération HTML : dans `src/mcp/server.ts`, les deux passages où `create_document` « will reject a colliding filename » (le code ajoute un suffixe `-2`).

Prochaine action : écrit sans le MCP pour éviter un commit automatique sur `main` : métadonnées et hashes non mis à jour ; attacher `src/mcp/server.ts`, `src/mcp/tools/documents.ts`, `src/lib/okf.ts`, `src/lib/okf/validate.ts`, `src/lib/okf/index-generator.ts`, `src/lib/folderManifest.ts`, `src/lib/git-integration.ts`, `bin/cli.ts`.

# Repli des lignes inchangées dans « Versions du document » — 3 novembre 2026

Statut : terminé et mergé dans `main`, validé par l'utilisateur.

Livré : le diff est replié par défaut, avec 3 lignes de contexte autour de chaque changement. Chaque zone masquée devient une barre `N lignes identiques` qui se déplie et se replie, et un bouton `Tout déplier / Tout replier` s'ajoute à la barre d'outils.

Fichiers : `home/diffFolding.ts` (nouveau), `home/VersionsModal.svelte`, `i18n/en.json`, `i18n/fr.json`, `tests/unit/diff-folding.test.ts`, `tests/e2e/versions-folding.spec.ts`, ADR des versions visuelles (section « Repli des lignes inchangees »).

Vérifications : test unitaire rouge puis vert. Unitaires : 131 réussis. API : 235 réussis, 1 ignoré. E2E : 186 réussis. Lint sans erreur sur les modules TypeScript ajoutés. Rendu contrôlé sur une capture.

Hors périmètre : dépliage partiel (« 20 lignes de plus ») et navigation entre changements. `buildSimpleDiffView` compare toujours position par position au-delà de `MAX_LCS_CELLS` : une insertion en haut d'un très gros document ne laisse alors rien à replier.

Prochaine action : le MCP n'expose pas ses outils dans cette session : métadonnées et hashes non mis à jour ; attacher `home/diffFolding.ts` à l'ADR et rafraîchir ses hashes.
