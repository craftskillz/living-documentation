---
type: ADR
title: Mise à jour de l'image d'un diagramme depuis un document et cache busting
description: Le viewer ajoute `&img=<nom>.png` aux liens `/diagram?id=` qui entourent une image `./images/<nom>.png`, pour que le bouton PNG de l'éditeur écrase cette image, puis réaffiche l'image avec `?v=<timestamp>` (versions en sessionStorage + mémoire) pour contourner le cache navigateur au retour.
tags:
  - diagram
  - png
  - image-upload
  - url-param
  - cache-busting
  - sessionStorage
  - wireDiagramImageLinks
  - markDiagramImageUpdated
  - frontend
timestamp: 2026-09-17T11:46:00Z
status: To be validated
sources:
  - path: src/frontend-svelte/src/lib/diagramImageLink.ts
    hash: 156acc777258e2358dd03859ddc7b5883654f6ca9c3464cd4bd7616ff9c5d00e
    commit: 88439abf7b397feb16d73511b932c63f22808bce
    dirty: false
  - path: src/frontend-svelte/src/lib/diagram/clipboard.js
    hash: b0f63fa665a046ac8e3199bf1394a43310bf71a0b07ea6163fb19c1db908b802
    commit: 267fa7f5fe68bbdc49db57fe0e9e528b81ba74c3
    dirty: false
  - path: src/frontend-svelte/src/lib/home/wireContent.ts
    hash: 42c2811e1f4ea7732b9312fe612453b1399f22b4045a3e44ea0788fc323a29e2
    commit: 39ef0ef1ba56da454763cf889c802353c0d6cd6d
    dirty: false
  - path: tests/e2e/diagram.spec.ts
    hash: 412e3505c1ac6fb61725f7d9dc7a2f58aad4538321ad1eb9b64f4d6325ad45c6
    commit: f1a1264f3698e069424267ed2dea2670a21f0052
    dirty: false
---

## Context

L'ADR [Insertion Diagramme Via Snippet Et Sauvegarde Auto Png](?doc=ADRS%252F2026_04_12_%255BDIAGRAM%255D_insertion_diagramme_via_snippet_et_sauvegarde_auto_png) a introduit le paramètre `img` : l'éditeur de diagramme enregistre le PNG dans `images/` au lieu du presse-papier, mais **uniquement** lorsqu'on arrive depuis l'insertion du snippet Diagramme.

Le lien Markdown inséré dans le document est `[![label](./images/nom.png)](/diagram?id=xxx)`, sans `img`. Quand l'utilisateur revenait plus tard sur le document, cliquait sur le diagramme, le modifiait et cliquait sur PNG, l'image était copiée dans le presse-papier et le document gardait l'ancienne image.

Même avec la bonne image écrasée côté serveur, la navigation SPA (`history.back()`) réaffiche le document avec la même URL d'image : le navigateur réutilise son cache mémoire et montre l'ancienne version.

## Decision

### 1. Réécriture des liens diagramme au rendu (`wireDiagramImageLinks`)

Dans `wireDocContent`, après les styles d'image, chaque `a[href]` dont le pathname est `/diagram` et qui contient une `<img>` dont le `src` correspond à `./images/<nom>.png` ou `/images/<nom>.png` reçoit `img=<nom>.png` dans son `href` s'il ne l'a pas déjà.

- Le Markdown source n'est **pas** modifié : les documents existants bénéficient du comportement sans migration, et l'édition inline (basée sur la source) n'est pas affectée.
- Le nom doit respecter `[A-Za-z0-9_-]+\.png`. La route `POST /api/images/upload` assainit les autres noms (espaces, points…) et écrirait un fichier différent de celui référencé ; dans ce cas le lien reste intact et le bouton PNG garde le mode presse-papier.

### 2. Versionnement de l'image après export (`markDiagramImageUpdated`)

Après un upload réussi, `saveSelectionAsPng` enregistre une version (`Date.now()`) pour ce nom d'image, dans `sessionStorage` (clé `ld:diagram-image-version:<nom>`) et dans une `Map` mémoire de secours (stockage indisponible).

### 3. Cache busting au rendu

Lors de la réécriture des liens, si une version existe pour l'image, `src` devient `/images/<nom>.png?v=<version>`. Seules les images réellement réexportées pendant la session reçoivent un paramètre ; les autres gardent leur URL et leur cache.

### 4. Constante partagée

Le nom du paramètre (`DIAGRAM_IMAGE_PARAM = "img"`) est exporté par `diagramImageLink.ts` et lu par `main.js`, pour que l'émetteur (viewer) et le lecteur (éditeur) ne divergent pas.

## Consequences

### PROS

- Parcours complet depuis un document : clic sur le diagramme → modification → enregistrement → PNG → retour, avec l'image à jour sans rechargement manuel.
- Aucun changement serveur ni migration de contenu.
- Le cache HTTP reste efficace pour les images non modifiées.

### CONS

- La version vit dans la session de l'onglet : un autre onglet ouvert sur le document peut afficher l'ancienne image jusqu'à son propre rechargement / expiration du cache.
- Une image dont le nom n'est pas « upload-safe » ne profite pas de l'écrasement automatique (comportement presse-papier conservé, non signalé dans l'UI).
- Il faut toujours sélectionner les éléments (Cmd+A) avant de cliquer sur PNG, comme dans l'ADR d'origine.

## Relations

- Remplace partiellement [Insertion Diagramme Via Snippet Et Sauvegarde Auto Png](?doc=ADRS%252F2026_04_12_%255BDIAGRAM%255D_insertion_diagramme_via_snippet_et_sauvegarde_auto_png) : le paramètre `img` n'est plus réservé au flux d'insertion du snippet ; il est aussi posé sur les liens diagramme rendus dans un document.
- Test : `tests/e2e/diagram.spec.ts` — « PNG from a document diagram link overwrites its image and the document shows the new version ».
