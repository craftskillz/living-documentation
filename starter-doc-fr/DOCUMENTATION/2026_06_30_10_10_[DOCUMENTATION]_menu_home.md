---
type: Document
title: Menu Home
description: Presentation courte du menu Home et de la navigation principale dans Living Documentation.
tags:
  - home
  - menu
  - navigation
  - dossiers
  - documents
  - recherche
timestamp: 2026-06-30T10:10:00Z
status: Draft
---

### Menu **Home**

Le menu <kbd>Home</kbd> est la porte d'entrée de votre documentation.

C'est ici que vous retrouvez vos dossiers, vos documents, et les principales actions de création.

---

### Ce que vous voyez à gauche

<!-- layout-columns -->
<!-- col -->
<!-- image-width: 2/3 -->
![Barre laterale Home affichant les dossiers et les documents](/images/DOCUMENTATION/readme-sidebar.png)
<!-- col -->
La colonne de gauche affiche :

- le nombre de documents disponibles
- les dossiers de votre documentation
- les documents Markdown
- les badges utiles : annotations, fichiers joints, statuts

Un clic sur un document l'ouvre dans la partie principale de la page.
<!-- /layout-columns -->

---

### Ce que vous voyez à droite

<!-- layout-columns -->
<!-- col -->
Lorsque vous cliquez sur le bouton Table des matières <kbd><i class="fa-solid fa-list-ul"></i></kbd> une colonne apparaît à droite de l'écran et affiche une Table des matères dont les liens sont clickables.

Chaque élement d'une table des matières correspond à un Header
- `# Element` pour H1
- `## Element` pour H2
- `### Element` pour H3, etc.

<!-- col -->
<!-- image-width: 2/3 -->
![Table des matières interactive](/images/DOCUMENTATION/table_des_matieres_document.png)
<!-- /layout-columns -->

---

### Dossiers et ordre

Dans **Living Documentation**, un **dossier** correspond à un vrai dossier sur votre disque, et un document à un fichier Markdown qu'il contient.

L'explorateur affiche d'abord les dossiers, puis les documents, chacun par ordre alphabétique. Pour choisir un autre ordre, faites un **glisser-déposer** : vers le haut ou le bas pour réordonner le dossier, ou sur un autre dossier pour y déplacer l'élément.

L'ordre est enregistré dans un fichier invisible `liv-doc-main.md`, dans chaque dossier :

<!-- code-width: 1/2 -->
```markdown
---
order:
  - PROCESSUS
  - bienvenue.md
hidden:
  - brouillons
---
```

Pour cacher un dossier ou un document, utilisez <kbd>Masquer</kbd> sur cet élément. <kbd>Afficher les éléments cachés</kbd> les fait réapparaître, grisés, pour pouvoir les réafficher. Un document caché reste accessible par lien.

#### Créer un dossier

Le bouton <kbd>New Folder</kbd> permet d'ajouter une nouvelle section dans votre documentation.

<!-- image-width: 1/3 -->
![Fenetre de creation d'un nouveau dossier dans Living Documentation](/images/DOCUMENTATION/popup-creer-dossier.png)

Les noms de dossiers sont normalisés automatiquement pour rester propres sur le système de fichiers.

Exemple :

<!-- code-width: 1/3 -->
```text
PROJET HERMES
```

devient :

<!-- code-width: 1/3 -->
```text
PROJET_HERMES
```

#### Créer un document

Le bouton <kbd>New Document</kbd> permet d'ajouter un document Markdown.

<!-- image-width: 1/2 -->
![Fenetre de creation d'un nouveau document dans Living Documentation](/images/DOCUMENTATION/popup-creer-document.png)

Vous choisissez :

- un titre
- un dossier de destination

Le nom du fichier est généré à partir du titre, par exemple `preparer-une-reunion.md`. Le titre et la date sont conservés dans le frontmatter du document.

---

### Retrouver rapidement un contenu

Le menu Home sert aussi à retrouver vite un document.

Vous pouvez :

- parcourir les dossiers
- ouvrir ou fermer les dossiers
- utiliser la recherche
- repérer les documents avec fichiers joints ou annotations

### Conseil simple

Commencez avec peu de dossiers.

Ajoutez de nouvelles sections seulement quand votre documentation devient difficile à parcourir.
Une structure simple est souvent plus utile qu'une arborescence trop détaillée.