# Table des matières

Living Documentation génère automatiquement une table des matières flottante pour chaque document à partir de ses titres `##` et `###`. Elle reste visible pendant le défilement et surligne la section en cours de lecture.

Aucune syntaxe à ajouter. La table des matières se construit seule dès qu'un document contient au moins deux sections.

---

## Fonctionnement

La table des matières est construite côté client à partir des balises `<h2>` et `<h3>` du document rendu. Elle s'affiche dans un panneau latéral droit fixé à l'écran.

Un **observateur d'intersection** détecte quelle section est visible et met en évidence l'entrée correspondante dans la table. Cliquer sur une entrée fait défiler la page jusqu'à la section.

---

## Structure recommandée

Pour obtenir une table des matières utile, le document doit suivre une hiérarchie claire.

**Syntaxe :**

```markdown
# Titre principal

## Contexte

### Pourquoi ce choix ?

### Alternatives considérées

## Mise en œuvre

### Étape 1 , Installation

### Étape 2 , Configuration

## Conclusion
```

**Ce que ça produit dans la table des matières :**

```
Contexte
  └─ Pourquoi ce choix ?
  └─ Alternatives considérées
Mise en œuvre
  └─ Étape 1 , Installation
  └─ Étape 2 , Configuration
Conclusion
```

Le `#` du titre principal n'est **pas** inclus dans la table des matières , il est déjà visible en haut de la page.

---

## Profondeur indexée

Seuls les niveaux `##` (H2) et `###` (H3) apparaissent dans la table. Les `####` et plus profonds ne sont pas indexés, pour garder la navigation lisible.

**Syntaxe :**

```markdown
## Section principale ← ✅ dans la ToC

### Sous-section ← ✅ dans la ToC

#### Détail ← ❌ pas dans la ToC

##### Sous-détail ← ❌ pas dans la ToC
```

---

## Ancres directes

Chaque titre génère une ancre HTML dérivée de son texte. On peut créer un lien direct vers une section depuis un autre document.

**Syntaxe :**

```markdown
[Voir la section Mise en œuvre](doc-link:mon-document#mise-en-uvre)
```

La règle de génération : minuscules, espaces → tirets, caractères accentués et spéciaux supprimés.

| Titre                        | Ancre générée            |
| ---------------------------- | ------------------------ |
| `## Mise en œuvre`           | `#mise-en-uvre`          |
| `## Étape 1 , Configuration` | `#tape-1--configuration` |
| `## Bonjour Monde !`         | `#bonjour-monde-`        |

---

## Titres à éviter

<!-- table-color: warning -->

| ❌ Problème                           | ✅ Solution                      |
| ------------------------------------- | -------------------------------- |
| Deux sections avec le même titre      | Titres distincts et descriptifs  |
| Titres très courts (`## A`)           | Titres explicites et lisibles    |
| Sauter des niveaux (`#` → `####`)     | Hiérarchie continue `##` → `###` |
| Mettre du code inline dans les titres | Texte brut dans les titres       |
