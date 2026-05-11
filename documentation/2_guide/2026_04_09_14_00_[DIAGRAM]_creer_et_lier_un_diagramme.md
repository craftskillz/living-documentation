## Créer un diagramme et le lier à un document

L'éditeur de diagrammes est intégré dans Living Documentation. Les diagrammes sont stockés dans le même dossier que vos documents, versionnable avec votre code.

---

### Créer un nouveau diagramme

1. Cliquez sur **`⬡ Diagram`** dans le header principal.

   L'éditeur de diagramme s'ouvre dans un nouvel onglet (ou dans la même page selon votre navigateur).

2. Dans la liste de diagrammes (panneau gauche), cliquez sur **`+ New diagram`**.

3. Donnez un nom à votre diagramme.

4. Construisez votre diagramme :
   - **Double-clic** sur le canvas → crée un nœud
   - **Glisser** entre deux nœuds → crée une arête
   - **Clic sur un nœud** → sélectionne, affiche le panneau de formatage
   - **Double-clic sur un nœud** → édite le label

5. Cliquez **`💾 Save`** (ou `Cmd/Ctrl+S`).

   Le diagramme est sauvegardé sous forme JSON dans `DOCS_FOLDER/.diagrams/`.

---

### Exporter le diagramme en PNG

1. Depuis l'éditeur, cliquez **`📷 Export PNG`**.

   Une image PNG du canvas est générée et sauvegardée dans `DOCS_FOLDER/images/`.

2. Notez le nom du fichier généré (ex. `diagram-d1234567890.png`).

---

### Lier le diagramme à un document

Une fois le PNG exporté, insérez-le dans votre document Markdown en tant qu'image cliquable pointant vers l'éditeur de diagramme.

**En mode édition**, utilisez le snippet **`Lien vers un diagramme`** :

1. Ouvrez le document cible en mode édition
2. Cliquez **`🧩 Snippets`** → **`Lien vers un diagramme`**
3. Renseignez :
   - L'URL de l'image PNG (`./images/diagram-d1234567890.png`)
   - L'ID du diagramme (visible dans l'URL de l'éditeur : `/diagram?id=d1234567890`)
4. Cliquez **`Insérer`**

Ou directement en Markdown :

```markdown
[![Mon diagramme](./images/diagram-d1234567890.png)](/diagram?id=d1234567890)
```

✅ Dans l'article, un clic sur l'image ouvre l'éditeur de diagramme.
`Shift+Clic` sur l'image l'affiche en plein écran.

---

### Deep-link vers un diagramme spécifique

Vous pouvez créer un lien direct vers un diagramme depuis n'importe quel document :

```markdown
[Voir le diagramme d'architecture](/diagram?id=d1234567890)
```

Au chargement de l'éditeur, le diagramme correspondant est ouvert automatiquement.

---

### Bouton ← Retour

Le bouton **`← Back`** dans l'éditeur de diagramme appelle `history.back()` et retourne à la page qui a ouvert le diagramme (généralement l'article qui contient l'image).
