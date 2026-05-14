---
**date:** 2026-05-14
**status:** Accepted
**description:** Les trois mutations de métadonnées (POST add, DELETE remove, POST refresh) — exposées à la fois par les routes HTTP `/api/metadata/:docId` et par les outils MCP `add_metadata`, `remove_metadata`, `refresh_metadata` — rejettent désormais via un guard centralisé `assertNotSuperSeeded` quand le document a `**status:** SuperSeeded` dans son frontmatter, et la popup métadonnées du viewer cache les trois contrôles correspondants plus affiche un bandeau amber « Lecture seule ».
**tags:** metadata, superseded, read-only, lifecycle, adr-history, frontmatter, status, viewer, routes, mcp-tools, guard
---

# Métadonnées en lecture seule pour les documents SuperSeeded

## Contexte

Un ADR `SuperSeeded` représente une décision **gelée** — remplacée par une décision ultérieure, mais conservée pour la traçabilité historique. Si l'on continue à mettre à jour ses métadonnées source (refresh des hashes, ajout/suppression de bindings), on falsifie l'histoire : l'ADR « ancien » se met à pointer vers le code actuel qu'il ne décrivait plus depuis longtemps. La jauge d'accuracy d'un ADR SuperSeeded n'a aucune valeur informative — la décision a déjà été remplacée — donc tout le mécanisme de drift detection appliqué à ce document est trompeur.

Le risque concret : un humain (ou un agent IA) qui veut « nettoyer » la liste `list_adrs_below_accuracy` pourrait être tenté de refresh un ADR SuperSeeded pour faire taire l'alerte. Ce serait précisément l'inverse du comportement attendu.

Deux surfaces d'attaque coexistent : la couche HTTP (UI viewer, curl, scripts) et la couche MCP (outils `add_metadata`, `remove_metadata`, `refresh_metadata`). Les outils MCP appellent **directement** `setDocEntries()` depuis [src/lib/metadata.ts](src/lib/metadata.ts) sans passer par les routes HTTP. Une garde uniquement côté HTTP serait donc contournable par n'importe quel agent IA qui parle MCP.

## Décision

### 1. Guard centralisé dans `lib/status.ts`

[src/lib/status.ts](src/lib/status.ts) (nouveau) expose :

- `parseDocStatus(content)` — extrait la valeur du champ `**status:**` dans le bloc fencé `---`.
- `readDocStatus(docsPath, decodedDocId, extraFiles)` — résout l'id de document vers son chemin `.md` (en respectant `extraFiles` et la garde anti path-traversal), lit le fichier et retourne le statut.
- constante `SUPERSEEDED_STATUS = "SuperSeeded"`.
- classe `DocumentSuperSeededError` (avec `code = "DOCUMENT_SUPERSEEDED"`) pour que les callers distinguent une erreur de cycle de vie d'une erreur générique.
- `assertNotSuperSeeded(docsPath, decodedDocId)` qui lit la config (pour `extraFiles`), appelle `readDocStatus`, et `throw` la `DocumentSuperSeededError` si le statut est SuperSeeded. Pas de lecture si le doc n'a pas de frontmatter ou pas de statut → comportement neutre.

Le guard vit dans `lib/` parce que le cycle de vie d'un document (statut frontmatter) est orthogonal au stockage des bindings ; le module `lib/metadata.ts` n'a pas à connaître la notion. La séparation permet aussi à d'autres routes (futures `documents` mutations, par exemple) de réutiliser le helper.

### 2. Guard appliqué côté HTTP

[src/routes/metadata.ts](src/routes/metadata.ts) appelle `assertNotSuperSeeded` dans une fonction `rejectIfSuperSeeded(docsPath, docId, res)` qui mappe la `DocumentSuperSeededError` en `403 { error: "Document is SuperSeeded; metadata is read-only." }`. Le rejet est posé en première ligne de :

