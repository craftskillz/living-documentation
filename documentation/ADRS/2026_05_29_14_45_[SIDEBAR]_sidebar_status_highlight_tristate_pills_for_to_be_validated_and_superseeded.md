---
**date:** 2026-05-29
**status:** To be validated
**description:** Une icône certificat dans la barre latérale fait défiler un tri-état (off → V → V+S) qui peint des pastilles de cycle de vie par document dans l'arbre — « V » verte pour `To be validated`, « S » orange pour `SuperSeeded` — alimentées par un endpoint dédié `GET /api/documents/statuses`.
**tags:** sidebar, frontmatter-status, tri-state-toggle, cycleHighlightStatus, statusPill, /api/documents/statuses, parseDocStatus, localStorage, fa-certificate, To-be-validated, SuperSeeded
---

# Pastilles tri-état de mise en évidence des statuts dans la barre latérale

## Contexte

La barre latérale expose déjà des signaux par document via de petites pastilles (annotations, pièces jointes). Le cycle de vie d'un document, lui, n'était visible qu'après ouverture (le bouton « Valider » du viewer lit le `status` d u
frontmatter). Un relecteur souhaitant repérer d'un coup d'œil *quels* documents restent à valider, ou lesquels sont obsolètes, n'avait aucune vue d'ensemble sur l'arbre.

Les valeurs canoniques de cycle de vie vivent dans la ligne `status` du
frontmatter : un document est `To be validated` à la création et peut devenir
`SuperSeeded` lorsqu'il est remplacé. Un document ne porte qu'un seul `status`,
donc au plus une pastille de cycle de vie s'applique par document.

## Décision

Ajouter une **icône certificat** cliquable (`fa-certificate`) dans la barre
d'outils de la barre latérale, positionnée juste avant le bouton des pièces
jointes. Elle fait défiler un **tri-état** de mise en évidence des statuts,
persisté dans `localStorage` sous la clé `ld-highlight-status` :

| État | Couleur de l'icône | Pastilles affichées |
|------|--------------------|---------------------|
| 0 | gris | aucune |
| 1 | vert | **V** verte sur les documents `To be validated` |
| 2 | orange | **V** verte + **S** orange sur les documents `SuperSeeded` |

La couleur de l'icône reflète l'état actif (gris → vert → orange), illustrant la
dernière famille de pastilles activée. La correspondance de statut est
insensible à la casse et **exacte** : seule la valeur canonique `SuperSeeded`
(voir `SUPERSEEDED_STATUS` dans `src/lib/status.ts`) reçoit la pastille S — les
variantes non canoniques comme `SuperSeeded by …` ou `Partially SuperSeeded …`
ne sont volontairement pas mises en évidence.

### Chemin des données

L'endpoint de liste des documents reste léger (uniquement les métadonnées
dérivées du nom de fichier). Le `status` par document est exposé par un endpoint
**séparé** `GET /api/documents/statuses` → `{ [docId]: status }`, sur le modèle
de la convention existante `/file-counts`. Il est récupéré en parallèle au
démarrage, aux côtés des compteurs d'annotations et de pièces jointes, dans le
global `docStatuses`. La route lit le frontmatter de chaque document via le
helper partagé `parseDocStatus`, conservant une source de vérité unique pour le
parsing du statut entre les routes HTTP, les outils MCP et le flux de validation
du viewer.

### Rendu

`statusPill(doc)` renvoie le markup de pastille approprié (ou une chaîne vide)
selon `highlightStatusState` et `docStatuses[doc.id]`, et est injecté dans la
rangée de badges existante de `renderDocItem`. `cycleHighlightStatus()` fait
avancer l'état modulo 3, le persiste, repeint le bouton via
`applyHighlightStatusButtonState()` et re-rend la barre latérale. L'état du
bouton est aussi appliqué une fois au démarrage afin que la couleur persistée
survive aux rechargements.

Les libellés des pastilles sont internationalisés
(`sidebar.status_to_validate`, `sidebar.status_superseeded`) et l'infobulle du
toggle utilise `nav.toggle_status_highlight`.

## Conséquences

- Les relecteurs peuvent repérer le statut de validation/obsolescence sur tout
  l'arbre sans ouvrir les documents.
- L'endpoint supplémentaire lit chaque fichier de document à chaque appel (comme
  `/file-counts`) ; acceptable pour des jeux de documentation typiques.
- La correspondance exacte sur `SuperSeeded` évite les faux positifs mais
  implique que les formulations partielles/legacy d'obsolescence n'affichent
  aucune pastille ; à reconsidérer si ces variantes doivent être couvertes.

## Liens connexes

- [Bouton « Valider » du viewer pour le basculement du statut frontmatter](?doc=ADRS%252F2026_05_14_12_07_%255BFRONTEND%255D_validate_button_on_viewer_for_frontmatter_status_flip) — basculement `To be validated` → `Accepted` côté viewer.
- [Métadonnées en lecture seule pour les documents SuperSeeded](?doc=ADRS%252F2026_05_14_12_29_%255BMETADATA%255D_read_only_metadata_for_superseeded_documents) — le garde `SUPERSEEDED_STATUS` réutilisé ici.
