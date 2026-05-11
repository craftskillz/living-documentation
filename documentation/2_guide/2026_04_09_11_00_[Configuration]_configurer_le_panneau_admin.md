## Panneau Admin

Le panneau Admin est accessible via le bouton **`⚙ Admin`** dans le header principal. Il permet de configurer Living Documentation sans éditer manuellement le fichier `.living-doc.json`.

---

### Changer le titre de l'application

1. Ouvrez **⚙ Admin**
2. Dans le champ **`Title`**, saisissez le nom de votre projet (ex. `Documentation — MonProjet`)
3. Cliquez **`Save`**

Le titre s'affiche dans l'onglet du navigateur et en haut de la sidebar.

---

### Changer le thème

1. Dans le sélecteur **`Theme`**, choisissez parmi :
   - `system` — suit la préférence système (clair/sombre)
   - `light` — toujours clair
   - `dark` — toujours sombre
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
