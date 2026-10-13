---
type: Document
title: Types De Snippets
sources:
  - path: src/frontend/index.html
    hash: 74a96833e006020f3d36cf33aad6066c7228fe4db15477992c455fbbd377e799
  - path: src/frontend/snippets/snippets.js
    hash: 31fe2f807288befeb3e84c32f3ce99e42eb5f9403c68db8ff24fb56681b25f39
  - path: src/frontend/snippets/inline-snippet-edit.js
    hash: 1030dda8aa9bf0f1b663070f0b87731b465a7d742c6ea91ec942af05ec8232d9
---

## Types de snippets disponibles

Les snippets sont accessibles en mode édition via le bouton **`🧩 Snippets`**. Certains snippets rendus sont aussi modifiables depuis le viewer avec un clic droit.

---

### Snippets simples

<!-- table-style: striped -->
<!-- table-border: bordered -->
<!-- table-color: info -->

| Snippet                      | Description                                              | Markdown généré (exemple)                                  |
| ---------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| **Bloc dépliable**           | Bloc `<details>` avec titre et contenu masqué par défaut | `<details><summary>Titre</summary>\n\nContenu\n</details>` |
| **Lien**                     | Lien Markdown standard vers une URL                      | `[Texte](https://exemple.com)`                             |
| **Lien vers un document**    | Lien vers un autre document Living Documentation         | `[Texte](?doc=<id_encodé>)`                                |
| **Lien d'ancre**             | Lien vers une section du document courant                | `[Texte](#titre-de-section)`                               |
| **Lien d'ancre (autre doc)** | Lien vers une section d'un autre document                | `[Texte](?doc=<id_encodé>#titre)`                          |
| **Lien vers un diagramme**   | Image cliquable ouvrant l'éditeur de diagramme           | `[![Alt](/images/img.png)](/diagram?id=<id>)`              |
| **Image**                    | Image Markdown simple                                    | `![Alt](/images/img.png)`                                  |
| **Bloc de code**             | Bloc de code avec langage                                | ` ```langage\ncode\n``` `                                  |
| **Citation**                 | Bloc blockquote                                          | `> Texte de la citation`                                   |
| **Séparateur**               | Ligne horizontale                                        | `---`                                                      |
| **Liste numérotée**          | Liste ordonnée à plusieurs niveaux d'imbrication         | `1. item\n   1. sous-item\n      1. sous-sous-item`        |
| **Liste à puces**            | Liste non ordonnée à plusieurs niveaux d'imbrication     | `- item\n   - sous-item\n      - sous-sous-item`           |

---

### Snippets complexes

#### Tableau (éditeur dynamique)

Ouvre une grille interactive dans le panneau Snippets.

- Définissez le nombre de colonnes et de lignes
- Remplissez les cellules dans l'interface
- Génère un tableau Markdown correctement aligné
- En édition inline, les cellules vides sont conservées et la grille reprend tout le tableau détecté

```markdown
| Col 1 | Col 2 | Col 3 |
| ----- | ----- | ----- |
| val 1 | val 2 | val 3 |
```

#### Arbre ASCII (éditeur d'indentation)

Ouvre un éditeur textuel basé sur l'indentation.

- Saisissez les nœuds de l'arbre, un par ligne
- L'indentation (espaces ou tab) définit la hiérarchie
- Génère un bloc de code `text` avec les connecteurs `├──` / `└──`

```text
racine/
├── dossier-a/
│   ├── fichier-1.md
│   └── fichier-2.md
└── dossier-b/
    └── fichier-3.md
```

#### Texte coloré et section colorée

Ces snippets utilisent des champs couleur/contenu dédiés. En édition inline, l'aperçu Markdown est masqué : les champs de formulaire sont la représentation modifiable.

---

### Mode détection dans le textarea

Si vous **sélectionnez** du texte dans le textarea avant d'ouvrir le panneau Snippets, l'outil tente de reconnaître le type de snippet :

- **Message vert** : snippet reconnu, champs pré-remplis → modifiez et réinsérez
- **Message orange** : sélection non reconnue, panneau vide → créez un nouveau snippet

Snippets détectables : bloc dépliable, lien, image, image liée, bloc de code, citation, tableau, liste, texte coloré, section colorée, arborescence.

---

### Édition inline depuis le viewer

En mode lecture, un clic droit sur un snippet rendu peut proposer **`Édition inline`**. La modale Snippets s'ouvre alors sur le type détecté, avec la selectbox de type verrouillée.

Types actuellement éditables inline :

- tableau ;
- bloc de code ;
- citation ;
- liste numérotée ;
- liste à puces ;
- arborescence ;
- texte coloré ;
- section colorée ;
- liens, images, séparateurs et blocs dépliables reconnus par le mapping inline.

La modale inline permet aussi **`Supprimer le bloc`** après confirmation. La suppression retire la plage Markdown source détectée, pas seulement l'élément HTML affiché.
