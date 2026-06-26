---
`🗄️ ADR : 2026_04_08_10_30_[FRONTEND]_strip_frontmatter_from_article_rendering.md`
**date:** 2026-04-08
**status:** Accepted
**description:** Supprime le bloc frontmatter d'en-tête (---...---) du contenu markdown avant le rendu HTML, afin que les champs de métadonnées ne soient pas visibles dans la vue article.
**tags:** frontend, frontmatter, rendu, marked, documents, métadonnées, adr
---

## Contexte

Les ADR (et potentiellement tout fichier markdown) peuvent contenir un bloc frontmatter délimité par `---` en haut du fichier, contenant des champs de métadonnées tels que `description`, `tags`, `date` et `status`. Ces champs sont destinés à l'outillage (chargement de contexte, détection de supersession) et non à la lecture humaine dans la vue article.

Lorsque `marked.parse(content)` était appelé directement sur le contenu brut du fichier, le bloc frontmatter était rendu comme du markdown visible, produisant une ligne horizontale, des lignes clé/valeur en gras et une autre ligne horizontale en haut de chaque article, encombrant l'expérience de lecture.

## Décision

Ajout d'un helper `stripFrontmatter(content: string): string` dans `src/routes/documents.ts` qui supprime le bloc `---…---` d'en-tête avant de passer le contenu à `marked.parse()` :

```ts
function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return content;
  return content.slice(end + 4).replace(/^\n/, "");
}
```

La fonction est appliquée uniquement au champ `html` retourné par l'API. Le champ brut `content` est laissé intact, de sorte que la zone de texte d'édition affiche toujours le frontmatter complet et que le fichier sur disque n'est jamais modifié.

## Conséquences

### AVANTAGES

- Les métadonnées frontmatter sont invisibles dans la vue article rendue, aucun encombrement visuel.
- Le mode édition affiche toujours le contenu brut complet incluant le frontmatter, qui reste donc éditable.
- Le correctif est appliqué à un seul endroit (`documents.ts`) et couvre à la fois les documents ordinaires et les fichiers supplémentaires.
- Les fichiers sans frontmatter ne sont pas affectés (garde `startsWith("---")`).

### INCONVÉNIENTS

- Le frontmatter est une convention : tout fichier commençant par `---` suivi d'un `---` de fermeture verra ce bloc supprimé, même s'il s'agissait d'un contenu intentionnel. C'est un compromis acceptable pour un outil de documentation local.