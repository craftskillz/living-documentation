# Édition inline , Snippets

Living Documentation ne t'oblige pas à connaître la syntaxe Markdown par cœur. Un clic droit sur n'importe quel élément éditable ouvre une fenêtre modale avec un formulaire pré-rempli , tu modifies, tu valides, le document est mis à jour instantanément.

---

## Principe

L'édition inline fonctionne sur tous les éléments structurés du document : tableaux, images, citations, blocs de code. Living Documentation détecte l'élément cliqué, extrait les paramètres du Markdown source, remplit le formulaire, puis réécrit le Markdown corrigé après validation.

Aucune page de rechargement. Aucun aller-retour dans un éditeur de texte externe.

---

## Éditer un élément existant

1. Ouvrir un document dans le lecteur.
2. **Clic droit** sur l'élément à modifier (tableau, image, blockquote, bloc de code…).
3. Cliquer sur **Modifier** dans le menu contextuel.
4. Le formulaire s'ouvre avec les valeurs actuelles.
5. Modifier les champs souhaités.
6. Cliquer sur **Appliquer** , le document est sauvegardé et l'affichage se met à jour.

---

## Créer un nouvel élément

Le bouton **+** dans la barre d'outils ouvre la même fenêtre en mode création.

1. Cliquer sur **+** dans la barre de navigation.
2. Choisir le type d'élément dans le menu déroulant.
3. Remplir le formulaire.
4. Valider , le snippet est inséré à la fin du document.

---

## Éléments supportés

<!-- table-style: striped -->

| Élément          | Champs éditables                                         |
| ---------------- | -------------------------------------------------------- |
| **Tableau**      | Style (compact, rayé), couleur, bordure, contenu         |
| **Citation**     | Type (info/success/warning/error), titre, icône, contenu |
| **Image**        | Titre, légende, texte alt, URL                           |
| **Bloc de code** | Langage, contenu                                         |
| **Texte**        | Contenu brut                                             |

---

## Prévisualisation en temps réel

La modale affiche un aperçu du rendu pendant la saisie. Pour un tableau, les changements de style se reflètent immédiatement dans la prévisualisation avant de valider.

**Ce que tu vois dans le formulaire :**

| Champ   | Valeur saisie                                   |
| ------- | ----------------------------------------------- |
| Type    | `warning`                                       |
| Titre   | `Attention à la casse`                          |
| Icône   | ✅ (cochée)                                     |
| Contenu | `Les clés de config sont sensibles à la casse.` |

**Ce que ça génère dans le Markdown :**

```markdown
<!-- quote-type: warning -->
<!-- quote-title: Attention à la casse -->
<!-- quote-icon -->

> Les clés de config sont sensibles à la casse.
```

**Ce que tu vois dans le document :**

<!-- quote-type: warning -->
<!-- quote-title: Attention à la casse -->
<!-- quote-icon -->

> Les clés de config sont sensibles à la casse.

---

## Annuler une modification

Living Documentation ne dispose pas d'un historique Undo dans l'interface. Mais chaque document est un fichier Markdown versionnable , un `git diff` ou `git checkout` suffit :

```bash
# Voir ce qui a changé
git diff documentation/mon-document.md

# Revenir à la version précédente
git checkout HEAD -- documentation/mon-document.md
```

---

## Raccourcis clavier

| Action                   | Raccourci    |
| ------------------------ | ------------ |
| Ouvrir la modale snippet | `Ctrl/⌘ + K` |
| Fermer sans sauvegarder  | `Échap`      |
