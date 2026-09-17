---
type: Document
title: Configurer Le Panneau Admin
sources:
  - path: src/frontend-svelte/src/routes/Admin.svelte
    hash: 0ef5c165e230244cb9fa2d2fa60d45db52a912fb4c42790a79b6c6ec30e9da56
    commit: 9edc01d3f26b7c9bd1cee1c685bf8ef8ba1e5970
    dirty: false
  - path: src/shared/headerNavigation.ts
    hash: b74d3a8a068bd36cd5f358b73861fe9c1e10246c015cb2ae45b25ea37dbd2c64
    commit: 9edc01d3f26b7c9bd1cee1c685bf8ef8ba1e5970
    dirty: false
---

## Panneau Admin

Le panneau Admin est accessible via le bouton **`⚙ Admin`** dans le header principal. Il permet de configurer Living Documentation sans éditer manuellement le fichier `.living-doc.json`.

---

### Changer le titre de l'application

1. Ouvrez **⚙ Admin**
2. Dans le champ **`Title`**, saisissez le nom de votre projet (ex. `Documentation , MonProjet`)
3. Cliquez **`Save`**

Le titre s'affiche dans l'onglet du navigateur et en haut de la sidebar.

---

### Changer le thème

1. Dans le sélecteur **`Theme`**, choisissez parmi :
   - `system` , suit la préférence système (clair/sombre)
   - `light` , toujours clair
   - `dark` , toujours sombre
2. Cliquez **`Save`**

> La préférence est aussi accessible depuis le bouton ☀️/🌙 dans le header, qui la persiste en `localStorage`.

---

### Modifier le pattern de nommage des fichiers

1. Dans le champ **`Filename pattern`**, saisissez votre pattern personnalisé.

   Exemples valides :

   ```
   YYYY_MM_DD_HH_mm_[Category]_title
   [Category]_YYYY_MM_DD_title
   YYYY_MM_DD_[Category]_title
   ```

2. Cliquez **`Save`**

**Contrainte** : le pattern doit contenir `[Category]` **exactement une fois**. Un message d'erreur s'affiche sinon.

> Pour la liste complète des tokens reconnus, consultez la [référence des tokens](?doc=4_reference%252F2026_04_09_02_00_%255BREFERENCE%255D_tokens_pattern_nommage).

---

### Activer le mode debug des diagrammes

1. Cochez **`Show diagram debug overlay`**
2. Cliquez **`Save`**

En mode debug, un bouton `dbg` apparaît dans la barre d'outils de l'éditeur de diagramme. Il affiche les coordonnées et dimensions de chaque nœud sous forme d'overlays DOM.

Utile pour diagnostiquer des problèmes de positionnement dans les diagrammes.


### Choisir les menus visibles dans le header

Dans **Admin → Menus du header**, cochez les menus à afficher puis enregistrez. Les changements s’appliquent immédiatement et sont conservés après rechargement.

| Menus configurables | Menus toujours visibles |
| --- | --- |
| Workspace, Blueprint, Graph, Survival Kit, AI Context | Admin, Home, Favoris, Diagram, Files, Templates, Agents |

Les cinq menus configurables sont masqués par défaut dans les nouveaux projets ; le CLI permet de les sélectionner pendant l’installation. Les projets existants conservent leur configuration. Masquer un menu ne bloque pas l’accès direct à sa page par URL.

Voir la [décision sur la visibilité des menus](?doc=ADRS%252F2026_09_17_10_44_%255BNAVIGATION%255D_visibilite_des_menus_du_header_et_selection_a_installation).
