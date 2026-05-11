
## Les ADR : une bonne idée, des limites réelles

Les **Architecture Decision Records**, ces petits documents Markdown versionnés dans le dépôt, au plus près du code, sont une des meilleures pratiques que j'aie adoptées dans ma longue carrière de développeur et elle le reste encore aujourd'hui.
Pas besoin d'outil externe, pas de synchronisation à gérer, l'historique des décisions **vit** avec le code.

Mais certains problèmes subsistent :

- Les **diagrammes** : l'ADR affiche un beau PNG généré depuis un outil visuel (parce que mermaid ca va un moment !!)
Mais le fichier source du diagramme a disparu depuis longtemps ➔ Le PNG ne sera jamais mis à jour ➔ Documentation obsolete ➔ C'est dommage car moi perso je suis un visuel
- L'**ordre** des ADRs : laborieux à maintenir, des dossiers, des sous-dossiers, des conventions *superseded / not superseded*, tout ca tiens mal dans la durée.
- Les **markdowns** : C'est bien mais les outils pour les visualiser sont plutôt limités et pas très pratiques.

---

<h2 style="text-align:center">➠ Vers un meilleur type de partage de connaissance</h2>

[![Living Documentation](./images/living_documentation.png)](?doc=3_concept%252F2026_04_08_22_15_%255BDOCUMENTING%255D_living_documentation)

<h1 style="text-align:center"><code>CLIC sur l'image pour naviguer 😉</code></h1>