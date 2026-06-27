---
`🗄️ ADR : 2026_04_08_13_15_[NAVIGATION]_anchor_scroll_and_folder_sort_convention.md`
**date:** 2026-04-08
**status:** Accepted
**description:** Génération automatique des IDs de titres après le rendu asynchrone du document pour permettre le défilement par ancre ; introduction d'une convention de préfixe numérique (1_NOM) pour contrôler l'ordre de tri des dossiers dans la barre latérale tout en masquant le préfixe dans l'interface.
**tags:** navigation, ancre, titre, défilement, barre-latérale, dossier, tri, convention, préfixe, frontend, marked, fil-d-ariane
---

## Contexte

Deux lacunes UX indépendantes ont été identifiées :

1. **Navigation par ancre cassée** : `marked` v12 ne génère pas d'attributs `id` sur les titres. Les liens comme `[Voir la section](#consequences)` ou `?doc=...#consequences` échouaient silencieusement, la page se chargeait mais ne défilait jamais jusqu'à la cible, car l'élément de titre n'avait pas d'`id` à cibler.

2. **Ordre de tri des dossiers non contrôlable** : Les dossiers de la barre latérale sont triés alphabétiquement. Les utilisateurs ayant un ordre de lecture spécifique en tête (ex. Tutoriel → Référence → Avancé) n'avaient aucun moyen de l'imposer sans renommer les dossiers avec des noms non sémantiques.

## Décision

### Défilement par ancre

Après injection de `doc.html` dans le DOM, une passe post-rendu parcourt tous les éléments `h1`–`h6` et leur attribue un `id` s'il n'en ont pas :

```js
h.id = h.textContent
  .toLowerCase()
  .replace(/[^\w\s-]/g, "")
  .trim()
  .replace(/\s+/g, "-");
```

Après cette passe, si `window.location.hash` est défini, l'élément correspondant est défilé jusqu'à la vue avec `scrollIntoView({ behavior: "smooth" })`. La réinitialisation `docView.scrollTop = 0` est ignorée lorsqu'un hash est présent.

### Convention de tri des dossiers

Les répertoires peuvent être préfixés d'un nombre suivi d'un tiret bas (`1_TUTORIAL`, `2_REFERENCE`) pour contrôler leur position de tri alphabétique. La fonction utilitaire `folderLabel(seg)` supprime le préfixe pour l'affichage :

```js
function folderLabel(seg) {
  return seg.replace(/^\d+_/, "");
}
```

`folderLabel` est appliquée à deux endroits :

- Le libellé du bouton de dossier dans la barre latérale (`📁 TUTORIAL`)
- Les pastilles violettes du fil d'ariane dans l'en-tête de l'article

Aux deux endroits, le nom brut du segment est conservé dans un attribut `title` afin que le nom complet soit visible au survol. L'ordre de tri lui-même est inchangé, c'est le nom du système de fichiers qui le détermine.

## Conséquences

### AVANTAGES

- Les liens d'ancrage dans les documents fonctionnent désormais de manière fiable, quelle que soit la version de `marked`
- L'algorithme d'ID de titres est déterministe et correspond aux conventions courantes des moteurs de rendu Markdown
- La convention de tri des dossiers est sans configuration, sans interface d'administration, sans état persistant ; le nom du système de fichiers est la source unique de vérité
- Les dossiers existants sans préfixe ne sont pas affectés

### INCONVÉNIENTS

- Les IDs de titres sont générés côté client ; le HTML rendu côté serveur n'a toujours pas d'attributs `id` (acceptable puisque le visualiseur est toujours rendu côté client)
- L'algorithme de slug supprime la ponctuation non-ASCII, ce qui peut produire des collisions pour des titres qui ne diffèrent que par des caractères spéciaux
- La convention de préfixe `1_` est implicite, rien ne l'impose ni ne la documente dans l'outil lui-même au-delà du README