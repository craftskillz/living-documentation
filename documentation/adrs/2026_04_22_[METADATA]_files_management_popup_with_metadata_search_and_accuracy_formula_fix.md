---
date: 2026-04-22
status: Pending Validation
description: Add a "Metadata Files" top-bar popup to list/replace/delete files under DOCS_FOLDER/files, fix the accuracy formula to unchanged/total, introduce a metadata:// search prefix to locate documents referencing a file, refresh the in-doc search banner live, and add a reusable showConfirm() modal replacing window.confirm().
tags: metadata, files, accuracy, unchanged-over-total, search-prefix, metadata-search, confirm-modal, ux, modal, i18n, rest, put, delete, supersedes-accuracy-formula
---

## Context

Plusieurs manques UX autour des métadonnées et des fichiers joints ont été identifiés dans la même passe :

1. **Aucun endroit pour gérer les fichiers joints.** Les fichiers uploadés via le trombone, le drag & drop ou le paste atterrissaient dans `DOCS_FOLDER/files/` mais il n'existait aucune interface pour les lister, remplacer ou supprimer. Pour corriger un document joint, un utilisateur devait aller dans le système de fichiers local.

2. **La formule d'exactitude ne correspondait pas au modèle mental.** L'ADR métadonnées précédent implémentait `accuracy = 1 - weight/(3*total)` avec des pondérations par statut (unchanged=0, modified=1, missing=3). Remplacer le seul fichier référencé par un document donnait 67 % au lieu de 0 %, ce qui contredit la sémantique annoncée (« le document est-il synchronisé avec les sources ? »).

3. **Impossible de retrouver les documents impactés par un remplacement/suppression.** Après avoir modifié un fichier dans le popup, l'utilisateur ignore quels documents pointaient dessus via `.metadata.json` ; aucun mécanisme de recherche inverse n'existait.

4. **Bandeau de résultats de recherche figé.** Modifier ou vider le champ de recherche ne mettait plus à jour le bandeau « X résultats pour "q" » dans le document ouvert — un F5 + ressaisie était nécessaire.

5. **`window.confirm()` natif moche** pour les confirmations remplacer/supprimer alors que le reste de l'application utilise des modales Tailwind cohérentes.

## Decision

### 1. Popup "Metadata Files"

