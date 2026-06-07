# Snippets , clic droit et édition

Living Documentation reconnaît les éléments structurés dans tes documents : tableaux, citations, blocs de code, images.
Ces éléments s'appellent des **snippets**. Tu peux les créer, les modifier et les supprimer sans jamais écrire une ligne de Markdown , directement depuis le lecteur, via un clic droit ou un bouton dans la barre d'outils.

## Les snippets reconnus

Voici les éléments que Living Documentation sait détecter et éditer visuellement.

### Tableau

:::compare
<!-- table-border: bordered -->
<!-- table-color: info -->
| Colonne A | Colonne B |
| --------- | --------- |
| Valeur 1  | Valeur 2  |
:::

### Citation colorée

:::compare
<!-- quote-type: info -->
<!-- quote-title: Bon à savoir -->
<!-- quote-icon -->
> Un callout info avec titre et icône.
:::

### Bloc de code

:::compare
```
typescript
const x: number = 42;
```
:::

### Image

:::compare
![Mon image](./screenshot.png)
:::

---

## Clic droit , éditer un snippet existant

Tout snippet affiché dans un document est éditable en un clic droit.

> 📸 **[SCREENSHOT]** , Menu contextuel après clic droit sur un tableau : montrer le menu avec l'option "Modifier" en surbrillance.

1. **Positionner la souris** sur le snippet à modifier (tableau, citation, image, bloc de code).
2. **Clic droit** , un menu contextuel apparaît.
3. Cliquer sur **Modifier**.
4. La popup d'édition s'ouvre avec les valeurs actuelles pré-remplies.
5. Modifier les champs.
6. Cliquer sur **Appliquer** , le document est sauvegardé instantanément.

> 📸 **[SCREENSHOT]** , Popup d'édition d'un tableau : montrer les champs style, couleur, bordure et la prévisualisation en temps réel à droite.

---

## Popup d'édition , les champs par type

### Tableau

> 📸 **[SCREENSHOT]** , Popup d'édition tableau avec le select "Style" ouvert, montrant les options compact / rayé.

La popup d'édition d'un tableau expose :

- **Style** : `Aucun` · `Compact` · `Rayé`
- **Couleur** : `Aucune` · `Info` · `Succès` · `Avertissement` · `Danger`
- **Bordure** : `Aucune` · `Avec bordures`
- **Contenu** : chaque cellule éditable individuellement

**Ce que ça génère (exemple) :**

```markdown
<!-- table-style: striped -->
<!-- table-color: success -->

| Feature        | Statut |
| -------------- | ------ |
| Recherche      | ✅     |
| Édition inline | ✅     |
```

**Rendu :**

<!-- table-style: striped -->
<!-- table-color: info -->
| Feature        | Statut |
| -------------- | ------ |
| Recherche      | ✅      |
| Édition inline | ✅      |

---

### Citation

> 📸 **[SCREENSHOT]** , Popup d'édition citation : montrer le select type, la checkbox icône, le champ titre et la zone de texte contenu, avec la prévisualisation à droite.

La popup d'édition d'une citation expose :

- **Type** : `Aucun` · `Info` · `Succès` · `Avertissement` · `Erreur`
- **Afficher l'icône** : case à cocher
- **Titre** : champ texte libre (optionnel)
- **Contenu** : zone de texte Markdown

Comportements automatiques dans la popup :

- Changer vers un type coloré **coche l'icône** automatiquement.
- Changer vers un type coloré **remplace le titre** si c'était une valeur par défaut.
- Changer vers `Aucun` **décoche l'icône** et efface le titre si c'était une valeur par défaut.

**Ce que ça génère (exemple) :**

```markdown
<!-- quote-type: warning -->
<!-- quote-title: Avant de continuer -->
<!-- quote-icon -->

> Vérifier que le serveur est bien arrêté avant de modifier `.living-doc.json`.
```

**Rendu :**

<!-- quote-type: warning -->
<!-- quote-title: Avant de continuer -->
<!-- quote-icon -->

> Vérifier que le serveur est bien arrêté avant de modifier `.living-doc.json`.

---

## Bouton + , créer un nouveau snippet

> 📸 **[SCREENSHOT]** , Barre d'outils avec le bouton "+" en surbrillance, et le menu déroulant de sélection du type de snippet.

Le bouton **+** dans la barre d'outils ouvre la popup de création.

1. Cliquer sur **+** dans la barre de navigation.
2. **Choisir le type** dans le menu déroulant : Tableau, Citation, Bloc de code, Image, Texte.
3. Remplir le formulaire.
4. Cliquer sur **Insérer** , le snippet est ajouté à la fin du document.

> 📸 **[SCREENSHOT]** , Popup de création en mode "Citation", champs vides, avec la prévisualisation vide à droite.

---

## Prévisualisation en temps réel

Les deux popups (édition et création) affichent un aperçu du rendu pendant la saisie. Pas besoin de valider pour voir le résultat.

> 📸 **[SCREENSHOT]** , Popup d'édition avec le type changé en "Erreur" : montrer la prévisualisation à droite qui affiche le callout rouge avec l'icône et le titre "Erreur".

---

## Résumé

| Action                   | Comment faire                          |
| ------------------------ | -------------------------------------- |
| Modifier un snippet      | Clic droit → **Modifier**              |
| Créer un snippet         | Bouton **+** dans la barre d'outils    |
| Supprimer un snippet     | Clic droit → **Supprimer**             |
| Annuler une modification | `git checkout HEAD -- mon-document.md` |
