---
type: Document
title: Tableaux
---

# Tableaux

Les tableaux Markdown standard sont rendus avec un style propre et lisible. Living Documentation les enrichit via des commentaires HTML préfixes qui contrôlent l'espacement, les alternances de couleur, les bordures et le thème coloré , sans modifier la syntaxe du tableau lui-même.

---

## Tableau par défaut

Le style par défaut, sans aucun attribut. Propre, spacieux, adapté aux données éditoriales.

**Syntaxe :**

```markdown
| Composant | Rôle                      | Technologie         |
| --------- | ------------------------- | ------------------- |
| Serveur   | API REST + rendu Markdown | Node.js / Express   |
| Frontend  | UI réactive               | Svelte 5            |
| Stockage  | Fichiers Markdown         | Système de fichiers |
```

**Rendu :**

| Composant | Rôle                      | Technologie         |
| --------- | ------------------------- | ------------------- |
| Serveur   | API REST + rendu Markdown | Node.js / Express   |
| Frontend  | UI réactive               | Svelte 5            |
| Stockage  | Fichiers Markdown         | Système de fichiers |

---

## Compact

Réduit l'espacement vertical des cellules. Idéal pour les tableaux denses avec beaucoup de lignes.

**Syntaxe :**

```markdown
<!-- table-style: compact -->

| Env     | Port | Debug |
| ------- | ---- | ----- |
| dev     | 4321 | ✅    |
| staging | 8080 | ❌    |
| prod    | 443  | ❌    |
```

**Rendu :**

<!-- table-style: compact -->

| Env     | Port | Debug |
| ------- | ---- | ----- |
| dev     | 4321 | ✅    |
| staging | 8080 | ❌    |
| prod    | 443  | ❌    |

---

## Rayé (striped)

Alterne l'arrière-plan des lignes paires/impaires. Améliore la lisibilité des tableaux longs.

**Syntaxe :**

```markdown
<!-- table-style: striped -->

| Méthode  | Endpoint        | Description              |
| -------- | --------------- | ------------------------ |
| `GET`    | `/api/docs`     | Liste tous les documents |
| `GET`    | `/api/docs/:id` | Récupère un document     |
| `PUT`    | `/api/docs/:id` | Met à jour un document   |
| `DELETE` | `/api/docs/:id` | Supprime un document     |
| `POST`   | `/api/docs`     | Crée un document         |
```

**Rendu :**

<!-- table-style: striped -->

| Méthode  | Endpoint        | Description              |
| -------- | --------------- | ------------------------ |
| `GET`    | `/api/docs`     | Liste tous les documents |
| `GET`    | `/api/docs/:id` | Récupère un document     |
| `PUT`    | `/api/docs/:id` | Met à jour un document   |
| `DELETE` | `/api/docs/:id` | Supprime un document     |
| `POST`   | `/api/docs`     | Crée un document         |

---

## Couleur , Info

Teinte bleue. Pour les tableaux de référence, paramètres, configuration.

**Syntaxe :**

```markdown
<!-- table-color: info -->

| Paramètre    | Type     | Défaut   | Description                   |
| ------------ | -------- | -------- | ----------------------------- |
| `port`       | `number` | `4321`   | Port d'écoute du serveur      |
| `docsFolder` | `string` | `./docs` | Dossier des fichiers Markdown |
| `sourceRoot` | `string` | `..`     | Racine du code source         |
```

**Rendu :**

<!-- table-color: info -->

| Paramètre    | Type     | Défaut   | Description                   |
| ------------ | -------- | -------- | ----------------------------- |
| `port`       | `number` | `4321`   | Port d'écoute du serveur      |
| `docsFolder` | `string` | `./docs` | Dossier des fichiers Markdown |
| `sourceRoot` | `string` | `..`     | Racine du code source         |

---

## Couleur , Succès + rayures

Les attributs se cumulent. Ici : fond vert + alternance de lignes.

**Syntaxe :**

```markdown
<!-- table-style: striped -->
<!-- table-color: success -->

| Feature               | Disponible | Depuis |
| --------------------- | ---------- | ------ |
| Recherche plein-texte | ✅         | v1.0   |
| Édition inline        | ✅         | v2.1   |
| Table des matières    | ✅         | v3.4   |
| Callouts colorés      | ✅         | v3.8   |
| Mode hors-ligne       | 🔜         | ,      |
```

**Rendu :**

<!-- table-style: striped -->
<!-- table-color: success -->

| Feature               | Disponible | Depuis |
| --------------------- | ---------- | ------ |
| Recherche plein-texte | ✅         | v1.0   |
| Édition inline        | ✅         | v2.1   |
| Table des matières    | ✅         | v3.4   |
| Callouts colorés      | ✅         | v3.8   |
| Mode hors-ligne       | 🔜         | ,      |

---

## Couleur , Warning + bordures

Teinte ambre + grille de bordures. Pour les limites, contraintes, points d'attention.

**Syntaxe :**

```markdown
<!-- table-border: bordered -->
<!-- table-color: warning -->

| ⚠️ Limite                    | Valeur                    |
| ---------------------------- | ------------------------- |
| Taille max fichier joint     | 19 Mo                     |
| Documents indexés en mémoire | Illimité (RAM disponible) |
| Longueur max d'un titre      | ~255 caractères           |
```

**Rendu :**

<!-- table-border: bordered -->
<!-- table-color: warning -->

| ⚠️ Limite                    | Valeur                    |
| ---------------------------- | ------------------------- |
| Taille max fichier joint     | 19 Mo                     |
| Documents indexés en mémoire | Illimité (RAM disponible) |
| Longueur max d'un titre      | ~255 caractères           |

---

## Couleur , Danger

Teinte rouge. Pour les erreurs à éviter, les actions irréversibles.

**Syntaxe :**

```markdown
<!-- table-color: danger -->

| ❌ À ne pas faire                      | Pourquoi                                |
| -------------------------------------- | --------------------------------------- |
| Stocker des secrets dans les docs      | Les fichiers `.md` ne sont pas chiffrés |
| Supprimer `.living-doc.json` à la main | Perte de la configuration               |
| Renommer `docs/` sans reconfigurer     | Le serveur ne trouve plus les fichiers  |
```

**Rendu :**

<!-- table-color: danger -->

| ❌ À ne pas faire                      | Pourquoi                                |
| -------------------------------------- | --------------------------------------- |
| Stocker des secrets dans les docs      | Les fichiers `.md` ne sont pas chiffrés |
| Supprimer `.living-doc.json` à la main | Perte de la configuration               |
| Renommer `docs/` sans reconfigurer     | Le serveur ne trouve plus les fichiers  |

---

## Récapitulatif des attributs

| Commentaire                | Valeurs possibles                         |
| -------------------------- | ----------------------------------------- |
| `<!-- table-style: X -->`  | `compact` · `striped`                     |
| `<!-- table-color: X -->`  | `info` · `success` · `warning` · `danger` |
| `<!-- table-border: X -->` | `bordered`                                |
