---
**date:** 2026-05-05
**status:** To be validated
**description:** Affichage live de la taille de police entre les boutons Aa−/Aa+ du node panel, avec un fallback "–" quand la sélection mélange plusieurs tailles ou n'a aucun nœud non-anchor sélectionné.
**tags:** diagram, node-panel, font-size, fontSize, property-bar, nodeFontSizeValue, syncNodeFontSizeValue, mixed-selection
---

# Affichage de la taille de police dans la barre de propriétés des nœuds

## Contexte

Le node panel exposait deux boutons `Aa−` (`btnNodeFontDecrease`) et `Aa+` (`btnNodeFontIncrease`) qui appelaient `changeNodeFontSize(±1)` sur tous les nœuds sélectionnés. Aucune indication de la **valeur courante** : l'utilisateur devait deviner la taille à l'œil, ou ouvrir l'inspecteur pour lire `fontSize`. Sur une sélection multiple aux tailles disparates, le couple `Aa−`/`Aa+` agissait de façon ambiguë (incrément relatif sans repère partagé).

## Décision

### 1. Élément `#nodeFontSizeValue` entre les deux boutons

[src/frontend/diagram.html](src/frontend/diagram.html) — un `<span id="nodeFontSizeValue">` est ajouté entre `btnNodeFontDecrease` et `btnNodeFontIncrease`. Style minimal : monospace, encadré, 11px, largeur min ~2.25rem pour ne pas trembler quand la valeur passe de `9` à `99`. Attribut `data-i18n-title` pour le tooltip.

### 2. `syncNodeFontSizeValue()` dans node-panel.js

[src/frontend/diagram/node-panel.js](src/frontend/diagram/node-panel.js) — la fonction lit `n.fontSize || 13` pour chaque nœud sélectionné non-anchor, puis :

- **Aucun nœud non-anchor sélectionné** → affiche `–`.
- **Tous à la même taille** → affiche la valeur (ex. `13`).
- **Tailles disparates** → affiche `–` (signal que la sélection est hétérogène et que `Aa−`/`Aa+` va décaler chaque taille de ±1).

Appelée à deux endroits :

- `showNodePanel()` — à chaque ouverture du panel, pour refléter l'état courant.
- `changeNodeFontSize(delta)` — après chaque clic sur `Aa−`/`Aa+`, pour mettre à jour l'affichage immédiatement (avant `forceRedraw()`).

### 3. Fallback `13` quand `fontSize` est absent

`n.fontSize || 13` reproduit le defaut implicite déjà appliqué côté rendu. Cohérent avec ce que l'utilisateur voit, même sur des nœuds créés avant l'introduction du champ `fontSize` dans le DataSet.

## Conséquences

### PROS

- L'utilisateur a un **repère numérique** pour ses ajustements de typographie. Plus besoin de tâtonner.
- Le glyphe `–` sur une sélection mixte signale clairement qu'on agit sur des valeurs différentes — l'utilisateur peut alors uniformiser via une autre action s'il le souhaite.
- Coût d'implémentation minimal (+25 lignes) ; pas d'impact sur la persistance ni sur le rendu.

### CONS

- Pas d'**édition directe** : l'élément reste un span en lecture seule. Pour saisir une taille précise, il faut cumuler des clics. Acceptable pour la première itération ; un champ éditable pourra venir plus tard.
- L'élément n'est pas synchronisé après un undo/redo qui modifierait `fontSize` à distance — il l'est seulement à l'ouverture du panel et après un clic sur `Aa−`/`Aa+`. À ajouter si une plainte utilisateur émerge.
