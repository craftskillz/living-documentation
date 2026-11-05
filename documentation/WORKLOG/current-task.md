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

# Ouvrir les fichiers non Markdown depuis l'explorateur — cadré le 5 novembre 2026

Statut : cadré et validé par l'utilisateur, non démarré. Aucun code écrit. À réaliser dans une nouvelle session, sur une nouvelle branche partie de `main`.

Demande : un clic sur une ligne `kind: "file"` de l'explorateur (aujourd'hui un `div` non cliquable dans `home/TreeNode.svelte`) agit selon le type du fichier.

Décisions de l'utilisateur :

- Fichier texte (`.env`, code source, tout fichier textuel) : affiché dans la zone centrale, à la place du document, avec le même rendu que le visualiseur de Blueprint (`.file-preview` de `blueprint/FileExplorer.svelte` et de `blueprint/styles.css` : nom, highlight.js, numéros de ligne, bandeau si tronqué).
- Image ou vidéo : affichée dans la zone centrale, comme dans Blueprint.
- Autre binaire (docx, pdf, zip...) : ouvert dès le clic par l'application associée de l'OS, avec un message d'erreur si l'OS échoue.

Point de départ : `GET /api/blueprint/file-content` et `file-raw` dans `src/routes/blueprint.ts` portent `isBinary`, `MAX_TEXT_BYTES`, `EXT_TO_LANGUAGE`, `IMAGE_EXTS` et `VIDEO_EXTS`, mais lisent `sourceRoot`. La nouvelle route doit lire le dossier de documentation. `openUrl` de `src/server.ts` montre les commandes `open`, `xdg-open` et `start`, mais passe par `exec` : pour un nom de fichier, utiliser `execFile` sans shell.

Sécurité, proposée à l'utilisateur et acceptée : `app.listen(port)` ne précise pas d'hôte, le serveur écoute donc sur toutes les interfaces, et `server.ts` ne montre aucune restriction d'origine. L'ouverture OS n'accepte que les requêtes de la machine locale, avec contrôle de `Origin`, et refuse les exécutables (`.app`, `.pkg`, `.exe`, etc.). Chemins confinés au dossier de documentation. À examiner : limiter aussi à la machine locale la lecture des `.env`.

Rappels : textes visibles dans `en.json` et `fr.json` (règle i18n). L'ADR de l'explorateur dit aujourd'hui que ces fichiers ne s'ouvrent pas : le corriger, et vérifier le test E2E `non-Markdown files appear greyed...`.

Prochaine action : ouvrir une nouvelle session et réaliser cette tâche.

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
