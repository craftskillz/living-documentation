---
**date:** 2026-07-01
**status:** Draft
**description:** Presentation courte du menu Diagram pour creer, modifier et relier des diagrammes a vos documents.
**tags:** diagram, diagrammes, canvas, schema, markdown, evidence, mcp, drawio, documentation
---

### Menu **Diagram**

Le menu <kbd>Diagram</kbd> permet de créer et modifier des diagrammes directement dans **Living Documentation**.

Il sert à transformer une explication en vue visuelle :

- architecture
- flux métier
- processus
- dépendances
- synthèse d'un document
- schéma préparé par un agent

<!-- image-width: 2/3 -->
![Exemple de diagramme de contexte Living Documentation](/images/living_documentation_context_demo_conf.png)
<!-- image-width: 2/3 -->
![image](/images/exemple_diagramme_documentation.png)
---

### À quoi sert un diagramme ?

Un diagramme n'est pas là pour remplacer un document.

Il sert à rendre visible ce qui est difficile à lire dans un long texte.

<!-- layout-columns -->

<!-- col -->

Utilisez un diagramme pour montrer :

- les acteurs
- les systèmes
- les relations
- les dépendances
- les étapes importantes
- les responsabilités principales

<!-- col -->

Évitez de tout mettre dans un seul schéma.

Un bon diagramme doit rester lisible rapidement, même par quelqu'un qui découvre le sujet.

<!-- /layout-columns -->

<!-- quote-type: info -->
<!-- quote-title: Principe simple -->
<!-- quote-icon -->
> Un diagramme doit clarifier un document, pas devenir une seconde documentation cachée.

---

### Ouvrir un diagramme

Un diagramme peut être ouvert de plusieurs façons.

| Accès | Usage |
| --- | --- |
| Menu <kbd>Diagram</kbd> | ouvrir l'éditeur de diagrammes |
| Liste des diagrammes | retrouver un diagramme existant |
| Lien dans un document | ouvrir directement le diagramme associé |
| URL `/diagram?id=...` | ouvrir un diagramme précis |

Depuis l'éditeur, le bouton <kbd>Retour</kbd> permet de revenir à la page précédente.

---

### Créer un diagramme

Pour créer un nouveau diagramme :

1. ouvrez <kbd>Diagram</kbd>
2. cliquez sur <kbd>+ Nouveau</kbd>
3. donnez un titre au diagramme
4. ajoutez des formes sur le canvas
5. reliez les éléments avec des flèches
6. cliquez sur <kbd>Enregistrer</kbd>

Le diagramme est enregistré dans l'espace documentaire de **Living Documentation**.

<!-- quote-type: success -->
<!-- quote-title: Bon réflexe -->
<!-- quote-icon -->
> Donnez un titre explicite dès le départ. Il sera plus facile à retrouver dans la liste des diagrammes et à référencer depuis un document.

---

### Les éléments disponibles

L'éditeur propose plusieurs formes pour construire rapidement un schéma.

<!-- layout-columns -->

<!-- col -->

| Élément | Usage courant |
| --- | --- |
| Rectangle | système, écran, composant, étape |
| Ellipse | événement, état, regroupement léger |
| Base de données | stockage, fichier, base, collection |
| Acteur | utilisateur, rôle, personne, équipe |

<!-- col -->

| Élément | Usage courant |
| --- | --- |
| Post-it | note, commentaire, point d'attention |
| Texte libre | titre, annotation, légende |
| Image | capture, illustration, référence visuelle |
| Flèche | relation, flux, dépendance |

<!-- /layout-columns -->

Vous pouvez ensuite ajuster les couleurs, la taille, le texte, les liens, l'alignement et l'ordre d'affichage.

---

### Dessiner rapidement

Le fonctionnement est volontairement proche d'un outil de dessin.

1. sélectionnez une forme dans la barre d'outils
2. placez-la sur le canvas
3. double-cliquez pour modifier son texte
4. utilisez une flèche pour relier deux éléments
5. cliquez sur un élément pour afficher ses options

Vous pouvez activer la grille, le magnétisme et les guides d'alignement pour obtenir un diagramme plus propre.

---

### Relier un diagramme à un document

Un diagramme devient vraiment utile quand il est relié au document qui l'explique.

Dans un document Markdown, vous pouvez insérer une image cliquable qui ouvre le diagramme :

```markdown
[![Diagramme de contexte](/images/mon-diagramme.png)](/diagram?id=diagram-id)
```

Le lecteur voit l'image dans le document.

S'il clique dessus, il ouvre le diagramme dans l'éditeur.

<!-- quote-type: info -->
<!-- quote-title: Astuce -->
<!-- quote-icon -->
> Le document garde l'explication. Le diagramme garde la vue visuelle. Les deux doivent se compléter.

---

### Sources et traçabilité

Certains diagrammes peuvent être générés ou enrichis par des agents et des tools MCP.

Dans ce cas, **Living Documentation** peut conserver des informations de source :

- document utilisé
- section utilisée
- élément concerné
- relation représentée

Le mode de consultation des sources permet de vérifier sur quoi repose un nœud ou une relation.

C'est particulièrement utile quand un diagramme est produit automatiquement à partir d'un document.

---

### Exporter ou partager

Selon le besoin, vous pouvez :

- enregistrer le diagramme
- copier un élément ou une sélection en PNG
- exporter le diagramme au format `.drawio`
- copier l'id technique du diagramme
- insérer une image du diagramme dans un document Markdown

L'export `.drawio` est pratique si vous devez retravailler le diagramme dans un outil externe.

L'image Markdown est pratique si vous voulez rendre le diagramme visible directement dans un document.

---

### Diagrammes et agents

Les agents peuvent aider à produire des diagrammes à partir de vos documents.

Par exemple, un agent peut :

- lire un document
- identifier les acteurs et systèmes importants
- proposer un diagramme de contexte
- créer ou mettre à jour un diagramme
- relier le résultat au document

<!-- quote-type: warning -->
<!-- quote-title: À garder en tête -->
<!-- quote-icon -->
> Un agent peut produire une très bonne première version, mais le diagramme final doit rester lisible et validé par un humain.

---

### Conseil simple

Commencez petit.

Un bon premier diagramme contient souvent :

- un titre clair
- 5 à 7 éléments importants
- des relations nommées
- peu de couleurs
- un lien vers le document associé

Quand ce premier niveau est clair, vous pouvez créer un second diagramme plus détaillé.
