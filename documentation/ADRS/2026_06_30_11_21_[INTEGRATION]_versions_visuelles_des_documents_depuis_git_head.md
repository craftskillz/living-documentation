---
**date:** 2026-06-30
**status:** To be validated
**description:** Ajoute une API Git par document et une modale Home qui compare visuellement le contenu courant avec HEAD et liste les commits du document sur une période configurable.
**tags:** git, versions, HEAD, visual-diff, document-versions, VersionsModal, gitDocumentVersions, DocViewer, /api/git/document-versions, svelte
---

# Versions visuelles des documents depuis Git HEAD

## Contexte

L'integration Git admin commit automatiquement les changements sous `docsFolder`, mais le viewer Home ne donnait pas encore a l'utilisateur une vue directe de ce qui differe entre le document ouvert et la derniere version committee.

Le besoin est attache au document courant : lorsque Git est active et correctement configure, l'utilisateur doit pouvoir ouvrir une vue `Versions` apres `Metadonnees`, comparer la version courante a `HEAD`, et consulter les commits qui concernent ce document sur une periode configurable, par defaut un mois.

## Decision

### API document versions

`src/lib/git-integration.ts` expose `gitDocumentVersions(docsPath, documentId, sinceDays)`.

La fonction reutilise la resolution existante du depot Git depuis `docsFolder`, borne le document au pathspec de `docsFolder`, puis retourne :

- `baseRef: "HEAD"` ;
- `baseContent`, lu par `git show HEAD:<relativePath>` ;
- `commits`, lus avec `git log --follow --since=<n> days ago -- <relativePath>` ;
- `relativePath`, chemin du document dans le depot Git.

Les documents extra-files situes hors `docsFolder` ne sont pas eligibles a cette vue Git, car le contrat de l'integration Git reste limite a `docsFolder`.

`src/routes/git.ts` expose cette lecture via `GET /api/git/document-versions?documentId=...&sinceDays=...`. L'id document est decode une fois pour supporter le chemin UI habituel ou l'id est deja encode avant d'etre place dans la query string.

### Modale Home

`DocViewer.svelte` interroge `/api/git/status` et n'affiche le bouton `Versions` que lorsque l'integration Git est en mode `enabled` et `ok`.

`VersionsModal.svelte` charge l'API a l'ouverture, affiche les commits du document sur la periode choisie, puis calcule un diff ligne par ligne cote frontend entre `baseContent` et le contenu courant du document. Le rendu retenu est cote-a-cote : colonne gauche pour la derniere version committee, colonne droite pour la version courante.

Le diff utilise une LCS bornee par `MAX_LCS_CELLS` pour conserver une correspondance lisible sur les documents normaux, avec fallback lineaire pour les documents trop grands.

## Consequences

### Avantages

- L'utilisateur voit directement les changements non encore committes ou divergents par rapport a `HEAD` sans quitter Living Documentation.
- L'historique liste uniquement les commits qui touchent le document ouvert, avec une periode modifiable.
- La feature respecte le bornage de l'integration Git : elle ne lit que les documents sous `docsFolder`.
- Le bouton n'apparait pas si Git n'est pas effectivement utilisable, ce qui evite une action morte dans les projets non configures.

### Limites

- La comparaison est toujours faite contre `HEAD`, pas encore contre un commit arbitraire selectionne dans la liste.
- Le diff visuel est calcule cote frontend a partir de lignes Markdown brutes ; il ne s'agit pas d'un diff semantique Markdown.
- Un document absent de `HEAD` est affiche comme entierement ajoute.

## Verifications

- `npm run build`
- `npx playwright test tests/api/git.spec.ts`
- `git diff --check`
