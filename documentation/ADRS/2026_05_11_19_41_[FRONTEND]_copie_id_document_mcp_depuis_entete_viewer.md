---
type: ADR
title: Copie Id Document Mcp Depuis Entete Viewer
description: Ajout d'un bouton icône à côté du titre document dans le viewer pour copier l'identifiant MCP décodé du document courant dans le presse-papiers.
tags:
  - frontend
  - viewer
  - document-id
  - mcp
  - clipboard
  - copyCurrentDocMcpId
  - copy-doc-id-btn
  - i18n
  - playwright
timestamp: 2026-05-11T19:41:00Z
status: Accepted
sources:
  - path: src/frontend/index.html
    hash: 94c14f7fc0ba2295c6749eefe9b85757f26577d8eb4b39e18d7324b223349c7e
  - path: src/frontend/misc.js
    hash: 723368fdc2c798be3831d64f1015a472d6e93cdc383bbe6773d75b647f1d0ef7
  - path: src/frontend/i18n/en.json
    hash: aa4ee832bf7c1439b175a3972b6249ae1df1e81809fef15610d6d77b09475018
  - path: src/frontend/i18n/fr.json
    hash: 36028b30289e541caabe6f7f8a8861e00ce77e39026a915ac4250ab8085b50cd
  - path: tests/e2e/viewer.spec.ts
    hash: 91cd04887c47581e2d58427623241e7d2bfbdcd4d17057e5ca15770562908ab0
---

# Copie de l'id MCP depuis l'en-tête du document

## Contexte

Les outils MCP utilisent l'identifiant de document pour des appels comme `read_document`, `update_document` ou `add_metadata`. Cet identifiant correspond au chemin relatif sans extension, décodé, par exemple `ADRS/2026_03_20_10_15_[CONFIGURATION]_link_extra_files_as_documentation`.

Avant ce changement, le viewer permettait de copier l'URL du document mais pas directement l'identifiant utilisable dans un appel MCP. L'utilisateur devait l'extraire depuis l'URL encodée, l'inventaire MCP ou la liste des documents.

## Décision

Le header du viewer dans `src/frontend/index.html` affiche maintenant un bouton icon-only à côté de `#doc-title` :

- `#copy-doc-id-btn` utilise l'icône Font Awesome `fa-copy` ;
- le tooltip est internationalisé via `doc.copy_mcp_id` ;
- le bouton appelle `copyCurrentDocMcpId()`.

`src/frontend/misc.js` ajoute :

- `writeClipboardText(text)`, helper commun avec fallback `document.execCommand("copy")` ;
- `copyCurrentDocMcpId()`, qui copie `decodeURIComponent(currentDocId)` ;
- un feedback temporaire avec icône check et tooltip `doc.copy_mcp_id_copied`.

`src/frontend/i18n/en.json` et `src/frontend/i18n/fr.json` ajoutent les deux clés nécessaires. `tests/e2e/viewer.spec.ts` vérifie la copie réelle du contenu clipboard depuis un deep-link document.

## Conséquences

- L'identifiant MCP devient récupérable directement depuis l'écran de lecture.
- Le bouton reste discret : aucune nouvelle action textuelle ne charge la barre d'actions principale.
- Le helper clipboard est réutilisé par `copyLink()`, ce qui ajoute aussi un fallback à la copie d'URL existante.
