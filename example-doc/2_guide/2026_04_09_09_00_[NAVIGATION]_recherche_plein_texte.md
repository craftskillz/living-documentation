## Recherche plein texte

Living Documentation propose deux niveaux de recherche accessibles depuis le champ en haut de la barre latérale.

---

### Filtre instantané (client-side)

Dès que vous tapez dans le champ de recherche, la liste des documents est filtrée **en temps réel** sur le titre et la catégorie.

- Aucun délai, aucun rechargement
- Utile pour retrouver rapidement un document dont vous connaissez le nom

---

### Recherche plein texte (server-side)

Après **350 ms** sans frappe, une recherche côté serveur est déclenchée automatiquement. Elle parcourt le contenu complet de tous les fichiers `.md`.

**Résultats :**

- Chaque fichier correspondant est listé
- Pour chaque fichier, **toutes les occurrences** sont affichées avec leur contexte
- Les occurrences sont **surlignées** dans la liste
- Cliquer sur une occurrence ouvre le document **et défile jusqu'à la section concernée**

---

### Cas d'usage

| Vous cherchez…                          | Approche recommandée          |
|-----------------------------------------|-------------------------------|
| Un document dont vous connaissez le nom | Filtre instantané (taper le titre) |
| Un concept mentionné dans n'importe quel doc | Recherche plein texte (attendre 350 ms) |
| Toutes les occurrences d'un terme       | Recherche plein texte         |

---

### Deep links

Chaque document possède une **URL stable** de la forme :

```
http://localhost:4321/?doc=<id_encodé>
```

Vous pouvez **copier cette URL** depuis la barre d'adresse du navigateur et la partager, la mettre en favori, ou l'utiliser dans un lien Markdown inter-documents :

```markdown
[Voir la référence API](?doc=4_reference%252F2026_04_09_02_00_%255BREFERENCE%255D_tokens_pattern_nommage)
```

> L'ID est stable tant que le nom du fichier ne change pas. Renommer un fichier invalide les liens existants.

---

### Navigation par ancres

Les titres `##`, `###`, etc. génèrent automatiquement des **ancres navigables**. Vous pouvez créer un lien vers une section précise :

```markdown
[Voir la section Résultats](#résultats)
```

Le scroll est déclenché après le rendu asynchrone du document — le lien fonctionne même si la page vient d'être ouverte.
