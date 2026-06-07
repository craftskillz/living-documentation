---
**date:** 2026-05-12
**status:** To be validated
**description:** Un bouton de la topbar `diagram.html` déclenche l'export du diagramme courant en mxGraph XML drawio via `src/frontend/diagram/drawio-export.js`, qui sérialise nœuds (tous shape types y compris custom-shape via image base64 inline), edges (ports normalisés en exitX/Y et entryX/Y, free arrows en sourcePoint/targetPoint), groupes (container style=group avec reparenting), métadonnées sémantiques (UserObject ld_*) et déclenche le téléchargement d'un fichier `<titre>.drawio` autonome.
**tags:** diagram, export, drawio, mxgraph, mxfile, mxcell, mxgeometry, ports, exitX, entryX, free-arrows, sourcePoint, custom-shape, groups, UserObject, label-rotation, base64-inline, frontend
---

# Export des diagrammes au format drawio (mxGraph XML)

## Contexte

L'éditeur de diagrammes du projet stocke un modèle JSON propriétaire (cf. `src/frontend/diagram/persistence.js` `saveDiagram`) avec un vocabulaire riche : 10 shape types natifs (`box`, `ellipse`, `circle`, `database`, `actor`, `post-it`, `text-free`, `image`, `custom-shape`, `anchor`), formes custom à image et anchors normalisés arbitraires, 8 ports cardinaux par défaut (N/NE/E/SE/S/SW/W/NW) avec géométrie spécifique par shape (`PORT_OFFSETS_RECT/CIRC/DATABASE`), edges port-anchored avec bezier à points de contrôle calculés depuis les normales des ports, free arrows entre deux nœuds invisibles `shapeType: 'anchor'`, groupes via tag `groupId`, métadonnées sémantiques non-visuelles (`description`, `evidence`, `kind`, `renderAs`, `nodeLink`), couleurs par `colorKey` (15 slots + overrides config), rotation/labelRotation séparées en radians, edge labels avec wrap (`edgeLabelWidth`) et rotation indépendante.

Besoin utilisateur : pouvoir ouvrir un diagramme dans drawio.com ou drawio desktop pour le partager, l'imprimer, ou l'éditer hors de l'écosystème projet. Pas de roundtrip prévu (export one-way).

Le format drawio est l'XML mxGraph, structure stable depuis ~2005 sans breaking change, monotone en ajouts. Roundtrip drawio.com / desktop / VS Code extension reproductible. Reconnu universellement avec extension `.drawio`.

## Décision

Ajouter un export one-way diagramme → fichier `.drawio` via un bouton dans la topbar de `diagram.html`, déclenchant le téléchargement d'un XML mxfile self-contained (images inlines en base64).

### Module dédié

Tout vit dans `src/frontend/diagram/drawio-export.js`, fonction publique async `exportCurrentDiagramAsDrawio()` :

1. Snapshot du diagramme courant depuis `st.network.getPositions()` + `st.nodes.get()` (même forme que `saveDiagram` mais sans persister).
2. Collecte des URLs d'images uniques (`n.imageSrc` + `customShapeDef.imageSrc`), fetch chacune, conversion en data URI via `FileReader.readAsDataURL`, construction d'une `Map<url, dataUri>`.
3. Génération XML pur via concaténation de strings, escaping XML systématique des attributs (`xmlAttr`).
4. Déclenchement du téléchargement via Blob + `<a download="<titre-sanitised>.drawio">`.

### Mapping nœuds

| Shape projet        | Style drawio                                                          |
| ------------------- | --------------------------------------------------------------------- |
| `box`               | `rounded=0;whiteSpace=wrap;html=1;` + fill/stroke/font                |
| `ellipse`, `circle` | `ellipse;...` (circle force H=W)                                      |
| `database`          | `shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=15`            |
| `actor`             | `shape=actor`                                                         |
| `post-it`           | `shape=note;size=12`                                                  |
| `text-free`         | `text;html=1;strokeColor=none;fillColor=none` (fontColor préservé)    |
| `image`             | `shape=image;imageAspect=0;image=<dataUri ou URL>`                    |
| `custom-shape`      | idem image + labelPlacement explicite (center/below/above/left/right) |
| `anchor`            | DROPPÉ (pseudo-node, voir free arrows)                                |

