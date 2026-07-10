---
type: ADR
title: Accentinsensitive Search Across Global Api And Indocument Highlight
description: "La normalisation NFD + suppression des combining marks est appliquée dans trois couches distinctes pour rendre la recherche insensible aux accents: filtre client sidebar (state.svelte.ts), API full-text (documents.ts), et highlight in-document (searchNotice.ts)."
tags:
  - search
  - accent
  - diacritic
  - NFD
  - NFC
  - deAccent
  - highlightMatches
  - filteredDocs
  - searchNotice
  - documents
  - state
timestamp: 2026-06-06T16:17:00Z
status: To be validated
sources:
  - path: src/frontend-svelte/src/lib/home/state.svelte.ts
    hash: 88d432588d164930984225156ddbb795c20a049bd80954d14087e7f6ca3811df
  - path: src/routes/documents.ts
    hash: 8830e73805ba40c41ed746f05b0f7efbb6f3dd318111a3d1ddd76dfb6464d54d
  - path: src/frontend-svelte/src/lib/home/searchNotice.ts
    hash: 5452bd742d35bbe43f284a5d6a618a9677e50fa8c65662a5cf6649151e5aac59
---

## Contexte

Taper "meme" ne trouvait pas "même". La recherche locale dans le document (`localSearch.ts`) était déjà accent-insensitive (NFD dès le port initial). Trois autres couches ne l'étaient pas.

## Décision

### Fonction deAccent

```ts
const deAccent = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
```

La regex couvre les combining diacritical marks Unicode U+0300–U+036F. Appliquée symétriquement sur la query et sur le texte comparé.

### Couche 1 , Filtre client sidebar (`state.svelte.ts`)

`filteredDocs` compare titres et catégories avec `deAccent` des deux côtés. C'est le filtre rapide avant que les résultats API arrivent.

### Couche 2 , API full-text (`routes/documents.ts`, `GET /api/documents/search`)

`deAccent` appliqué sur `rawQuery` → `query`, puis sur `doc.title`, `doc.category` et `content` avant `.includes()`. L'excerpt utilise la position trouvée dans le contenu normalisé mais tranche le contenu original pour conserver les accents dans l'affichage.

### Couche 3 , Highlight in-document (`searchNotice.ts`)

**Contrainte clé** : les `TextNode` doivent être wrappés en `<mark>` sur les caractères originaux (avec accents), pas sur les normalisés.

Solution : normaliser le texte original en NFC d'abord (`.normalize("NFC")`), ce qui garantit que chaque caractère accentué est **1 code point** (é = U+00E9, pas e + U+0301). Après `deAccent`, la correspondance positionnelle est 1:1 entre texte normalisé et texte original. On peut donc utiliser directement les indices de `normText.indexOf(normQ)` pour `text.slice()`.

```ts
const text = (node.textContent || "").normalize("NFC");
const normText = deAccent(text);
// positions dans normText == positions dans text
```

Le RegExp littéral (`/q/gi`) est remplacé par une boucle `indexOf` sur la version normalisée.

## Conséquences

- `même`, `mème`, `méme`, `mëme` sont tous trouvés par "meme".
- Les accents sont préservés dans les résultats et excerpts affichés.
- `localSearch.ts` (déjà accent-insensitive via `normalizeWithMap`) reste inchangé.
- La recherche `metadata://` n'est pas concernée (recherche par basename de fichier).