- Nouveau bouton top bar `📁 Metadata Files` / `📁 Fichiers Métadonnées` dans `index.html`, placé avant Admin, ouvrant `#files-modal`.
- Endpoints REST ajoutés dans `src/routes/files.ts` :
  - `GET /api/files` — liste triée lex (= chronologique via préfixe horodaté `YYYYMMDDHHmmss_<rand4>_<slug>.<ext>`), renvoie `{ filename, displayName, uploadedAt, size, url }`.
  - `PUT /api/files/:filename` — écrase le fichier avec la même clé (pas d'historique), cap 19 MB, validation base64.
  - `DELETE /api/files/:filename` — suppression simple.
- Helpers `isSafeFilename()` et `resolveFilePathSafe()` pour garder la même garde anti-traversée que le reste du routeur.
- Frontend `src/frontend/files-modal.js` : rendu liste, action **Remplacer** (ouvre directement le file picker puis confirme avec l'ancien + nouveau nom), action **Supprimer** (confirme puis DELETE).

### 2. Formule d'exactitude simplifiée

Dans `src/lib/metadata.ts`, la formule passe à :

```ts
// accuracy = unchanged / total. Each entry is an assertion that the doc is in
// sync with a source file; modified or missing both break that assertion.
const accuracy = total === 0 ? 1 : unchanged / total;
```

Les compteurs par statut (`unchanged`, `modified`, `missing`) restent exposés pour que la gauge puisse différencier visuellement la sévérité, mais le score agrégé est purement binaire par entrée.

### 3. Préfixe de recherche `metadata://`

- Constante `METADATA_SEARCH_PREFIX = "metadata://"` partagée côté front (`search.js`) et back (`documents.ts`).
- `GET /api/documents/search?q=metadata://<basename>` :
  - Lit `.metadata.json` via `readMetadataStore`.
  - Sélectionne les docs dont une entrée a `path.basename(entry.path) === needle`.
  - **Subtilité critique** : les IDs produits par `parser.ts` sont `encodeURIComponent(...)` alors que les clés du store métadonnées sont décodées → filtre par `decodeURIComponent(d.id)`.
  - Retourne les résultats avec `excerpt: "↳ <needle>"`.
- Côté front :
  - `_isMetadataQuery(q)` détecte le préfixe.
  - Pour ces requêtes, on saute le filtre local immédiat (titre/catégorie ne correspondront jamais) et on attend la réponse serveur.
  - `runSearchImmediate(q)` (exposé sur `window`) remplit les deux inputs de recherche et lance `doSearch` sans debounce — appelé après remplacement/suppression pour pré-remplir la recherche inverse.
  - Le bandeau "X résultats pour 'metadata://...'" est masqué via une détection du préfixe dans `_wireDocContent`.

### 4. Rafraîchissement live du bandeau de recherche

Dans `src/frontend/documents.js` :
- State module-level : `_lastDocHtml`, `_lastDocIdRendered`.
- Extraction de la logique de rendu dans `_wireDocContent(html)` (innerHTML + heading IDs + hljs + interception liens + tables + bandeau de recherche).
- Nouveau `refreshSearchInCurrentDoc()` : sauvegarde `scrollTop`, ré-exécute `_wireDocContent(_lastDocHtml)`, recharge les annotations, restaure `scrollTop`. Exposé sur `window`.
- `search.js` appelle `window.refreshSearchInCurrentDoc()` à chaque saisie — plus de F5 requis.

### 5. Modale de confirmation générique

Nouveau fichier `src/frontend/confirm-modal.js` :

```js
const ok = await showConfirm({
  title, message, detail,
  confirmLabel, cancelLabel,
  danger: true,
});
```

- Retourne une `Promise<boolean>`.
- HTML dans `index.html` : `#confirm-modal` à `z-[60]` (au-dessus des modales applicatives à `z-50`).
- Clavier : `Escape` = false, `Enter` = true ; clic backdrop = false ; auto-focus sur OK.
- Mode `danger: true` : bouton rouge (`bg-red-500 hover:bg-red-600`) ; par défaut : bleu (`bg-blue-600 hover:bg-blue-700`).
- i18n : `common.confirm`, `files.confirm_replace_{title,message,detail}`, `files.confirm_delete_{title,message,detail}` ajoutés en EN et FR.
- `files-modal.js` utilise `await window.showConfirm({...})` en lieu et place de `window.confirm(...)` pour les deux flux.

### Note sur la supersession

Cet ADR supersede **partiellement** l'ADR `2026_04_22_[METADATA]_source_file_bindings_and_accuracy_gauge.md` sur la **formule d'exactitude uniquement** (le reste — stockage, REST, MCP tools, modale source-root, gauge colorée — reste en vigueur).

## Consequences

### PROS

- **Cycle de vie complet des fichiers joints dans l'app** : plus besoin de sortir pour renommer/remplacer/supprimer un PDF joint.
- **Formule d'exactitude intuitive** : « 5 sources référencées, 4 à jour → 80 % » correspond à la lecture naturelle de la gauge ; un remplacement total tombe à 0 % comme attendu.
- **Recherche inverse metadata://** : immédiatement après un remplacement, l'utilisateur voit la liste des documents qui doivent être relus — workflow "détecter la dérive et la corriger" réellement bouclé.
- **UX de recherche réactive** : le bandeau reflète la requête en cours sans rechargement.
- **Modale `showConfirm()` réutilisable** : toute fonctionnalité future voulant une confirmation a maintenant un helper Promise-based cohérent, accessible au clavier, stylé Tailwind, avec i18n.
- **Sécurité préservée** : `PUT`/`DELETE` réutilisent les gardes anti-traversée existantes ; les noms de fichiers restent générés serveur ; le cap 19 MB est enforced avant Express.

### CONS

- **Pas d'historique de versions** : un `PUT /api/files/:filename` écrase définitivement ; volontaire pour rester simple mais un utilisateur qui remplace par erreur perd l'ancienne version.
- **Duplication de clés i18n** : les anciennes clés `files.confirm_replace` / `files.confirm_delete` (phrase complète) sont conservées à côté des nouvelles split (`_title` / `_message` / `_detail`) — à nettoyer si un jour plus aucun code ne les référence.
- **`metadata://` est une convention ad-hoc** : si d'autres préfixes de recherche apparaissent (`tag://`, `author://`…), il faudra probablement généraliser en dispatcher plutôt qu'empiler des `if _isXQuery`.
- **`_lastDocHtml` est un cache côté client** : si un futur refactor modifie le flux de rendu sans passer par `_wireDocContent`, le bandeau live peut silencieusement désynchroniser ; à garder en tête.
- **Supersession partielle** d'un ADR du même jour : l'historique ADR devient légèrement moins lisible (la formule est dans un second ADR) — acceptable car l'ADR original reste valide pour le reste.
