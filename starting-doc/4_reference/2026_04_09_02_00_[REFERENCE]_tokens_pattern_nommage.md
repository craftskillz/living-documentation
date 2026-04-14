## Tokens du pattern de nommage

Le pattern de nommage des fichiers est configurable via **⚙ Admin** → champ *Filename pattern*. Il détermine comment Living Documentation extrait la date, la catégorie et le titre depuis le nom du fichier.

---

### Tokens reconnus

| Token        | Description                          | Exemple dans le nom de fichier | Valeur parsée       |
|--------------|--------------------------------------|-------------------------------|---------------------|
| `YYYY`       | Année sur 4 chiffres                 | `2024`                        | 2024                |
| `MM`         | Mois sur 2 chiffres (01–12)          | `03`                          | Mars                |
| `DD`         | Jour sur 2 chiffres (01–31)          | `15`                          | 15                  |
| `HH`         | Heure sur 2 chiffres (00–23)         | `14`                          | 14                  |
| `mm`         | Minutes sur 2 chiffres (00–59)       | `30`                          | 30                  |
| `[Category]` | Catégorie entre crochets             | `[Architecture]`              | Architecture        |
| *(reste)*    | Tout le reste forme le titre         | `choix_base_de_donnees`       | Choix Base De Donnees |

---

### Pattern par défaut

```
YYYY_MM_DD_HH_mm_[Category]_title
```

Exemple complet :

```
2024_03_15_14_30_[Architecture]_choix_base_de_donnees.md
```

| Extrait      | Valeur                  |
|--------------|-------------------------|
| Date         | 15 mars 2024, 14:30     |
| Catégorie    | Architecture            |
| Titre        | Choix Base De Donnees   |

---

### Patterns alternatifs valides

L'ordre des tokens est respecté. Exemples :

```
[Category]_YYYY_MM_DD_title
YYYY_MM_DD_[Category]_title
YYYY_MM_DD_HH_mm_[Category]_title    ← par défaut
```

**Contrainte obligatoire** : `[Category]` doit apparaître **exactement une fois**. Un pattern sans `[Category]` ou avec deux occurrences est rejeté (erreur 400).

---

### Stratégies de fallback du parser

Le parser essaie trois stratégies dans l'ordre, de la plus complète à la plus permissive :

1. **Full match** — date + catégorie présents → extrait date, catégorie, titre
2. **Date-only** — date présente, pas de catégorie → catégorie = `General`, titre extrait du reste
3. **Fallback total** — rien ne correspond → titre = nom du fichier, catégorie = `General`, date = null

Les fichiers qui ne suivent pas du tout le pattern sont quand même affichés sous **General**.

---

### Séparateur

Le séparateur entre les tokens est le `_` (underscore). Le titre peut donc lui-même contenir des underscores — tout ce qui est après le dernier token reconnu forme le titre.

---

### Tri des documents

Les documents sont triés par **nom de fichier complet** en ordre alphabétique ascendant (`localeCompare`) au sein de chaque catégorie. Le préfixe de date (`YYYY_MM_DD`) garantit donc un tri chronologique si le pattern est respecté.
