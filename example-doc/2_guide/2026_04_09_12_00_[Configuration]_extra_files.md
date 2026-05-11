## Extra Files — inclure des fichiers extérieurs au dossier docs

Les **Extra Files** permettent d'ajouter dans Living Documentation des fichiers Markdown qui se trouvent **en dehors** du dossier de documentation principal. Typiquement : `README.md`, `CLAUDE.md`, `CONTRIBUTING.md` à la racine du dépôt.

Ces fichiers apparaissent toujours dans la section **General**, avant les documents normaux.

---

### Ajouter un Extra File via le panneau Admin

1. Ouvrez **⚙ Admin**
2. Descendez jusqu'à la section **General — Extra Files**
3. Utilisez le **navigateur de fichiers intégré** pour parcourir votre système de fichiers
4. Naviguez jusqu'au fichier `.md` souhaité et cliquez **`Add`**
5. Le fichier apparaît dans la liste des Extra Files
6. Cliquez **`Save`**

✅ Le fichier est immédiatement visible dans la sidebar, dans la catégorie General.

---

### Réordonner les Extra Files

Dans la liste des Extra Files du panneau Admin, vous pouvez **réordonner** les entrées par glisser-déposer ou via les flèches ↑↓. L'ordre défini est l'ordre d'apparition dans la sidebar.

---

### Supprimer un Extra File

Cliquez sur l'icône **🗑** à droite de l'entrée dans la liste, puis **`Save`**.

> Cela retire uniquement le fichier de la liste des Extra Files — le fichier sur disque n'est **pas supprimé**.

---

### Cas d'usage typiques

```json
{
  "extraFiles": [
    "/path/to/project/README.md",
    "/path/to/project/CLAUDE.md",
    "/path/to/project/CONTRIBUTING.md"
  ]
}
```

- **README.md** : page d'accueil du projet, visible directement dans la documentation
- **CLAUDE.md** : instructions pour les agents IA, consultables sans ouvrir un éditeur
- **CONTRIBUTING.md** : guide de contribution, partagé avec toute l'équipe via la documentation

---

### Configuration manuelle

Les Extra Files sont stockés dans `.living-doc.json` sous la clé `extraFiles`. Vous pouvez les éditer directement :

```json
{
  "extraFiles": [
    "/chemin/absolu/vers/mon_fichier.md"
  ]
}
```

**Contraintes :**
- Les chemins doivent être **absolus** et se terminer par `.md`
- Les fichiers doivent exister sur le disque au moment du chargement
