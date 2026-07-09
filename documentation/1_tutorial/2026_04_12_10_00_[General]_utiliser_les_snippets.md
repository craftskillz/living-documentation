---
type: Document
title: Utiliser Les Snippets
---

## Introduction

Les **snippets** sont des modèles Markdown prêts à l'emploi que vous insérez au curseur en un clic. Ils évitent de taper à la main les syntaxes complexes (tableaux, blocs dépliables, arbres ASCII…).

Vous pouvez les utiliser de deux façons :

- en mode **édition**, pour insérer un nouveau snippet ou remplacer une sélection Markdown ;
- en mode **lecture**, avec un clic droit sur certains snippets déjà rendus, pour les modifier sans rechercher leur Markdown source.

## Prérequis

Pour insérer un snippet, être en mode **édition** sur un document. Si ce n'est pas le cas, [éditez d'abord un document](?doc=1_tutorial%252F2026_04_12_09_00_%255BGeneral%255D_editer_et_sauvegarder).

Pour modifier un snippet inline, rester en mode lecture sur le viewer du document.

## Passons à la pratique

### Insérer un snippet simple

1. En mode édition, **positionnez votre curseur** à l'endroit où vous voulez insérer le snippet.

2. **Cliquez sur `🧩 Snippets`** dans la barre d'outils de l'éditeur.

   Un panneau s'ouvre à droite avec la liste des snippets disponibles.

3. Choisissez **`Bloc dépliable`** (`<details>`).

   Des champs apparaissent : _Titre du bloc_ et _Contenu_.

4. Remplissez :
   - Titre : `Voir les détails`
   - Contenu : `Voici le contenu caché.`

5. Cliquez sur **`Insérer`**.

   ✅ Le snippet est inséré au curseur :

   ```markdown
   <details><summary>Voir les détails</summary>

   Voici le contenu caché.

   </details>
   ```

---

### Insérer un tableau avec l'éditeur de tableau

1. Cliquez sur **`🧩 Snippets`** → choisissez **`Tableau`**.

2. Définissez le nombre de colonnes et de lignes.

3. Remplissez les cellules dans la grille interactive.

4. Cliquez **`Insérer`**.

   ✅ Un tableau Markdown aligné est généré :

   ```markdown
   | Colonne 1 | Colonne 2 | Colonne 3 |
   | --------- | --------- | --------- |
   | val 1     | val 2     | val 3     |
   | val 4     | val 5     | val 6     |
   ```

---

### Mode détection , modifier un snippet existant dans le Markdown

1. En mode édition, **sélectionnez** dans le textarea un snippet déjà présent (par exemple, un bloc `<details>…</details>` entier).

2. **Cliquez sur `🧩 Snippets`**.

   Si le snippet est reconnu, un message vert s'affiche et les champs sont **pré-remplis** avec les valeurs existantes.

3. Modifiez les champs, puis cliquez **`Insérer`** pour remplacer la sélection.

> Si la sélection n'est pas reconnue, un message orange l'indique et le panneau reste vide.

---

### Édition inline depuis le viewer

1. En mode lecture, faites un **clic droit** sur un snippet rendu : tableau, bloc de code, citation, arborescence, liste, texte coloré ou section colorée.
2. Si le bloc est reconnu, cliquez sur **`Édition inline`** dans la petite popup.
3. La modale Snippets s'ouvre avec le type détecté verrouillé. Les champs utiles sont préremplis : grille de tableau, contenu du code, texte de citation, éléments de liste, contenu coloré, etc.
4. Modifiez le contenu puis cliquez sur **`Enregistrer`**.
   ✅ Le Markdown source est remplacé et le document rendu se met à jour.
5. Pour retirer entièrement le snippet, cliquez sur **`Supprimer le bloc`**, confirmez, puis le bloc Markdown détecté est supprimé du document.

> En édition inline, le type de snippet ne peut pas être changé : cela évite d'écraser une plage Markdown avec un autre format.
