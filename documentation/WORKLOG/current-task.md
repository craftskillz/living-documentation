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

# Modification sur place au double-clic — 5 novembre 2026

Statut : terminé sur la branche `feat/html-view-double-clic`, à merger après validation de l'utilisateur. Pas encore testé par l'utilisateur.

Réalisé : le double-clic sur un paragraphe ou un titre `##` à `####` le rend modifiable dans la page. `Entrée` ne fait rien, `Cmd+Entrée` ou cliquer ailleurs enregistre, `Échap` annule. Le bloc est d'abord reconverti en Markdown et comparé à ses lignes : en cas d'écart, la popup Markdown s'ouvre sans toucher au fichier. Seules les lignes du bloc sont réécrites. Détails : ADR `2026_11_04_13_20_[RENDERING]`, section « Modification sur place au double-clic ».

Décisions prises sans demande à l'utilisateur, à confirmer : le texte saisi est interprété comme du Markdown (pas d'échappement) ; vider un bloc n'écrit rien ; les autres blocs gardent le double-clic du navigateur.

Limites : remplacer tout le texte d'un lien en tapant place la suite de la frappe hors du lien (Chromium). Coller sur un mot en `code` un texte contenant une espace retire le style `code`. Fermer la fenêtre pendant une édition perd la saisie, sans avertissement. Changer de fenêtre enregistre.

Fichiers : `lib/html-view/blockMarkdown.ts`, `lib/html-view/inlineEdit.ts`, `lib/html-view/htmlFrame.ts`, `routes/HtmlView.svelte`, `src/lib/markdownSection.ts`, catalogues i18n, `tests/unit/block-markdown.test.ts`, `tests/unit/markdownSection.test.ts`, `tests/e2e/html-view-inline-edit.spec.ts`.

Vérifications : tests écrits avant le code. Unitaires : 178 réussis. API : 265 réussis, 1 ignoré. E2E complet, passé une fois : 208 réussis, 1 échec, le collage, qui a révélé un vrai bug (`<b>` de Chromium refusé par le convertisseur, texte saisi perdu). Après correction, seuls `html-view-inline-edit.spec.ts`, `html-view.spec.ts` et `html-templates.spec.ts` ont été relancés : 19 réussis ; la suite E2E complète n'a pas été repassée. `explorer.spec.ts:159` a passé dans le passage complet. Lint sans erreur sur les modules TypeScript modifiés, `svelte-check` sans erreur, `okf:validate` conforme. Rendu de l'édition contrôlé sur capture, en thème clair, sous Chromium piloté par Playwright. Thème sombre, Safari et Firefox non contrôlés.

Prochaine action : test par l'utilisateur sur un vrai document, puis merge. Les outils du MCP ne sont pas exposés dans cette session (le serveur répond sur le port 4321) : métadonnées et hashes non mis à jour ; attacher `lib/html-view/blockMarkdown.ts` et `lib/html-view/inlineEdit.ts` à l'ADR et rafraîchir ses hashes.

# Édition au clic droit depuis la page HTML — 5 novembre 2026

Statut : terminé et mergé dans `main`, validé par l'utilisateur.

Réalisé : « Voir en HTML » ouvre `/html-view`, avec le rendu dans une iframe `sandbox="allow-same-origin"`. Le clic droit sur un bloc ouvre `SectionEditor`, sauf si du texte était sélectionné avant le clic. À la fermeture, le HTML est régénéré et la position conservée. Le bouton « Ouvrir seule pour imprimer » ouvre la page sans la barre d'outils. La page parente ouvre les liens de l'iframe et ignore les protocoles inconnus (`javascript:`). Détails : ADR `2026_11_04_13_20_[RENDERING]`, section « Édition depuis la page HTML ».

Hors périmètre : le titre, le sommaire et les notes n'ont pas de bloc source, le clic droit y laisse le menu du navigateur. Une page ouverte n'est pas rechargée si le document change ailleurs : l'enregistrement répond alors par le conflit habituel.

Fichiers : `routes/HtmlView.svelte`, `lib/html-view/htmlFrame.ts`, `lib/home/displayConfig.ts`, `lib/home/sectionAtTarget.ts`, `lib/home/api.ts`, `lib/siteTheme.ts`, `routes/Home.svelte`, `App.svelte`, `HtmlTemplateActions.svelte`, `src/lib/htmlAnnotations.ts`, `src/routes/htmlTemplates.ts`, `src/routes/documents.ts`, `src/server.ts`, catalogues i18n, `tests/e2e/html-view.spec.ts`, `tests/e2e/html-templates.spec.ts`, `tests/api/html-templates.spec.ts`, `tests/unit/html-annotations.test.ts`.

