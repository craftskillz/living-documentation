
---
**date:** 2026-06-30
**status:** Draft
**description:** Presentation courte de l'edition Markdown, des snippets et du widget de comparaison dans Living Documentation.
**tags:** markdown, snippets, edition, comparaison, documents, exemples
---

### Documents **Markdown**

Dans **Living Documentation**, chaque document est un fichier Markdown.

Le Markdown est un format texte simple : vous écrivez avec quelques signes faciles à lire, puis **Living Documentation** affiche le résultat proprement dans le navigateur.

### Exemple simple

:::compare
### Titre de section

Un texte peut contenir du **gras**, de l'_italique_ et une liste :

- première idée
- deuxième idée
- troisième idée
:::

---

### Pourquoi utiliser les snippets ?

Les snippets sont des blocs Markdown prêts à l'emploi.
Ils évitent de retenir toutes les syntaxes et permettent d'insérer rapidement les éléments suivants :

<!-- layout-columns: 1/2 | gap: sm -->

<!-- col -->

- des titres
- des listes
- des tableaux
- des blocs de code
- des citations
- des images
- des liens
- des pièces jointes
- des blocs repliables
- des comparaisons
- des colonnes
- des diagrammes

<!-- col -->

![Panneau Snippets affichant les blocs Markdown disponibles](/images/snippets.png)

<!-- /layout-columns -->

Pour les utiliser :

1. ouvrez un document
2. passez en mode édition
3. placez le curseur à l'endroit souhaité
4. cliquez sur <kbd>🧩 Snippets</kbd>
5. choisissez le bloc à insérer

Le snippet insère du Markdown dans votre document. Vous pouvez ensuite le modifier comme n'importe quel texte.

<!-- quote-type: info -->
<!-- quote-title: Info -->
<!-- quote-icon -->
> Même sans être en mode édition, un **clic droit** sur le document vous permet, **d'insérer ou d'éditer** un snippet.

---

### Le widget de comparaison

Le snippet <kbd>Comparaison</kbd> est très pratique pour apprendre le Markdown.

Il affiche deux colonnes :

- à gauche : le Markdown écrit
- à droite : le rendu final

Sa syntaxe est :

```text
::: compare
Votre Markdown ici
:::
```

---

### Exemple : une note simple

:::compare
### Note de réunion

**Date :** 2026-07-01

Participants :

- Youssef
- Marie
- Karim

Décision :

> On valide la structure documentaire actuelle.
:::

---

### Exemple : un tableau

:::compare
| Élément | Usage |
| --- | --- |
| Dossier | Ranger les documents |
| Catégorie | Classer par type |
| Snippet | Insérer un bloc prêt à l'emploi |
:::

---

### Exemple : du code

:::compare
```typescript
const documentTitle = "Compte rendu de réunion";
const category = "MEETING";

console.log(`${category}: ${documentTitle}`);
```
:::

---

### Exemple : une image

Les images sont aussi du Markdown.

:::compare
<!-- image-width: 1/3 -->
![Atelier local Living Documentation](/images/DOCUMENTATION/concept-01-hero-produit.png)
:::

---

### Quelques syntaxes utiles

| Besoin | Markdown |
| --- | --- |
| Titre | `### Mon titre` |
| Gras | `**important**` |
| Italique | `_nuance_` |
| Liste | `- élément` |
| Citation | `> remarque` |
| Lien | `[texte](https://exemple.com)` |
| Image | `![description](/images/mon-image.png)` |
| Code inline | `` `ma_variable` `` |

### Conseil simple

N'essayez pas d'apprendre tout le Markdown d'un coup.

Commencez par écrire normalement, puis utilisez les snippets quand vous avez besoin d'un tableau, d'un lien, d'une image, d'un bloc de code ou d'une mise en page plus riche.
