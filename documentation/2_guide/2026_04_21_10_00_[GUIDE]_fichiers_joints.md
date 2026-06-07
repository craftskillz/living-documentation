# Fichiers joints

Living Documentation permet d'attacher n'importe quel fichier binaire à un document Markdown , PDF, CSV, ZIP, images séparées… Les fichiers sont stockés à côté du `.md` sur le disque et servis directement par le serveur.

---

## Ajouter un fichier via l'interface

1. Ouvrir un document.
2. Cliquer sur **📎 Joindre un fichier** dans la barre d'outils.
3. Sélectionner le fichier dans l'explorateur (taille max : **19 Mo**).
4. Le fichier est copié dans le dossier du document.
5. Un lien Markdown est inséré automatiquement dans le document.

---

## Ajouter un fichier manuellement

Déposer le fichier dans le même dossier que le `.md`, puis créer le lien à la main.

**Syntaxe :**

```markdown
[Télécharger le rapport Q4 2025](./rapport-q4-2025.pdf)
[Voir les données brutes](./assets/export-2025.csv)
[Télécharger l'archive](./assets/release-v3.8.zip)
```

**Rendu :**

[Télécharger le rapport Q4 2025](./rapport-q4-2025.pdf)

[Voir les données brutes](./assets/export-2025.csv)

[Télécharger l'archive](./assets/release-v3.8.zip)

_(Liens exemples , les fichiers ne sont pas inclus dans ce document.)_

---

## Organisation recommandée

Pour ne pas mélanger fichiers Markdown et fichiers joints, regrouper les pièces jointes dans un sous-dossier `assets/`.

**Syntaxe :**

````markdown
```
documentation/
├── 2_guide/
│   ├── 2026_04_21_[GUIDE]_fichiers-joints.md
│   └── assets/
│       ├── rapport-q4-2025.pdf
│       └── schema-architecture.png
```
````

**Rendu :**

```
documentation/
├── 2_guide/
│   ├── 2026_04_21_[GUIDE]_fichiers-joints.md
│   └── assets/
│       ├── rapport-q4-2025.pdf
│       └── schema-architecture.png
```

Lien dans le document :

```markdown
[Rapport Q4](./assets/rapport-q4-2025.pdf)
```

---

## Formats courants

<!-- table-style: striped -->

| Format          | Usage typique                  | Comportement au clic            |
| --------------- | ------------------------------ | ------------------------------- |
| `.pdf`          | Rapports, specs, contrats      | Ouverture dans l'onglet         |
| `.csv`          | Exports de données, benchmarks | Téléchargement                  |
| `.xlsx`         | Feuilles de calcul             | Téléchargement                  |
| `.zip`          | Archives, livrables            | Téléchargement                  |
| `.png` / `.jpg` | Images séparées                | Ouverture dans l'onglet         |
| `.sql`          | Scripts de migration           | Téléchargement                  |
| `.md`           | Documents liés                 | Téléchargement (pas de preview) |

---

## Taille maximale

<!-- quote-type: info -->
<!-- quote-icon -->

> La limite de **19 Mo** est définie côté serveur. Elle correspond à la limite par défaut d'Express.js pour le body multipart.
>
> Au-delà de 19 Mo, préférer un lien vers un stockage externe (S3, Google Drive, Notion, etc.) plutôt qu'une pièce jointe directe.

---

## Supprimer un fichier joint

1. Supprimer manuellement le fichier du disque.
2. Retirer le lien du document `.md`.

Living Documentation ne maintient pas d'inventaire des pièces jointes , si le fichier disparaît du disque, le lien devient cassé mais aucune erreur côté serveur n't est levée.
