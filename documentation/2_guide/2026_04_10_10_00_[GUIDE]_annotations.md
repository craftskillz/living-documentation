# Annotations

Le mode annotation permet d'ajouter des surlignages et des commentaires visuels directement sur un document affiché, sans toucher au fichier Markdown source. Pratique pour les revues, les retours d'équipe, ou la formation , le document reste intact.

---

## Activer le mode annotation

1. Ouvrir un document dans le lecteur.
2. Cliquer sur l'icône **✏️ Annoter** dans la barre d'outils.
3. Le curseur change d'apparence , le document est maintenant annotable.
4. **Sélectionner du texte** avec la souris pour faire apparaître le menu d'annotation.

---

## Créer une annotation

1. Sélectionner un passage de texte avec la souris.
2. Dans le menu contextuel qui apparaît, choisir :
   - Une **couleur de surbrillance** (jaune, vert, rouge)
   - Ou l'option **Commentaire** pour ajouter une note textuelle
3. L'annotation est enregistrée dans `localStorage` du navigateur.

**Ce que ça ressemble :**

Un texte sans annotation ressemble à ceci. Avec une annotation jaune, <mark>le passage sélectionné est mis en évidence comme ça</mark>. Le commentaire associé apparaît au survol.

---

## Types d'annotations

| Couleur        | Usage recommandé                    |
| -------------- | ----------------------------------- |
| 🟡 Jaune       | Point d'attention général, à relire |
| 🟢 Vert        | Contenu validé, approuvé            |
| 🔴 Rouge       | Contenu à corriger, inexact         |
| 💬 Commentaire | Note explicative ou question        |

---

## Voir les annotations existantes

Au chargement d'un document, si des annotations existent dans le navigateur courant, les passages sont automatiquement mis en évidence. Survoler un passage annoté affiche le commentaire associé sous forme de bulle.

---

## Supprimer une annotation

- **Une seule annotation** : cliquer sur le texte surligné → bouton **🗑️ Supprimer** dans le menu contextuel.
- **Toutes les annotations du document** : bouton **Effacer tout** dans la barre d'outils (visible quand le mode annotation est actif).

---

## Limites à connaître

<!-- quote-type: warning -->
<!-- quote-title: Stockage local uniquement -->
<!-- quote-icon -->

> Les annotations sont stockées dans `localStorage` du navigateur. Elles **ne se synchronisent pas** entre utilisateurs, ni entre navigateurs, ni entre appareils.
>
> Vider le cache du navigateur supprime toutes les annotations.

Pour des retours destinés à être partagés ou conservés, préférer l'édition directe du document Markdown, ou l'ajout de callouts colorés dans le contenu.

---

## Alternative persistante , les callouts

Si tu veux laisser une note visible de tous dans le document, un callout est plus adapté qu'une annotation :

**Syntaxe :**

```markdown
<!-- quote-type: warning -->
<!-- quote-title: À revoir -->
<!-- quote-icon -->

> Ce paragraphe décrit l'ancienne architecture. Mettre à jour après la migration v4.
```

**Rendu :**

<!-- quote-type: warning -->
<!-- quote-title: À revoir -->
<!-- quote-icon -->

> Ce paragraphe décrit l'ancienne architecture. Mettre à jour après la migration v4.
