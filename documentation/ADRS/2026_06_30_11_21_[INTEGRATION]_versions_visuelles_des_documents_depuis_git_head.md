---
type: ADR
title: Versions Visuelles Des Documents Depuis Git Head
description: Ajoute une API Git par document et une modale Home qui compare visuellement un commit selectionne avec HEAD, liste les commits du document et prepare des restaurations de blocs avant sauvegarde explicite.
tags:
  - git
  - versions
  - HEAD
  - visual-diff
  - document-versions
  - VersionsModal
  - restore-hunk
  - save-draft
  - baseRef
  - /api/git/document-versions
timestamp: 2026-06-30T11:21:00Z
status: To be validated
---

# Versions visuelles des documents depuis Git HEAD

## Contexte

L'integration Git admin commit automatiquement les changements sous `docsFolder`. Une comparaison entre le fichier courant et `HEAD` devient donc souvent vide : apres chaque sauvegarde, le contenu du document ouvert correspond deja a la derniere version committee.

Le besoin utile est attache au document courant : lorsque Git est active et correctement configure, l'utilisateur doit pouvoir ouvrir une vue `Versions` apres `Metadonnees`, selectionner un commit du document, comparer ce commit avec le `HEAD` courant, consulter les commits qui concernent ce document sur une periode configurable, preparer la restauration de certains blocs du commit selectionne, puis declencher une sauvegarde unique.

## Decision

### API document versions

`src/lib/git-integration.ts` expose `gitDocumentVersions(docsPath, documentId, sinceDays, baseRef)`.

La fonction reutilise la resolution existante du depot Git depuis `docsFolder`, borne le document au pathspec de `docsFolder`, puis retourne :

- `baseRef`, le commit selectionne ; si aucun `baseRef` n'est fourni, l'API choisit `commits[1]` quand il existe afin de comparer par defaut le commit precedent avec `HEAD` ;
- `baseContent`, lu par `git show <baseRef>:<relativePath>` ;
- `headRef: "HEAD"` ;
- `headContent`, lu par `git show HEAD:<relativePath>` ;
- `commits`, lus avec `git log --follow --since=<n> days ago -- <relativePath>` ;
- `relativePath`, chemin du document dans le depot Git.

Les documents extra-files situes hors `docsFolder` ne sont pas eligibles a cette vue Git, car le contrat de l'integration Git reste limite a `docsFolder`.

`src/routes/git.ts` expose cette lecture via `GET /api/git/document-versions?documentId=...&sinceDays=...&baseRef=...`. L'id document est decode une fois pour supporter le chemin UI habituel ou l'id est deja encode avant d'etre place dans la query string. `baseRef` est volontairement limite a `HEAD` ou a un hash hexadecimal court/long avant d'etre passe a `git show`.

### Modale Home

`DocViewer.svelte` interroge `/api/git/status` et n'affiche le bouton `Versions` que lorsque l'integration Git est en mode `enabled` et `ok`.

`VersionsModal.svelte` charge l'API a l'ouverture, affiche les commits du document sur la periode choisie, et highlighte la pastille du commit selectionne. Par defaut, la selection vient de l'API et correspond au commit `n-1` du document lorsque cet historique existe.

Un clic sur une pastille relance l'API avec `baseRef=<hash du commit>`. Le diff ligne par ligne est calcule cote frontend entre `baseContent` (commit selectionne) et `headContent` (`HEAD` courant), ou entre `baseContent` et les changements locaux a enregistrer si l'utilisateur a deja restaure des blocs. Le rendu retenu est cote-a-cote : colonne gauche pour `HEAD` ou les changements en attente, colonne droite pour le commit selectionne, afin que le bouton `<` exprime visuellement une restauration depuis la colonne historique vers la colonne courante.

Le diff utilise une LCS bornee par `MAX_LCS_CELLS` pour conserver une correspondance lisible sur les documents normaux, avec fallback lineaire pour les documents trop grands.

### Restauration de blocs et sauvegarde explicite

Le calcul du diff produit aussi des hunks : chaque bloc modifie connait sa plage dans `baseContent`, sa plage dans `headContent`, les lignes du commit selectionne et les lignes courantes.

La modale affiche un bouton `<` sur le premier rang de chaque hunk. Le clic ne fait aucune requete d'ecriture : il remplace seulement la plage correspondante dans un contenu local de la modale. La colonne de gauche passe alors de `HEAD courant` a `Changements a enregistrer`, et un indicateur `Changements non enregistres` apparait.

Un bouton `Enregistrer`, place au-dessus du diff, reste desactive tant qu'aucun bloc n'a ete applique. Lorsqu'il est clique, il appelle `onsave()` de `DocViewer.svelte` avec le contenu local. C'est donc uniquement ce bouton qui declenche la sauvegarde backend et, par consequence, l'autocommit Git si l'integration est active.

Si la modale est fermee par le bouton `X`, par un clic sur le fond, ou par un changement parent qui passe `open` a `false`, le contenu local restaure est abandonne et reinitialise au contenu courant. Le brouillon local n'est donc jamais conserve entre deux ouvertures de `Versions`.

Avant d'appliquer un hunk, la modale compare la plage attendue avec le contenu local courant. Si ce contenu ne correspond plus au hunk affiche, l'application est bloquee et l'utilisateur doit rafraichir les versions. Apres une sauvegarde reussie, la modale recharge le diff pour afficher le nouveau `HEAD`.

## Consequences

### Avantages

- L'utilisateur voit une difference utile meme avec l'autocommit active, car le diff compare un commit historique au `HEAD` courant.
- L'historique liste uniquement les commits qui touchent le document ouvert, avec une periode modifiable.
- La pastille selectionnee rend explicite le point de comparaison.
- La restauration `<` permet de recuperer seulement un bloc du commit visite, sans revenir integralement au document ancien.
- Plusieurs blocs peuvent etre prepares avant une seule sauvegarde, evitant un autocommit par bloc.
- Une fermeture de la modale abandonne clairement les restaurations non enregistrees au lieu de conserver un brouillon cache.
- Le sens visuel du bouton `<` est coherent : la source historique est a droite et la cible courante est a gauche.
- La feature respecte le bornage de l'integration Git : elle ne lit que les documents sous `docsFolder`.
- Le bouton n'apparait pas si Git n'est pas effectivement utilisable, ce qui evite une action morte dans les projets non configures.

### Limites

- La selection compare le chemin courant du document dans le commit choisi ; les renommages complexes peuvent necessiter une evolution plus fine que `git show <commit>:<relativePath>`.
- Le diff visuel est calcule cote frontend a partir de lignes Markdown brutes ; il ne s'agit pas d'un diff semantique Markdown.
- La restauration opere au niveau hunk/ligne, pas au niveau AST Markdown.
- Un document absent de `HEAD` est affiche comme entierement ajoute.

## Verifications

- `npm run build`
- `npx playwright test tests/api/git.spec.ts`
- `git diff --check`
