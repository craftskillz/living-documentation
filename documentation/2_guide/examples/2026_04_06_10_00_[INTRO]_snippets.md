Living Documentation reconnaît les éléments structurés dans tes documents : tableaux, citations, blocs de code, images.
Ces éléments s'appellent des **snippets**.
Tu peux les créer, les modifier et les supprimer sans jamais écrire une ligne de Markdown , directement depuis la page, via un clic droit ou le bouton ***Modifer*** dans la barre d'outils.

## Quelques exemple de snippets reconnus

Voici les éléments que Living Documentation sait détecter et éditer visuellement.

### Entêtes

:::compare
# Header 1
## Header 2
### Header 3
#### Header 4
##### Header 5
:::

### Ligne horizontale
:::compare
---
:::

### Section repliable (collapsible)
:::compare
<details>
<summary>Cliquez pour déplier</summary>

### Bienvenue dans cette section
Mettez y les infos que vous souhaitez

<!-- quote-type: info -->

<!-- quote-title: Info -->

<!-- quote-icon -->

> Et même des snippets si ça vous chante

</details>
:::

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
![Mon image](/images/living_documentation.jpg)
:::

### Et encore beaucoup d'autres ...

---

## Insérer un nouveau snippet

Vous avez la possibilité d'insérer un ***nouveau Snippet** si vous clickez sur une zone vide de la page, un menu contextuel vous est alors proposé.
Une fenêtre de choix des différents ***snippets*** possibles vous permet d'insérer un grand type de snippets (explorez les).
 
![Inserer Snippet](/images/inserer_snippet.png)

#### Vous avez également la possibilité d'accéder à la même fonctionnalité en cliquant sur <kbd>Modifier</kbd> puis <kbd>🧩 Snippets</kbd>

---

## Editer un snippet existant

Tout snippet affiché dans un document est éditable en un <kbd>Click droit</kbd>, il suffit de se positionner dessus et de clicker.
 
![Editer Tableau](/images/edition_tableau.png)

1. **Positionner la souris** sur le snippet à modifier (tableau, citation, image, bloc de code).
2. **Clic droit** , un menu contextuel apparaît.
3. Cliquer sur **Editer**.
4. La popup d'édition s'ouvre avec les valeurs actuelles pré-remplies.
5. Modifier les champs.
6. Cliquer sur **Enregistrer** , le document est sauvegardé instantanément.
