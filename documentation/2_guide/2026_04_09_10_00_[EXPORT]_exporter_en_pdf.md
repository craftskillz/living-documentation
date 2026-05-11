## Exporter un document en PDF

Living Documentation propose deux modes d'export PDF, accessibles sans configuration particulière.

---

### Export du document courant

1. Ouvrez le document à exporter.
2. Cliquez sur le bouton **`📄 PDF`** dans le header de l'article.
3. La boîte de dialogue d'impression du navigateur s'ouvre.
4. Choisissez **Enregistrer en PDF** comme imprimante.

**Ce qui est inclus :**

- Le contenu de l'article (rendu HTML complet)
- Les blocs de code avec coloration syntaxique

**Ce qui est masqué à l'impression :**

- La barre latérale
- Le header de navigation
- Les boutons d'action (Edit, PDF, etc.)

> Le CSS `@media print` est configuré pour produire un rendu propre sans éléments d'interface.

---

### Export de tous les documents (PDF complet)

1. Cliquez sur le bouton **`📄 PDF`** en haut de la **barre latérale** (pas dans l'article).
2. Un PDF complet est généré avec :
   - Une **table des matières** cliquable en début de document
   - Tous les documents dans l'ordre de la sidebar
   - Les **liens inter-documents** restent fonctionnels dans le PDF

---

### Conseils pour un meilleur rendu

- Utilisez **Chrome** ou **Edge** pour la meilleure qualité d'export PDF (le moteur de rendu produit des résultats plus fidèles que Safari ou Firefox)
- Dans la boîte de dialogue d'impression, activez **"Graphiques d'arrière-plan"** pour conserver les couleurs des blocs de code et des badges
- Format recommandé : **A4**, marges normales
