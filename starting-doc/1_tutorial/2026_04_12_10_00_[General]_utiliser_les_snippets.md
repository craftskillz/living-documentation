## Introduction

Les **snippets** sont des modèles Markdown prêts à l'emploi que vous insérez au curseur en un clic. Ils évitent de taper à la main les syntaxes complexes (tableaux, blocs dépliables, arbres ASCII…).

## Prérequis

Être en mode **édition** sur un document. Si ce n'est pas le cas, [éditez d'abord un document](?doc=1_tutorial%252F2026_04_12_09_00_%255BGeneral%255D_editer_et_sauvegarder).

## Passons à la pratique

### Insérer un snippet simple

1. En mode édition, **positionnez votre curseur** à l'endroit où vous voulez insérer le snippet.

2. **Cliquez sur `🧩 Snippets`** dans la barre d'outils de l'éditeur.

   Un panneau s'ouvre à droite avec la liste des snippets disponibles.

3. Choisissez **`Bloc dépliable`** (`<details>`).

   Des champs apparaissent : *Titre du bloc* et *Contenu*.

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

2. Définissez le nombre de colonnes (ex. 3) et de lignes (ex. 2).

3. Remplissez les cellules dans la grille interactive.

4. Cliquez **`Insérer`**.

   ✅ Un tableau Markdown aligné est généré :

   ```markdown
   | Colonne 1 | Colonne 2 | Colonne 3 |
   |-----------|-----------|-----------|
   | val 1     | val 2     | val 3     |
   | val 4     | val 5     | val 6     |
   ```

---

### Mode détection — modifier un snippet existant

1. **Sélectionnez** dans le textarea un snippet déjà présent (par exemple, un bloc `<details>…</details>` entier).

2. **Cliquez sur `🧩 Snippets`**.

   Si le snippet est reconnu, un message vert s'affiche et les champs sont **pré-remplis** avec les valeurs existantes.

3. Modifiez les champs, puis cliquez **`Insérer`** pour remplacer la sélection.

> Si la sélection n'est pas reconnue, un message orange l'indique et le panneau reste vide.
