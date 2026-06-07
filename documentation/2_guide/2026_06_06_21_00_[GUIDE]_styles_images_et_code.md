# Styles , Images & blocs de code

L'apparence des images et des blocs de code est configurable globalement depuis le panneau admin. Ces paramètres s'appliquent à tous les documents sans modifier leur Markdown source.

---

## Accéder au panneau admin

1. Cliquer sur l'icône **⚙️ Paramètres** dans la barre de navigation.
2. Saisir le mot de passe administrateur.
3. Naviguer vers l'onglet **Apparence**.

---

## Styles d'images

### Options disponibles

| Option         | Défaut  | Effet                                |
| -------------- | ------- | ------------------------------------ |
| Coins arrondis | ✅      | Ajoute `border-radius: 0.5rem`       |
| Centrage       | ✅      | Centre l'image dans le flux de texte |
| Bordure        | ✅      | Fine bordure grise autour de l'image |
| Ombre          | ❌      | Ombre portée douce sous l'image      |
| Largeur max    | `100 %` | Limite la largeur des grandes images |

### Image inline standard

**Syntaxe :**

```markdown
![Schéma d'architecture](./schema-architecture.png)
```

L'image s'affiche avec les styles globaux actifs (coins arrondis, bordure, centrage si configurés).

### Image cliquable , plein écran

En enveloppant l'image dans un lien vers elle-même, un clic l'ouvre en lightbox plein écran dans Living Documentation.

**Syntaxe :**

```markdown
[![Schéma d'architecture](./schema-architecture.png)](./schema-architecture.png)
```

### Image avec taille forcée

Pour surcharger la largeur globale sur une image spécifique :

**Syntaxe :**

```markdown
<img src="./schema.png" alt="Schéma" style="width:400px;" />
```

**Rendu :**

L'image s'affiche à 400 px de large, indépendamment des styles globaux.

---

## Styles de blocs de code

### Options disponibles

| Option           | Défaut        | Effet                                       |
| ---------------- | ------------- | ------------------------------------------- |
| Hauteur max      | `400px`       | Au-delà, un bouton "Afficher plus" apparaît |
| Thème syntaxique | `github-dark` | Palette de couleurs highlight.js            |
| Bouton copier    | ✅            | Icône de copie en haut à droite du bloc     |
| Numéros de ligne | ❌            | Affiche les numéros à gauche                |

### Thèmes disponibles

<!-- table-style: striped -->

| Thème           | Style                            |
| --------------- | -------------------------------- |
| `github-dark`   | Sombre, contraste élevé , défaut |
| `github`        | Clair, style GitHub              |
| `atom-one-dark` | Sombre, palette Atom             |
| `vs2015`        | Sombre, style Visual Studio      |
| `xcode`         | Clair, style Xcode               |
| `monokai`       | Sombre, fond noir, palette vive  |

---

## Configuration directe dans `.living-doc.json`

Les paramètres du panneau admin sont stockés dans ce fichier. On peut aussi les éditer directement.

**Syntaxe :**

```json
{
  "imageRoundedCorners": true,
  "imageCentered": true,
  "imageBorder": true,
  "imageShadow": false,
  "codeBlockMaxHeight": 400,
  "codeBlockTheme": "github-dark",
  "codeBlockCopyButton": true,
  "codeBlockLineNumbers": false
}
```

**Ce que ça change :**

Les modifications dans `.living-doc.json` sont prises en compte au prochain chargement de page, sans redémarrer le serveur.

---

## Priorité des styles

Les styles globaux s'appliquent à tous les documents. Un document peut toujours les surcharger localement avec du HTML inline :

**Syntaxe :**

```html
<!-- Image sans coins arrondis, même si le style global les active -->
<img
  src="./screenshot.png"
  alt="Screenshot"
  style="width:300px; border-radius:0; border:none;"
/>
```

Le style inline a toujours la priorité sur les styles CSS globaux.
