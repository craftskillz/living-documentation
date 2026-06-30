---
**date:** 2026-06-30
**status:** Draft
**description:** Presentation courte du menu Home et de la navigation principale dans Living Documentation.
**tags:** home, menu, navigation, dossiers, categories, documents, recherche
---
### Menu **Home**

Le menu <kbd>Home</kbd> est la porte d'entrée de votre documentation.

C'est ici que vous retrouvez vos dossiers, vos catégories, vos documents, et les principales actions de création.


### Ce que vous voyez à gauche

<div class="grid grid-cols-2 gap-4">
  <div>

La colonne de gauche affiche :

- le nombre de documents disponibles
- les dossiers de votre documentation
- les catégories détectées dans les noms de fichiers
- les documents Markdown
- les badges utiles : annotations, fichiers joints, statuts

Un clic sur un document l'ouvre dans la partie principale de la page.

  </div>
  <div>

<!-- image-width: 2/3 -->
![Barre laterale Home affichant les documents classes par categories](/images/readme-sidebar.png)
  </div>

</div>

### Ce que vous voyez à droite

<div class="grid grid-cols-2 gap-4">
  <div>

<!-- image-width: 2/3 -->
![Barre laterale Home affichant les documents classes par categories](/images/readme-sidebar.png)
  </div>

  </div>
  <div>

Lorsque vous cliquez sur le bouton Table des matières <kbd><i class="fa-solid fa-list-ul"></i></kbd>, une colonne apparaît à droite de l'écran et affiche une Table des matères dont les liens sont clickables.
Chaque Element d'une table des matière correspond à un Header `# Element` pour H1, `## Element` pour H2, etc.

</div>

### Dossiers et catégories

Dans **Living Documentation**, les dossiers et les catégories ne sont pas la même chose.

- un **dossier** correspond à un vrai dossier sur votre disque
- une **catégorie** vient du nom du fichier Markdown

Par exemple :

<!-- code-width: 1/2 -->
```text
PROCESSUS/2026_06_30_10_00_[GUIDE]_preparer_une_reunion.md
```

Ici :

- `PROCESSUS` est le dossier
- `GUIDE` est la catégorie
- `preparer_une_reunion` est le titre du document

### Créer un dossier

Le bouton <kbd>New Folder</kbd> permet d'ajouter une nouvelle section dans votre documentation.

<!-- image-width: 1/3 -->
![Fenetre de creation d'un nouveau dossier dans Living Documentation](/images/popup-creer-dossier.png)

Les noms de dossiers sont normalisés automatiquement pour rester propres sur le système de fichiers.

Exemple :

<!-- code-width: 1/3 -->
```text
204_PROJET HERMES
```

devient :

<!-- code-width: 1/3 -->
```text
204_PROJET_HERMES
```

### Créer un document

Le bouton <kbd>New Document</kbd> permet d'ajouter un document Markdown.

<!-- image-width: 1/2 -->
![Fenetre de creation d'un nouveau document dans Living Documentation](/images/popup-creer-document.png)

Vous choisissez :

- un titre
- une catégorie
- un dossier de destination

Le nom du fichier est ensuite généré automatiquement selon le pattern configuré dans <kbd>Admin</kbd>.

### Retrouver rapidement un contenu

Le menu Home sert aussi à retrouver vite un document.

Vous pouvez :

- parcourir les dossiers
- ouvrir ou fermer les catégories
- utiliser la recherche
- repérer les documents avec fichiers joints ou annotations

### Conseil simple

Commencez avec peu de dossiers.

Ajoutez de nouvelles sections seulement quand votre documentation devient difficile à parcourir.
Une structure simple est souvent plus utile qu'une arborescence trop détaillée.
