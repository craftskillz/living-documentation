# Dossiers et Catégories

Dans Living Documentation, deux notions distinctes structurent la barre latérale : les **dossiers** et les **catégories**. Elles ne sont pas interchangeables.

---

## Les dossiers

Un dossier correspond directement à un **répertoire sur le système de fichiers**.

Living Documentation scanne le dossier de documentation de façon récursive. Chaque sous-répertoire devient un nœud collapsible dans la sidebar.

```
docs/
├── adrs/              → dossier "Adrs" dans la sidebar
│   └── tests/         → sous-dossier "Tests" (imbriqué)
├── guides/            → dossier "Guides" dans la sidebar
└── mon_doc.md         → document à la racine (pas de dossier)
```

**Règles :**
- Les noms de dossiers sont affichés en *title case* (`adrs` → `Adrs`)
- Un préfixe numérique (`1_`, `2_`, …) contrôle l'ordre d'affichage et est **masqué** dans l'interface (visible uniquement dans le tooltip au survol)
- L'imbrication est illimitée

---

## Les catégories

Une catégorie est extraite du **nom du fichier**, via le token `[Category]` du pattern de nommage.

```
2024_01_15_10_00_[Architecture]_choix_bdd.md
                  ^^^^^^^^^^^^^^
                  catégorie = "Architecture"
```

La catégorie est indépendante du dossier dans lequel le fichier se trouve. Un fichier `adrs/2024_01_15_[Architecture]_choix.md` appartient au dossier `Adrs` **et** à la catégorie `Architecture`.

**Règles :**
- Si le fichier ne contient pas de `[Category]`, il tombe dans la catégorie **General**
- Les fichiers Extra Files sont toujours placés dans **General**
- La catégorie **General** apparaît toujours en premier, à chaque niveau

---

## Comment la sidebar combine les deux

À chaque niveau de l'arborescence, la sidebar affiche dans cet ordre :

1. **General** (catégorie, toujours en tête)
2. **Sous-dossiers** (triés alphabétiquement, ou par préfixe numérique)
3. **Autres catégories** (triées alphabétiquement)

Exemple concret :

```
docs/
├── getting-started/
│   ├── 2024_01_[Tutoriel]_premiers_pas.md
│   └── 2024_01_[Tutoriel]_installation.md
├── 2024_02_[Architecture]_choix_bdd.md
└── README.md                              ← extra file (General)
```

Sidebar générée :

```
📂 (racine)
  ├── General
  │   └── README.md
  ├── Getting-Started
  │   └── Tutoriel
  │       ├── Premiers Pas
  │       └── Installation
  └── Architecture
      └── Choix Bdd
```

---

## Récapitulatif

| Notion     | Source                     | Contrôle                        | Affiché dans         |
|------------|----------------------------|---------------------------------|----------------------|
| Dossier    | Répertoire système de fichiers | Nom du répertoire (+ préfixe numérique) | Nœud collapsible dans la sidebar |
| Catégorie  | Token `[Category]` dans le nom de fichier | Pattern de nommage configurable | Groupe sous chaque dossier |

> Pour modifier le pattern de nommage, allez dans **⚙ Admin** → champ *Filename pattern*.
