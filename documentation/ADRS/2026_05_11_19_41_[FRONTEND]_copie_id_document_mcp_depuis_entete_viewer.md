---
**date:** 2026-05-11
**status:** To be validated
**description:** Ajout d'un bouton icône à côté du titre document dans le viewer pour copier l'identifiant MCP décodé du document courant dans le presse-papiers.
**tags:** frontend, viewer, document-id, mcp, clipboard, copyCurrentDocMcpId, copy-doc-id-btn, i18n, playwright
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
