---
`🗄️ ADR : 2026_04_10_[ANNOTATION]_marker_highlight_with_anchor_spans_and_dom_traversal.md`
**date:** 2026-04-10
**status:** Pending Validation
**description:** Add a Marker (Stabilo) annotation feature with persistent post-its; highlight text using two single-char anchor spans placed via innerHTML regex, then wrap intermediate text nodes in <mark> elements via DOM TreeWalker — avoiding all block-boundary HTML validity issues.
**tags:** annotation, marker, highlight, stabilo, post-it, elevator, innerHTML, dom, treewalker, range, text-node, block-boundary, anchor-span, regex, persistence, api, json
---

## Context

La feature Marker permet de surligner du texte dans un document Markdown rendu et d'y associer une note (post-it). Les annotations sont persistées dans `.annotations.json` dans le dossier docs.

Les difficultés techniques du surlignage HTML :
- Une sélection utilisateur peut traverser plusieurs éléments de bloc (`<p>`, `<h2>`, etc.)
- Insérer un `<mark>` qui englobe du contenu cross-bloc produit du HTML invalide
- Le parser HTML du navigateur corrige le HTML invalide de manière imprévisible (un `<mark>` ouvert avant un `<p>` finit par englober tout le contenu jusqu'à la fin du `</div>`)
- Les approches précédentes tentées — split de text nodes, offsets synthétiques aux frontières de bloc, `<mark>` split par regex — ont toutes échoué sur des cas de sélection cross-paragraphe ou cross-élément inline

## Decision

**Architecture en deux étapes séparées :**

### Étape 1 — Ancres par innerHTML (regex)

Une regex construite dynamiquement (`d` flag pour les indices) cherche le texte sélectionné dans `contentEl.innerHTML` en autorisant des tags HTML entre les caractères adjacents (`(?:<[^>]*>)*`) et entre les mots (`(?:\s*(?:<[^>]*>\s*)*)`).

On entoure uniquement le **premier caractère** et le **dernier caractère** de la sélection dans un `<span id="${ann.id}-s">` et un `<span id="${ann.id}-e">`. Un seul caractère ne peut jamais traverser une frontière de bloc → HTML toujours valide.

Ces spans servent d'ancres pour : le scroll de l'elevator, le popup de lecture, et le point de départ de l'étape 2.

### Étape 2 — Surlignage par DOM TreeWalker

Après que toutes les ancres de toutes les annotations sont placées (plus aucun `innerHTML =` ne sera effectué), on crée un `document.createRange()` de `afterEnd(span#s)` à `beforeStart(span#e)` et on collecte tous les text nodes qui intersectent ce range via un `TreeWalker`.

Chaque text node est wrappé individuellement dans un `<mark data-annotation-id>`. Un text node est toujours une feuille du DOM, toujours contenu dans son élément parent — jamais cross-bloc. L'HTML produit est toujours valide.

### Backend

- `POST /api/annotations/:docId` — crée une annotation avec `id`, `selectedText`, `contextBefore`, `contextAfter`, `note`, `createdAt`
- `GET /api/annotations/:docId` — liste les annotations
- `DELETE /api/annotations/:docId/:id` — supprime une annotation
- Persisté dans `.annotations.json` dans `docsPath`

### Frontend

- Bouton Marker 3 états : normal / actif (jaune) / masqué (croix)
- Popup de saisie de note après sélection
- Elevator (panel droit fixe) : pills carrées empilées, scroll smooth vers l'ancre au hover, popup de lecture après fin de scroll
- Event delegation sur `[data-annotation-id]` sur `#doc-content` — survit aux `innerHTML =`
- Contexte (30 chars avant/après) pour la désambiguïsation lors du re-surlignage

## Consequences

### PROS

- HTML toujours valide quelle que soit la sélection (intra-paragraphe, cross-paragraphe, cross-inline)
- Les deux étapes sont clairement séparées : positionnement (innerHTML) vs rendu (DOM)
- L'event delegation sur le conteneur parent survit à tous les remplacements innerHTML
- Les ancres `id` permettent un scroll précis et une identification robuste sans chercher dans le DOM
- La regex avec le flag `d` donne les indices exacts du groupe capturé, sans ambiguïté même avec du contexte

### CONS

- La regex construite dynamiquement peut être lente sur des textes très longs (> 10 000 chars) — acceptable pour un outil local
- `range.intersectsNode()` sur un TreeWalker peut inclure des text nodes partiellement dans le range aux extrémités — en pratique non problématique car les ancres sont des spans sur un seul char, séparant proprement les text nodes
- Les annotations sont liées au contenu textuel (via contexte) : renommer un passage annoté rend l'annotation orpheline