Couleurs : `NODE_COLORS[colorKey]` → `fillColor`/`strokeColor`/`fontColor` (les overrides config `st.nodeColorOverrides` ne sont pas appliqués car ils visent le rendu local ; le `colorKey` reste la vérité partagée).

Autres propriétés :

- Coordonnées : traduction centre `(x, y)` → coin haut-gauche `(x − W/2, y − H/2)`. Dimensions depuis `nodeWidth/nodeHeight` ou `SHAPE_DEFAULTS`.
- `rotation` (radians) → `rotation=<deg>` (helper `radToDeg`).
- `bgOpacity` (0..1) → `opacity=<0..100>`.
- `fontSize`, `textAlign`, `textValign` → `fontSize`, `align`, `verticalAlign`.
- `locked` → `editable=0;movable=0;resizable=0;rotatable=0;deletable=0`.

### Mapping edges

Style commun : `edgeStyle=none;rounded=0;html=1;jettySize=auto;orthogonalLoop=1`, plus `curved=1` si `edgesStraight === false`.

- `arrowDir` ∈ `{to, from, both, none}` → combinaisons `startArrow`/`endArrow=classic|none`.
- `dashes` → `dashed=1`.
- `edgeColor`, `edgeWidth`, `fontSize`, `edgeLocked` → directs.
- Ports : `fromPort` / `toPort` convertis en `exitX/exitY` + `entryX/entryY` via les tables `RECT_PORT_EXIT` (rectangulaire , N=(0.5,0), NE=(1,0)…), `CIRC_PORT_EXIT` (ellipse/circle , N=(0.5,0), NE=(0.5+SQRT2_INV/2, 0.5−SQRT2_INV/2)…), `DATABASE_PORT_EXIT` (cylindre , NE=(1, 0.12)…), ou anchors normalisés `{x, y}` pour les custom shapes. `exitPerimeter=0;entryPerimeter=0` garantit que drawio respecte exactement les positions calculées sans recourir au périmètre standard.
- Free arrows (edge entre deux nœuds `shapeType === 'anchor'`) : edge sans `source`/`target`, géométrie avec `<mxPoint as="sourcePoint">` et `<mxPoint as="targetPoint">` aux positions des anchors. Les nœuds anchor eux-mêmes sont droppés de l'export.

Edge labels : par défaut, `value=` sur l'edge. Si `edgeLabelWidth` (wrap) ou `edgeLabelOffsetX/Y` ou `labelRotation` non nul, génération d'un child `<mxCell vertex="1" connectable="0">` avec style `edgeLabel;html=1;rotation=<deg>` et géométrie `<mxGeometry x="0" y="0" relative="1"><mxPoint as="offset">` + `<mxRectangle as="alternateBounds">` pour la largeur de wrap.

### Mapping groupes

`groupId` → un `<mxCell vertex="1" style="group;" connectable="0">` par groupe distinct. Bbox calculée depuis l'union des coins top-left/bottom-right des membres. Chaque nœud membre obtient `parent="<groupCellId>"` et ses coordonnées deviennent relatives au coin haut-gauche du groupe (`absX − group.minX`).

### Métadonnées sémantiques

`description`, `kind`, `renderAs`, `evidence` (array sérialisé JSON), `nodeLink` → encodés comme attributs `ld_*` sur un wrapper `<UserObject>` autour du `<mxCell>` (sauf `nodeLink` qui devient `link=` standard drawio). Préservés pour roundtrip si quelqu'un réimporte plus tard. Aucun affichage visuel dans drawio.

### Détails d'encodage

- Échappement XML systématique : `& " < > \n \r`.
- Nombres : `num()` arrondit aux entiers proches (tolérance 1e-6), sinon `toFixed(3)`.
- Data URIs d'images : conversion `data:image/png;base64,...` → `data:image/png,base64,...` (forme à virgule reconnue par drawio) pour éviter que le `;` après le mime type ne soit interprété comme séparateur de propriété de style.
- ID du `<diagram>` généré aléatoirement (`d` + base36), évite tout caractère interdit issu du titre.
- Prolog `<?xml version="1.0" encoding="UTF-8"?>`.

