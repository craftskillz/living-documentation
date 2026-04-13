Pour vos premiers pas avec l'outil je vous recommande de suivre les différents tutoriels que vous trouverez listés dans le tableau ci-après.

Pour la réalisation de ces tutoriels je vous recommande également :
- Soit de lancer une nouvelle instance d'un projet vide **(à l'aide de la commande ic-dessous)** et de l'ouvrir **ensuite** dans un <a href="http://localhost:1234/" target="_blank">un nouvel onglet</a>, ce qui rendra la réalisation des tutoriels plus pratique 
  ```bash
  npx living-documentation -p 1234 ./votre-dossier-pour-pratiquer
  ```
- Soit d'utiliser le projet **actuel** `living-documentation` de `démo` mais néanmoins  d'ouvrir <a href="/" target="_blank">un nouvel onglet</a>  pour y réaliser vos tutoriels, ce qui rendra la réalisation des tutoriels plus pratique

## Tutoriels disponibles

| Tutoriels | Description |
| --------- | --------- |
| [Créez vos dossiers](?doc=1_tutorial%252F2026_04_11_13_25_%255BGeneral%255D_crer_vos_dossiers)         | Apprenez à créer et à structurer vos dossiers         |
| [Créer un document dans un dossier](?doc=1_tutorial%252F2026_04_11_18_58_%255BGeneral%255D_creer_un_document_dans_un_dossier)         | Comment ajouter un document à un dossier existant         |

## Manuel d'utilisation



## Convention de nommage des fichiers

Les fichiers Markdown doivent suivre ce pattern par défaut :

```
YYYY_MM_DD_HH_mm_[Categorie]_titre_du_document.md
```

Exemple :

```
2024_03_15_10_30_[Architecture]_choix_base_de_donnees.md
2024_03_15_14_00_[Tutoriel]_premiers_pas.md
```

Le pattern est entièrement configurable depuis le panneau Admin. L'outil reconnaît les tokens `YYYY`, `MM`, `DD`, `HH`, `mm`, et `[Category]`.

> **Contrainte** : le pattern doit contenir `[Category]` exactement une fois.

---

## Organisation des documents

