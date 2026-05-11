## Types de snippets disponibles

Les snippets sont accessibles en mode édition via le bouton **`🧩 Snippets`**. Voici la liste exhaustive.

---

### Snippets simples

| Snippet                    | Description                                              | Markdown généré (exemple)                                     |
|----------------------------|----------------------------------------------------------|----------------------------------------------------------------|
| **Bloc dépliable**         | Bloc `<details>` avec titre et contenu masqué par défaut | `<details><summary>Titre</summary>\n\nContenu\n</details>`    |
| **Lien**                   | Lien Markdown standard vers une URL                      | `[Texte](https://exemple.com)`                                |
| **Lien vers un document**  | Lien vers un autre document Living Documentation         | `[Texte](?doc=<id_encodé>)`                                   |
| **Lien d'ancre**           | Lien vers une section du document courant                | `[Texte](#titre-de-section)`                                  |
| **Lien d'ancre (autre doc)** | Lien vers une section d'un autre document              | `[Texte](?doc=<id_encodé>#titre)`                             |
| **Lien vers un diagramme** | Image cliquable ouvrant l'éditeur de diagramme           | `[![Alt](./images/img.png)](/diagram?id=<id>)`                |
| **Image**                  | Image Markdown simple                                    | `![Alt](./images/img.png)`                                    |
| **Bloc de code**           | Bloc de code avec langage                                | ` ```langage\ncode\n``` `                                     |
| **Citation**               | Bloc blockquote                                          | `> Texte de la citation`                                      |
| **Séparateur**             | Ligne horizontale                                        | `---`                                                         |
| **Liste numérotée**        | Liste ordonnée à 3 niveaux d'imbrication                 | `1. item\n   1. sous-item\n      1. sous-sous-item`           |
| **Liste à puces**          | Liste non ordonnée à 3 niveaux d'imbrication             | `- item\n   - sous-item\n      - sous-sous-item`              |

---

### Snippets complexes

#### Tableau (éditeur dynamique)

Ouvre une grille interactive dans le panneau Snippets.

- Définissez le nombre de colonnes et de lignes
- Remplissez les cellules dans l'interface
- Génère un tableau Markdown correctement aligné

```markdown
| Col 1  | Col 2  | Col 3  |
|--------|--------|--------|
| val 1  | val 2  | val 3  |
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

---

### Mode détection

Si vous **sélectionnez** du texte dans le textarea avant d'ouvrir le panneau Snippets, l'outil tente de reconnaître le type de snippet :

- **Message vert** : snippet reconnu, champs pré-remplis → modifiez et réinsérez
- **Message orange** : sélection non reconnue, panneau vide → créez un nouveau snippet

Snippets détectables : bloc dépliable, lien, image, image liée, bloc de code, citation, tableau, liste.