- `POST /api/metadata/:docId` (ajout de fichier source) ;
- `DELETE /api/metadata/:docId` (suppression d'un binding) ;
- `POST /api/metadata/:docId/refresh` (re-baseline des hashes).

La route `GET /api/metadata/:docId` reste ouverte — la lecture est toujours autorisée.

### 3. Guard appliqué côté MCP

[src/mcp/tools/metadata.ts](src/mcp/tools/metadata.ts) appelle `assertNotSuperSeeded` en tête de :

- `toolAddMetadata` ;
- `toolRemoveMetadata` ;
- `toolRefreshMetadata`.

Les tools MCP propagent les `throw` ; le wrapper de `src/mcp/server.ts` les convertit en `{ isError: true, content: [{ text: "Error: <message>" }] }` (envelope MCP standard). Aucun changement nécessaire dans le wrapper.

### 4. Cachette des contrôles côté viewer

[src/frontend/metadata.js](src/frontend/metadata.js) gagne `applyMetadataReadOnlyMode()`, appelée à chaque `openMetadataModal()` et `renderMetadataList()`. Elle masque (via `classList.toggle("hidden", readOnly)`) :

- le bouton `#metadata-refresh-btn` ;
- le bouton `#metadata-add-btn` (nouveau id sur le bouton existant) ;
- chaque icône corbeille `.metadata-row-remove` générée dynamiquement.

Le statut est lu côté client via le helper déjà exposé `window.getDocStatus(currentDocContent)` — pas de nouvel appel réseau. Re-appel après chaque re-rendu de la liste pour que les rows générées après un fetch restent cohérentes.

### 5. Bandeau d'information

Pour ne pas laisser l'utilisateur deviner pourquoi les boutons ont disparu, un bandeau `#metadata-readonly-banner` est affiché en haut de la modale (uniquement quand `readOnly`), avec le ton amber déjà utilisé par la modale de validation (cohérence visuelle entre les deux gardes de cycle de vie). Texte i18n : `metadata.readonly_banner`.

### 6. UX progressive : la modale reste consultable

L'utilisateur peut toujours :

- ouvrir la popup (le bouton Métadonnées n'est pas masqué) ;
- consulter la liste des bindings et leur status (`unchanged` / `modified` / `missing`) ;
- voir la jauge d'accuracy actuelle.

Ce qu'il **ne peut plus** faire est cantonné aux 3 mutations. La défense en profondeur (UI hide + 403 HTTP + throw MCP) protège contre toutes les surfaces d'attaque : viewer, curl, agent IA via MCP, script direct.

## Conséquences

### PROS

- L'historique des ADR SuperSeeded est protégé contre les altérations bien intentionnées (re-baseline pour « nettoyer » la jauge) comme contre les altérations accidentelles, **quelle que soit la surface d'API utilisée**.
- Guard centralisé via `lib/status.ts` : un seul endroit à maintenir, deux callers consommateurs (HTTP et MCP) partagent la même source de vérité. Si un nouveau cycle de vie émerge (`Deprecated`, par exemple), l'extension est triviale.
- Cohérent avec le cycle de vie ADR du projet : `To be validated` → `Accepted` → `SuperSeeded` (gelé). Le bouton « Valider » de l'autre ADR récent gère la première transition ; cette feature gère la dernière.
- Couvert par 4 tests API HTTP (`tests/api/metadata.spec.ts`), 4 tests API MCP (`tests/api/mcp.spec.ts`) et 2 tests E2E (`tests/e2e/metadata.spec.ts`) sur la fixture `with-metadata` étendue d'un ADR SuperSeeded.
- La classe `DocumentSuperSeededError` permet aux futurs callers de distinguer une rejection de cycle de vie d'une autre erreur (path invalide, fichier absent, etc.) sans parser des messages.

### CONS

- Le statut est lu **à chaque** requête mutative — pas de cache. Cost négligeable (fichier déjà sur disque, lecture synchrone) mais à surveiller si on multiplie les guards par statut.
- `getDocStatus` côté frontend dépend de `validate.js` (helper exposé sur `window`). Si `validate.js` n'est pas chargé, `applyMetadataReadOnlyMode` part en mode "non-SuperSeeded" — c'est-à-dire qu'elle laisse tout visible. Acceptable : le backend HTTP **et** MCP rejettent quand même la mutation. À noter dans une rule si on veut formaliser la dépendance.
- Le test E2E qui ferme la modale utilise `page.locator('button:has(.fa-xmark)').first()` (heuristique sur l'icône de fermeture) — fragile si une autre modale avec le même bouton de fermeture est dans le DOM. À remplacer par un id dédié au bouton de close de la modale métadonnées si on touche au markup.