Vérifications : tests unitaires et API rouges puis verts ; `html-view.spec.ts` écrit avant le code, mais son premier passage date de l'implémentation. Unitaires : 166 réussis. API : 265 réussis, 1 ignoré. E2E : 197 réussis, 1 échec de `explorer.spec.ts:159` (renommage : l'article affichait encore le premier document), qui passe 5 fois sur 5 seul ; cause non établie, le code de chargement n'a pas changé. Lint sans erreur sur les modules TypeScript modifiés. `okf:validate` conforme. Rendu contrôlé sur captures, page et popup, en thème clair, sous Chromium piloté par Playwright. Thème sombre et menu contextuel natif de macOS non contrôlés à l'écran.

Ajouté après test de l'utilisateur : l'aperçu de `SectionEditor` n'affiche que les notes de bas de page utilisées par la section (`lib/home/sectionFootnotes.ts`), dans le viewer comme dans `/html-view`. Test E2E rouge puis vert. Seuls `section-edit.spec.ts`, `autosave.spec.ts` et `html-view.spec.ts` ont été relancés après ce changement, pas la suite complète.

Prochaine action : tâche 3 (double-clic) dans une nouvelle session : faite, voir l'entrée ci-dessus. Surveiller `explorer.spec.ts:159`. Les outils du MCP ne sont pas exposés dans cette session : métadonnées et hashes non mis à jour ; attacher `routes/HtmlView.svelte` et `lib/html-view/htmlFrame.ts` à l'ADR et rafraîchir ses hashes.

# Annotations du viewer dans les pages HTML générées — 5 novembre 2026

Statut : terminé et mergé dans `main`, rendu validé par l'utilisateur.

Réalisé : `image-width`, `quote-type`, `quote-title` et `quote-icon` sont appliqués côté serveur, pour tous les templates. `image-align` aussi, bien qu'absent de la liste de la tâche, car il accompagne `image-width` dans le viewer. Détails et écarts avec le viewer : ADR `2026_11_04_13_20_[RENDERING]`, section « Annotations du viewer ».

Fichiers : `src/lib/htmlAnnotations.ts`, `src/lib/contentAnnotations.ts` (extrait du viewer), `src/lib/htmlDocument.ts`, `home/blockquoteAttributes.ts`, `home/imageAttributes.ts`, `tests/unit/html-annotations.test.ts`, `tests/api/html-templates.spec.ts`.

Vérifications : tests unitaires rouges puis verts. Unitaires : 165 réussis. API : 263 réussis, 1 ignoré, 1 échec de `tree.spec.ts:443` (documents liés), qui passe 5 fois sur 5 seul ; message d'erreur non conservé. E2E : 192 réussis. Lint sans erreur sur les modules TypeScript modifiés.

Rendu contrôlé par l'utilisateur, pas par l'agent : le lancement du serveur de contrôle a échoué 3 fois (erreurs de ligne de commande, sans lien avec le code).

