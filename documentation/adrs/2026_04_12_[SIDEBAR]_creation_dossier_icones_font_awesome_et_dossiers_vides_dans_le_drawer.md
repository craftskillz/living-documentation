---
`🗄️ ADR : 2026_04_12_[SIDEBAR]_creation_dossier_icones_font_awesome_et_dossiers_vides_dans_le_drawer.md`
**date:** 2026-04-12
**status:** Accepted
**description:** Remplacer le bouton + unique du drawer par deux icônes Font Awesome (nouveau document / nouveau dossier) ; ajouter une modale dédiée à la création de dossier avec browser ; afficher les dossiers vides dans la sidebar via GET /api/browse/alldirs ; pré-remplir catégorie et location dans la modale New Document depuis le document courant ; refactorer le layout du header article.
**tags:** sidebar, folder, modal, browse, api, font-awesome, cdn, icons, empty-folders, alldirs, mkdir, new-document, prefill, header, layout, frontend
---

## Context

Plusieurs améliorations UX indépendantes ont été regroupées dans cette session :

1. **Bouton + unique** — Le drawer ne disposait que d'un seul bouton `+` pour créer des documents. La création de dossiers était imbriquée dans la modale New Document, peu visible et réservée au moment de la sauvegarde finale.

2. **Dossiers vides invisibles** — Après création d'un dossier vide (via la modale New Document ou directement sur le filesystem), celui-ci n'apparaissait pas dans le drawer car le tree était construit uniquement à partir des documents existants.

3. **Pré-remplissage de New Document** — La modale New Document s'ouvrait toujours avec `General` et `/ (root)` par défaut, même lorsqu'un document dans un sous-dossier spécifique était ouvert.

4. **Header article** — Avec l'accumulation de boutons d'action (Marker, Pleine page, PDF, Copy link, Edit…), le titre `<h1>` était compressé et ne prenait pas toute la largeur disponible.

5. **Icônes** — Les boutons utilisaient des SVG inline et des emojis, sans système cohérent. Font Awesome n'était pas encore intégré.

## Decision

### 1. Font Awesome via CDN

Ajout de Font Awesome 6.7.2 dans le `<head>` via cdnjs, cohérent avec la stratégie CDN déjà utilisée pour Tailwind et highlight.js.

### 2. Deux icônes dans le drawer

Le bouton `+` unique est remplacé par deux boutons SVG inline :

- **+ dossier** (`openNewFolderModal()`) — icône dossier avec croix
- **+ document** (`openNewDocModal()`) — icône page avec croix

### 3. Modale New Folder dédiée

Nouvelle modale `#new-folder-modal` avec :

- Champ nom du dossier (validation : `[a-zA-Z0-9_\-. ]+`)
- Sélection de l'emplacement via browser inline (réutilise `GET /api/browse`)
- Aperçu du chemin relatif final
- Pré-remplissage de l'emplacement depuis le document courant (`currentDocId` décodé)
- Appel `POST /api/browse/mkdir` → `fs.mkdirSync(path, { recursive: true })`
- Après création : `loadDocuments()` pour rafraîchir la sidebar

### 4. Endpoint GET /api/browse/alldirs

Nouveau endpoint dans `browse.ts` qui parcourt récursivement le dossier donné et retourne la liste de tous les sous-dossiers en chemins relatifs. Utilisé au chargement pour peupler `allFolderPaths`.

### 5. Dossiers vides dans la sidebar

`loadDocuments()` fetche maintenant aussi `GET /api/browse/alldirs?path=<docsFolder>` et stocke le résultat dans `allFolderPaths`. `buildFolderTree` injecte ces chemins comme nœuds vides dans l'arbre avant le rendu — les dossiers vides apparaissent avec un compteur `0`.

### 6. Pré-remplissage de New Document

`openNewDocModal()` dérive désormais le dossier courant directement depuis `decodeURIComponent(currentDocId)` (segments sauf le dernier), plutôt que depuis `doc.folder` dans `allDocs`. La catégorie est toujours lue depuis `allDocs`. Les champs Category et Location sont pré-remplis automatiquement.

### 7. Layout header article

Le conteneur `flex items-start justify-between flex-wrap` est remplacé par `flex items-start gap-4 flex-wrap` avec `shrink min-w-0` sur le bloc titre et `ml-auto` sur le bloc actions — le titre prend sa taille naturelle, les boutons sont poussés à droite et peuvent wrapper si l'espace manque.

## Consequences

### PROS

- Créer un dossier est une action de premier niveau, directement accessible depuis le drawer sans passer par la modale document
- Les dossiers vides sont visibles immédiatement après création, rendant l'arborescence fidèle au filesystem
- La modale New Document pré-remplit le contexte courant, accélérant la création de documents dans le bon dossier/catégorie
- Font Awesome disponible dans toute l'application pour une iconographie cohérente
- Le header article est plus lisible : titre non compressé

### CONS

- Un fetch supplémentaire (`/api/browse/alldirs`) à chaque `loadDocuments()`, dont un fetch config pour obtenir `docsFolder` — légèrement plus lent sur les grandes arborescences
- `POST /api/browse/mkdir` est non restreint (pas de guard docsPath) — cohérent avec la philosophie local-only du tool mais à noter
- La dérivation du dossier depuis `currentDocId` suppose que l'encodage URL est cohérent entre le serveur et le client (ce qui est le cas avec `encodeURIComponent`)
