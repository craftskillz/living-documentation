---
`🗄️ ADR : 2026_04_12_[DIAGRAM]_insertion_diagramme_via_snippet_et_sauvegarde_auto_png.md`
**date:** 2026-04-12
**status:** Pending Validation
**description:** Déplacer l'insertion d'un lien diagramme du bouton standalone en mode lecture vers une entrée "Diagramme" dans la modale Snippets (mode édition), avec auto-save du document et redirection vers l'éditeur de diagramme ; et enregistrement automatique du PNG dans images/ à la place du clipboard lorsqu'on arrive via ce flux.
**tags:** diagram, snippet, modal, editor, png, clipboard, auto-save, image-upload, url-param, frontend, inline-editing
---

## Context

Jusqu'ici, un bouton "◇ Diagram" était présent dans la barre d'actions de l'article en mode lecture. Il ouvrait une modale permettant de lier un diagramme existant ou d'en créer un nouveau, puis insérait le lien markdown à la **fin** du document, sauvegardait automatiquement, et redirige vers l'éditeur de diagramme.

Ce flux était découplé du mode édition, peu cohérent avec le reste des outils d'insertion (Snippets), et ne permettait pas de choisir la position du lien dans le document.

Par ailleurs, une fois dans l'éditeur de diagramme, l'utilisateur devait :
1. Sélectionner tout (Cmd+A)
2. Copier en PNG (Cmd+Shift+C) → le PNG atterrissait dans le clipboard
3. Revenir dans l'article
4. Coller l'image manuellement dans la textarea (Cmd+V) pour la déposer dans `images/`
5. Vérifier que le nom du fichier correspondait à celui spécifié dans le lien markdown inséré

Ce processus en 5 étapes était source d'erreurs et peu ergonomique.

## Decision

### 1. Suppression du bouton Diagram standalone

Le bouton `◇ Diagram` présent dans la barre d'actions de l'article (mode lecture) est supprimé.

### 2. Entrée "Diagramme" dans la modale Snippets

Une nouvelle entrée `Diagramme` est ajoutée en **première position** de la selectbox de la modale Snippets, et sélectionnée par défaut à l'ouverture. Son panneau expose :
- Un toggle **diagramme existant** / **nouveau diagramme**
- En mode existant : un `<select>` peuplé via `GET /api/diagrams`
- En mode nouveau : un champ texte pour le nom
- Un champ **nom du fichier image** (pré-rempli par slug du titre du document, mis à jour automatiquement quand le nom/la sélection du diagramme change)

### 3. Comportement à l'insertion

Au clic sur "Insérer" :
1. Si nouveau diagramme : `PUT /api/diagrams/:id` pour créer le diagramme vide
2. Le lien markdown `[![label](./images/nom.png)](/diagram?id=xxx)` est inséré **à la position du curseur** dans l'éditeur
3. Le document est auto-sauvegardé via `PUT /api/documents/:id`
4. Redirection vers `/diagram?id=xxx&img=nom.png`

### 4. Sauvegarde automatique du PNG dans l'éditeur de diagramme

Dans `main.js`, le paramètre `img` est lu depuis l'URL au chargement. Si présent :
- Le bouton "Copier en PNG" (et le raccourci `Cmd+Shift+C`) appellent `saveSelectionAsPng(filename)` au lieu de `copySelectionAsPng()`
- `saveSelectionAsPng` génère le blob via le même helper `_selectionToBlob()` partagé, puis l'uploade via `POST /api/images/upload` avec le nom spécifié
- Le toast affiche **"Diagramme enregistré en tant qu'image"**

Si le paramètre `img` est absent (navigation normale), le comportement clipboard est inchangé.

### 5. Synchronisation du nom de fichier image

Dans le panneau Diagramme de la modale Snippets, le champ "nom du fichier image" est mis à jour automatiquement (via `snippetDiagSyncImgName()`) à chaque changement de :
- La sélection du diagramme existant
- Le nom saisi pour un nouveau diagramme
- Le basculement entre les deux modes

## Consequences

### PROS

- Le flux complet (créer le lien + dessiner + exporter) se fait en 3 étapes au lieu de 5+
- L'insertion du lien se fait à la position du curseur, cohérent avec tous les autres snippets
- Plus de risque d'erreur de nom de fichier image : le nom est propagé dans l'URL et utilisé automatiquement
- Pas de dépendance au clipboard pour l'export PNG depuis l'éditeur de diagramme
- La logique de génération du blob PNG est factorisée dans `_selectionToBlob()`, partagée entre les deux modes

### CONS

- Le paramètre `img` dans l'URL de l'éditeur de diagramme est implicite : si l'utilisateur rafraîchit la page ou y revient directement sans passer par le snippet, le bouton revient en mode clipboard normal (comportement attendu mais non signalé dans l'UI)
- Le nom du fichier image peut être modifié manuellement dans la modale, mais la synchronisation automatique écrase la valeur si l'utilisateur change ensuite le diagramme sélectionné
