## Introduction

Living Documentation vous permet d'éditer vos fichiers Markdown directement dans le navigateur, sans quitter l'outil ni ouvrir un éditeur de code. Les modifications sont sauvegardées sur disque instantanément.

## Passons à la pratique

1. **Ouvrez n'importe quel document** dans la barre latérale gauche.

2. **Cliquez sur le bouton `Edit`** dans le header de l'article (en haut à droite du contenu).

   Le document bascule en mode édition : un `<textarea>` remplace le rendu HTML. Vous voyez le Markdown brut.

3. **Modifiez le texte.** Par exemple, ajoutez une ligne à la fin :

   ```markdown
   Voici ma première modification !
   ```

4. **Cliquez sur `Save`.**

   Le document est sauvegardé sur disque et re-rendu immédiatement, sans rechargement de page.

   ✅ Votre modification est visible et persistée dans le fichier `.md` sur le disque.

5. **Pour annuler sans sauvegarder**, cliquez sur `Cancel` — le document revient à son état d'origine.

---

## Astuce — coller une image

En mode édition, vous pouvez coller une image directement depuis le presse-papiers :

1. Copiez une image (capture d'écran, image depuis un navigateur…)
2. Placez le curseur à l'endroit souhaité dans le textarea
3. Faites `Cmd+V` (Mac) ou `Ctrl+V` (Windows/Linux)

Un placeholder `![image](uploading...)` apparaît immédiatement, puis est remplacé par le lien définitif une fois l'upload terminé.

> L'image est sauvegardée dans `DOCS_FOLDER/images/` avec un nom généré automatiquement.