Les documents sont organisés en **catégories** (extraites du nom de fichier) et en **sous-dossiers** (reflétant l'arborescence du système de fichiers).

Dans la barre latérale :

- La catégorie **General** apparaît toujours en premier
- Les **sous-dossiers** sont affichés ensuite, triés alphabétiquement — un préfixe numérique (`1_`, `2_`) permet de contrôler l'ordre
- Les autres **catégories** suivent, triées alphabétiquement

---

## Fonctionnalités

### Lecture et navigation

- **Deep links** : chaque document a une URL stable (`?doc=id`) que vous pouvez partager ou mettre en favori
- **Recherche instantanée** : filtre par titre et catégorie côté client, puis recherche plein texte côté serveur (350 ms de délai)
- **Ancres** : les titres `## Mon titre` génèrent automatiquement des ancres navigables
- **Mode pleine page** : bouton *Pleine page* pour masquer la sidebar

### Édition

- Cliquez sur **Edit** pour éditer le Markdown brut directement dans le navigateur
- **Cmd/Ctrl+V** avec une image dans le presse-papiers : l'image est uploadée automatiquement dans `DOCS_FOLDER/images/` et le lien est inséré
- **Save** re-rend le document sans recharger la page

### Export PDF

- **Export PDF (article courant)** : bouton dans le header de l'article, imprime le document affiché
- **Export PDF (tous les documents)** : bouton *📄 PDF* en haut de la barre latérale — génère un PDF complet avec table des matières et liens inter-documents fonctionnels

### Diagrammes

Créez des diagrammes interactifs via **⬡ Diagram** dans le header. Les diagrammes peuvent être liés à des articles via le bouton *⬡ Diagram* de l'éditeur. Un clic sur l'image du diagramme dans un article ouvre l'éditeur de diagramme.

### Word Cloud

Le bouton *☁ Word Cloud* permet de générer un nuage de mots à partir de n'importe quel dossier de votre système de fichiers — utile pour visualiser les thèmes dominants d'une base de code ou d'une documentation.

### Admin

Accessible via **⚙ Admin** dans le header. Permet de configurer :

- Le titre de l'application
- Le thème
- Le pattern de nommage des fichiers
- Les fichiers supplémentaires (*Extra files* — fichiers Markdown situés en dehors du dossier principal)
- Le mode debug des diagrammes

---

## Recommandation : écrire avec la méthode Diátaxis

> "Un document, une seule orientation."

La documentation non structurée accumule du contenu hétérogène qui finit par ne plus servir personne. La méthode **Diátaxis** propose un cadre simple : chaque document appartient à exactement **un des quatre quadrants**, définis par deux axes.

### Les deux axes

```
                    APPRENTISSAGE
                         │
         Tutoriel         │         Explication
    (pratique+apprendre) │     (théorique+apprendre)
                         │
PRATIQUE ────────────────┼──────────────── THÉORIQUE
                         │
       Guide pratique    │         Référence
   (pratique+appliquer)  │    (théorique+appliquer)
                         │
                    APPLICATION
```

---

### Quadrant 1 — Tutoriel

**Question clé :** *"Peux-tu m'apprendre à… ?"*

Un tutoriel guide un **débutant** pas à pas vers un résultat concret. Il ne suppose aucune connaissance préalable. L'objectif n'est pas d'expliquer *pourquoi* les choses fonctionnent, mais de faire réussir l'apprenant.

**Caractéristiques :**
- Étapes numérotées, courtes, testées
- Résultat visible et vérifiable à chaque étape
- Environnement propre (n'assume rien d'installé)
- Captures d'écran si besoin
- Durée : 5 à 15 minutes

**Exemple dans une documentation produit :**

```
## Créer votre premier document

1. Créez un dossier `docs/` dans votre projet
2. Lancez `npx living-documentation ./docs`
3. Ouvrez http://localhost:4321 dans votre navigateur
4. Cliquez sur **+** dans la barre latérale
5. Saisissez le titre "Mon premier document" et cliquez **Create**

✅ Votre document apparaît dans la sidebar sous la catégorie General.
```

---

### Quadrant 2 — Guide pratique (*How-to*)

**Question clé :** *"Comment faire… ?"*

Un guide pratique aide un utilisateur qui **sait déjà ce qu'il veut faire** mais a besoin des étapes pour y arriver. Contrairement au tutoriel, il suppose un contexte existant et va droit au but.

**Caractéristiques :**
- Prérequis listés en tête
- Étapes ordonnées vers un objectif précis
- Variantes et alternatives mentionnées
- Erreurs courantes anticipées
- Pas d'explications conceptuelles

**Exemple :**

```
## Comment configurer un pattern de nommage personnalisé

**Prérequis** : Living Documentation démarré, accès à Admin

1. Ouvrez **⚙ Admin**
2. Dans le champ *Filename pattern*, saisissez votre pattern
   — ex. : `[Category]_YYYY_MM_DD_titre`
3. Cliquez **Save**
4. Vérifiez la fenêtre *New Document* : le nom prévisualisé reflète le nouveau pattern

⚠️ Le pattern doit contenir `[Category]` exactement une fois.
```

---

### Quadrant 3 — Explication (*Concept*)

**Question clé :** *"Pourquoi ça fonctionne ainsi ?"*

Une explication **construit la compréhension**. Elle ne donne pas d'instructions mais éclaire les principes sous-jacents, les choix de conception, les compromis. Elle est lue hors contexte de travail, pour apprendre.

**Caractéristiques :**
- Analogies et schémas
- Références croisées vers d'autres concepts
- Aucune instruction à suivre
- Répond au *pourquoi*, pas au *comment*

**Exemple :**

```
## Pourquoi le nommage des fichiers détermine la structure

Living Documentation ne s'appuie sur aucune base de données.
La date, la catégorie et le titre sont encodés dans le nom du fichier,
ce qui rend la documentation portable : un simple `cp -r` ou un
dépôt Git suffit à la transférer. Le parser reconstruit la structure
à la volée à chaque démarrage.

Ce choix implique un compromis : renommer un fichier change son ID
et invalide les deep links existants.
```

---

### Quadrant 4 — Référence

**Question clé :** *"Quelle est exactement la valeur de… ?"*

Une référence est **consultée pendant le travail**, jamais lue de A à Z. Elle est exhaustive, structurée de façon uniforme, et mise à jour en même temps que le code.

**Caractéristiques :**
- Format tabulaire ou liste structurée
- Exhaustif (tous les cas couverts)
- Exemples pratiques inclus
- Aucune narration ni explication

**Exemple :**

```
## Tokens du pattern de nommage

| Token       | Description                        | Exemple   |
|-------------|------------------------------------|-----------|
| `YYYY`      | Année sur 4 chiffres               | `2024`    |
| `MM`        | Mois sur 2 chiffres                | `03`      |
| `DD`        | Jour sur 2 chiffres                | `15`      |
| `HH`        | Heure sur 2 chiffres (00–23)       | `14`      |
| `mm`        | Minutes sur 2 chiffres             | `30`      |
| `[Category]`| Nom de catégorie entre crochets    | `[Guide]` |
| `title`     | Titre en snake_case                | `mon_doc` |
```

---

### Appliquer Diátaxis dans Living Documentation

Utilisez les **catégories** pour distinguer les types :

| Catégorie suggérée | Quadrant Diátaxis |
|--------------------|-------------------|
| `[Tutoriel]`       | Tutoriel          |
| `[Guide]`          | Guide pratique    |
| `[Concept]`        | Explication       |
| `[Reference]`      | Référence         |

Organisez ensuite par **domaine fonctionnel** via les sous-dossiers :

```
docs/
├── authentification/
│   ├── 2024_01_10_[Tutoriel]_premiers_pas_auth.md
│   ├── 2024_01_11_[Guide]_configurer_oauth.md
│   ├── 2024_01_12_[Concept]_jwt_vs_sessions.md
│   └── 2024_01_13_[Reference]_endpoints_auth.md
└── facturation/
    ├── 2024_02_01_[Tutoriel]_creer_premiere_facture.md
    └── 2024_02_02_[Reference]_codes_erreur_paiement.md
```

> **Règle d'or** : si vous hésitez entre deux quadrants pour un document, c'est souvent le signe qu'il faut le diviser en deux documents distincts.

---

## Ressources

- [Diátaxis — site officiel](https://diataxis.fr)
- [Documentation chaotique ? Diátaxis à la rescousse](https://dev.to/onepoint/documentation-chaotique-diataxis-a-la-rescousse--3e9o)