Élargi à la demande de l'utilisateur : le template `article` passe de 66rem à 90rem et sa colonne de texte n'est plus limitée (environ 1120 px sur un écran de 1440 px, soit des lignes d'environ 140 caractères). Après ce changement, seul `html-templates.spec.ts` a été relancé : 9 réussis.

Prochaine action : tâche 2 (édition au clic droit), dans une nouvelle session. Surveiller le test intermittent `tree.spec.ts:443`. Les outils du MCP ne sont pas exposés dans cette session : métadonnées et hashes non mis à jour ; attacher `src/lib/htmlAnnotations.ts` et `src/lib/contentAnnotations.ts` à l'ADR et rafraîchir ses hashes.

# Template HTML pour les articles — 5 novembre 2026

Statut : terminé et mergé dans `main`, sur décision de l'utilisateur.

Réalisé : template `article` (dossier `articles`) pour la lecture longue, avec grand titre, colonne de texte, sommaire latéral et notes de bas de page discrètes. Correction du moteur : les images relatives (`images/`, `./images/`, `images-ai/`) sont réécrites depuis la racine. Sans cela, elles donnaient une 404 dans toute page générée, fiches d'entretien comprises.

Balises pour LLM : une balise isolée (`<reformule cette phrase>`) s'affiche comme dans le viewer, en `b` avec infobulle, hors du titre, du sommaire et des ancres, et masquée à l'impression.

Limite à traiter dans une prochaine tâche : les commentaires du viewer (`image-width`, `quote-type`, `quote-title`, `quote-icon`) ne sont pas appliqués dans les pages générées. Les images occupent la largeur du template et les encadrés deviennent de simples citations, sans leur titre. Décrit dans l'ADR du 4 novembre.

Fichiers : `html-templates/article.html`, `src/lib/htmlTemplates.ts`, `src/lib/htmlDocument.ts`, catalogues i18n, `tests/unit/html-document.test.ts`, `tests/api/html-templates.spec.ts`, ADR `2026_11_04_13_20_[RENDERING]`.

Vérifications : tests unitaires et API rouges puis verts. Dernier passage complet : unitaires 153 réussis, API 262 réussis et 1 ignoré, E2E 192 réussis. `inline-snippet-edit.spec.ts:227` (copie d'image) a échoué une fois au passage précédent, puis a passé 3 fois sur 3 seul et dans ce dernier passage complet : test intermittent. Rendu contrôlé sur une copie de l'article `comprendre_et_maitriser_ses_skills` : ordinateur, mobile, média d'impression, 6 images chargées, aucune erreur console.

Prochaines tâches décidées par l'utilisateur, chacune dans sa session :

1. Appliquer les annotations du viewer (`image-width`, `quote-type`, `quote-title`, `quote-icon`) à la génération, côté serveur, pour tous les templates. Fait : voir l'entrée ci-dessus.
2. Éditer depuis la page HTML avec le clic droit. « Voir en HTML » ouvre une page de l'application contenant le rendu dans une iframe `sandbox="allow-same-origin"`, sans script dans la page. Le clic droit sur un bloc ouvre directement `SectionEditor`, sauf si du texte est sélectionné : le menu du navigateur reste alors disponible. À la fermeture, le HTML est régénéré et la position conservée. Fait : voir l'entrée du même nom, en tête de ce fichier.
3. Modifier sur place avec le double-clic, pour les paragraphes et les titres `##` à `####`. Le bloc est d'abord reconverti en Markdown et comparé à ses lignes ; en cas d'écart, la popup Markdown s'ouvre sans toucher au fichier. `Entrée` ne fait rien, cliquer ailleurs ou `Cmd+Entrée` enregistre, `Échap` annule. Fait : voir l'entrée « Modification sur place au double-clic », en tête de ce fichier.

Faisabilité testée par prototype sous Chromium, hors dépôt : événements captés depuis la page parente, scripts du document bloqués, 106 blocs sur 107 de l'article redonnent leur source (espaces et retours à la ligne ignorés). À prévoir : un bouton ouvrant la page seule pour l'impression, et l'adaptation du test `instanceof Element` de `sectionAtTarget` pour les éléments d'iframe.

Surveiller le test intermittent `inline-snippet-edit.spec.ts:227`. Les outils du MCP ne sont pas exposés dans cette session : métadonnées et hashes non mis à jour.

# Espaces et caractères spéciaux dans les noms de dossiers — 5 novembre 2026

Statut : terminé et mergé dans `main`, validé par l'utilisateur.

Cause : le champ normalisait le nom à chaque frappe. La normalisation retire les `_` de fin : l'espace tapé disparaissait avant la lettre suivante (`mon dossier & co` donnait `mondossierco`).

Réalisé : saisie libre, comme pour les noms de fichiers. L'aperçu « Sera créé à » affiche le nom normalisé, appliqué à la création. Même correction dans le champ « Nom du nouveau dossier » du modal Nouveau document.

Comportement conservé de `normalizeFolderSegment` : accents retirés (`é` → `e`), suites de caractères remplacées par un seul `_`, aucun `_` en début ou en fin de nom.

Fichiers : `src/frontend-svelte/src/lib/home/NewFolderModal.svelte`, `src/frontend-svelte/src/lib/home/NewDocModal.svelte`, `tests/e2e/folder-creation.spec.ts`.

Vérifications : deux tests E2E avec saisie touche par touche, rouges sur l'ancien code puis verts. Unitaires : 151 réussis. API : 259 réussis, 1 ignoré, 1 échec de `config.spec.ts` (`PUT /api/config accepts relative paths`), non lié, qui passe en relançant le fichier seul (5 sur 5). E2E : 192 réussis.

Prochaine action : surveiller le test intermittent de `config.spec.ts`. Le MCP n'expose pas ses outils dans cette session : métadonnées et hashes non mis à jour.

# Limiter l'application à la machine locale — 5 novembre 2026

Statut : terminé sur la branche `fix/api-locale-uniquement`, à merger dans `main` après validation de l'utilisateur.

Décision de l'utilisateur : usage local uniquement, sans option pour exposer le serveur. Un usage en conteneur avec port mappé ou depuis le réseau ne fonctionnera plus.

Réalisé : le serveur écoute sur `127.0.0.1`. La garde `localOnly` (`src/lib/localRequest.ts`) s'applique à toute l'application, fichiers statiques et `/mcp` compris, et remplace celle de `/api/other-files`. Toutes les entrées du proxy Vite gardent le `Host`.

Fichiers : `src/lib/localRequest.ts`, `src/server.ts`, `src/routes/otherFiles.ts`, `src/frontend-svelte/vite.config.ts`, `README.md`, `README.fr.md`, `tests/api/local-only.spec.ts`, `tests/api/cli.spec.ts`.

Vérifications : `local-only.spec.ts` rouge puis vert. Unitaires : 151 réussis. API : 260 réussis, 1 ignoré. E2E : 190 réussis. Lint sans erreur sur les modules TypeScript serveur modifiés.

Proxy Vite contrôlé sur le vrai serveur de dev : l'utilisateur a validé l'application sur `localhost:5174`. `POST /mcp` répond 200 avec l'`Origin` 5174 et 403 depuis un autre site. `/files` répond 403 depuis un autre site et passe la garde avec l'`Origin` 5174 (404, le dossier servi n'a aucun fichier) : aucun fichier réellement servi à travers le proxy. Le port 4321 ne répond plus sur l'adresse réseau.

Limites connues : un autre programme à l'écoute sur toutes les interfaces au même port ne provoque plus forcément `EADDRINUSE` sur macOS. Une page d'un autre site peut encore déclencher un `GET` sans `Origin` (image, navigation) sans pouvoir lire la réponse.

Décisions : ADR `[SECURITY] Limiter l'application à la machine locale`.

Prochaine action : merger après validation. Le MCP n'expose pas ses outils dans cette session : métadonnées et hashes non mis à jour ; attacher à l'ADR `src/lib/localRequest.ts`, `src/server.ts`, `src/frontend-svelte/vite.config.ts`, et rafraîchir les hashes de l'ADR de l'explorateur.

# Ouvrir les fichiers non Markdown depuis l'explorateur — 5 novembre 2026

Statut : terminé et mergé dans `main`, validé par l'utilisateur, ouverture réelle d'un PDF et d'un DOCX comprise.

Livré : un clic sur un fichier non Markdown de l'explorateur affiche le texte, l'image ou la vidéo dans la zone centrale, avec le rendu de Blueprint. Les autres binaires s'ouvrent dans l'application associée de l'OS, avec un message en cas d'échec ou de refus.

Décision sur le point laissé ouvert au cadrage : les trois routes de `/api/other-files` sont limitées à la machine locale, pas seulement l'ouverture OS et les `.env`, car les noms de fichiers sensibles ne s'énumèrent pas. Détails : ADR de l'explorateur.

Fichiers : `src/lib/filePreview.ts`, `src/lib/otherFiles.ts`, `src/lib/localRequest.ts`, `src/routes/otherFiles.ts`, `src/routes/blueprint.ts`, `src/lib/explorerEntries.ts`, `src/server.ts`, `home/otherFile.ts`, `home/OtherFileViewer.svelte`, `home/TreeNode.svelte`, `home/api.ts`, `home/state.svelte.ts`, `home/types.ts`, `routes/Home.svelte`, `lib/filePreview.css` (extrait de `blueprint/styles.css`), `en.json`, `fr.json`, `tests/helpers/fake-opener.ts`, `tests/unit/other-files.test.ts`, `tests/api/other-files.spec.ts`, `tests/e2e/explorer.spec.ts`.

Vérifications : tests unitaires rouges puis verts. Unitaires : 151 réussis. API : 251 réussis, 1 ignoré. E2E : 190 réussis. Lint sans erreur sur les modules TypeScript modifiés. `okf:validate` conforme. Rendu du texte contrôlé sur captures, en thème sombre et clair, avec le thème de code par défaut. Thème de code clair (`ld-code-light`) non contrôlé.

Corrigé après test de l'utilisateur : en mode dev (`localhost:5174`), PDF et DOCX étaient refusés avec `not_local`, car le proxy Vite réécrivait le `Host` alors que le `POST` envoie `Origin: http://localhost:5174`. Le proxy de `/api` garde désormais le `Host` (`vite.config.ts`). Contrôlé avec curl à travers le proxy : `Origin` 5174 accepté, autre site et autre application locale refusés. Aucun test automatisé ne couvre le proxy Vite.

Limites des tests : les tests remplacent `open` et `xdg-open` par un faux programme, pour ne jamais lancer d'application sur la machine du développeur. La commande Windows (`rundll32`) n'a été exécutée nulle part.

Hors périmètre : URL du fichier affiché (un rechargement revient au document) ; limitation à la machine locale de `GET /api/blueprint/file-content` et `file-raw`, qui restent lisibles depuis le réseau local.

Prochaine action : le MCP n'expose pas ses outils dans cette session : métadonnées et hashes non mis à jour ; attacher `src/lib/filePreview.ts`, `src/lib/otherFiles.ts`, `src/lib/localRequest.ts`, `src/routes/otherFiles.ts` à l'ADR de l'explorateur et rafraîchir ses hashes.

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