### Intégration UI

- Bouton `#btnExportDrawio` dans la topbar entre `btnDebug` et `btnSave`, icône download SVG inline, `data-i18n-title="diagram.toolbar.export_drawio"`.
- Wiring dans `src/frontend/diagram/main.js` : `import { exportCurrentDiagramAsDrawio } from './drawio-export.js'` + `addEventListener('click', exportCurrentDiagramAsDrawio)`.
- 4 nouvelles clés i18n bilingues (en.json + fr.json) :
  - `diagram.toolbar.export_drawio`
  - `diagram.toast.drawio_exported`
  - `diagram.toast.drawio_export_error`
  - `diagram.toast.drawio_label_rotation_dropped` (placeholder `{count}` substitué côté JS)
- Téléchargement direct via `Blob` + `<a download>` avec nom sanitisé `<titre-sanitisé>.drawio` (lowercase ASCII, underscores, max 80 chars).

## Arbitrages validés

1. **Formes custom** : embed image base64 inline. Conséquence : forme fixe dans drawio (non recolorable). Pas d'alternative viable car les images custom sont arbitraires (SVG/PNG utilisateur).
2. **`labelRotation` indépendante de `rotation`** : drop avec toast de récap quand `|labelRotation − rotation| > 1e-3`. drawio ne sait pas tourner le label indépendamment de la forme sans dupliquer le label dans un cell séparé ; option jugée trop lourde versus la rareté du cas.
3. **Bezier des port-edges** : dérive cosmétique acceptée. drawio bezier interne ≠ bezier projet à points de contrôle calculés depuis les normales des ports avec tension `max(60, dist × 0.4)`. Endpoints, ports, label, couleur, flèches, dashes : tout préservé. Seule la courbe entre les deux endpoints diffère légèrement.
4. **Métadonnées sémantiques** : préservées dans `<UserObject>` avec préfixe `ld_*`. Coût XML marginal, gain de roundtrip potentiel.

## Conséquences

### PROS

- Export universel : `.drawio` ouvrable dans drawio.com, drawio desktop, VS Code Draw.io Integration, IntelliJ plugin, etc.
- Self-contained : images base64 inline, le fichier fonctionne hors connexion au serveur d'origine.
- Fidélité élevée : tous shape types supportés, ports respectés au pixel près via `exitPerimeter=0`/`entryPerimeter=0`, groupes structurellement reconstruits, métadonnées préservées.
- Zéro dépendance npm : génération XML par concaténation de strings.
- Format drawio stable depuis 10+ ans, risque de drift très faible.
- Pattern testable indépendamment : le module ne dépend que de `st.nodes`/`st.edges`/`st.network` côté runtime + tables statiques côté pure JS.

### CONS

- One-way only : pas d'import drawio → diagramme projet. À considérer comme ADR séparé si besoin.
- Bezier des port-edges légèrement différent visuellement entre les deux outils (cf. arbitrage 3).
- Custom shapes deviennent des `shape=image` figés dans drawio (cf. arbitrage 1).
- Si un fetch d'image échoue (réseau, 404), l'URL d'origine est conservée , le fichier ne sera pleinement autonome que si le serveur est joignable au moment de l'ouverture. Un log console signale la défaillance mais pas de blocage de l'export.
- Les overrides de couleurs `st.nodeColorOverrides` (admin config) ne sont pas appliqués à l'export , la couleur exportée est celle des constantes `NODE_COLORS` du `colorKey`. Choix volontaire : `colorKey` est la vérité partageable, les overrides sont locaux au déploiement.
- `labelRotation` indépendante de `rotation` est perdue à l'export (cf. arbitrage 2).
- Les états éditeur (`gridEnabled`, `alignGuides`, `edgesStraight` est mappé sur `curved=1`/`0`) ne sont pas tous transposables : grid/alignGuides sont purement UX projet, droppés.
