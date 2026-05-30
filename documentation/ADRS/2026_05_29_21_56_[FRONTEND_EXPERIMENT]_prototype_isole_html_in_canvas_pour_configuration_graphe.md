---
**date:** 2026-05-29
**status:** To be validated
**description:** Promotion du prototype HTML-in-Canvas en workspace TypeScript servi par `/workspace`, avec graphe hierarchique polygonal, panneau contextuel, pan/zoom et entree topbar.
**tags:** html-in-canvas, drawElementImage, layoutsubtree, frontend, workspace, typescript, configuration-graph, llm-provider, agent, mcp, dynamic-polygon, contextual-panel, pan-zoom, cluster-relaxation, topbar-route
---

# Prototype workspace HTML-in-Canvas pour configuration graphe

## Contexte

L'objectif est d'explorer une interface de configuration plus spatiale que les pages admin classiques : `Living AI Documentation` apparait comme une brique centrale, les providers LLM et MCP sont connectes a cette brique, et les agents sont rattaches aux providers qui les executent.

Le projet possede deja un editeur de diagrammes de production fonde sur `src/frontend/diagram/` et des contraintes vis-network documentees. Introduire directement une API navigateur experimentale dans ce chemin augmenterait le risque de regression. L'experimentation reste donc isolee fonctionnellement, mais elle devient accessible depuis l'application afin de preparer une iteration progressive de type strangler fig.

## Decision

Promouvoir le prototype depuis `experiments/html-in-canvas-configuration/` vers un workspace frontend dedie sous `src/frontend/workspace/`.

Le workspace contient :

- `index.html`, page autonome servie par Living Documentation ;
- `app.ts`, source TypeScript du graphe, de la camera, du panneau et du modele d'entites ;
- `app.js` et `app.js.map`, artefacts generes pour rester compatible avec le frontend statique actuel ;
- `styles.css`, styles du canvas, des controles et du panneau de consultation ;
- `tsconfig.json`, compilation locale du workspace hors du `tsconfig` principal ;
- `README.md`, instructions de lancement et d'activation du flag navigateur.

`npm run build` compile maintenant aussi `src/frontend/workspace/app.ts` avant la copie des assets frontend vers `dist/`. Le serveur Express expose `/workspace` avec `src/frontend/workspace/index.html`, et la topbar de `src/frontend/index.html` ajoute un lien `Workspace` juste apres le champ de recherche. La chaine i18n existante porte la cle `nav.workspace` en anglais et en francais.

Quand `CanvasRenderingContext2D.drawElementImage` et `canvas.requestPaint` existent, le formulaire est rendu dans le canvas via HTML-in-Canvas. Sinon, le meme formulaire est monte dans un panneau DOM de fallback, afin que l'experimentation reste utilisable dans les navigateurs courants.

## Modele d'interface

Le modele du prototype est hierarchique :

- `Living AI Documentation` est la brique systeme racine ;
- les `LLM providers` sont des briques polygonales rattachees a la racine ;
- `MCP` est une feuille racine presente par defaut et expose ses details dans le panneau de consultation ;
- les `Agents` sont des feuilles rattachees a un provider LLM ;
- le concept de `collector` n'existe pas dans ce prototype.

Chaque brique polygonale calcule son nombre de cotes avec `max(6, nombreDeNoeudsEnfants)`. L'information numerique de ports n'est pas affichee dans le dessin : la geometrie suffit a exprimer la capacite de connexion.

L'action `+` est contextuelle : lorsqu'aucun noeud, une brique racine ou MCP est selectionne, elle ajoute un provider LLM a la racine ; lorsqu'un provider LLM ou l'un de ses agents est selectionne, elle ajoute un agent sous ce provider.

La suppression via le bouton `X` agit directement sur `selectedId`. Les noeuds proteges `root` et `mcp` ne sont pas supprimables. Les suppressions actives ouvrent une modale de confirmation qui annonce le noeud vise, precise si des enfants/descendants seront aussi supprimes, puis supprime le sous-arbre et reselectionne le parent si l'utilisateur confirme.

## Layout et camera

Le layout privilegie un rendu compact par defaut. Les providers autour de `Living AI Documentation` utilisent leur rayon de collision propre pour les petits sous-arbres, afin que le preset initial reste visible sans lignes inutilement longues. Les agents d'un provider sont distribues dans un eventail oriente vers l'exterieur du graphe : cela evite de pousser un agent vers la brique racine et limite l'extension globale.

Quand un provider devient dense, la pression est appliquee au niveau racine. `distanceForRootChild()` augmente d'abord la distance entre `Living AI Documentation` et ce provider lorsque le nombre d'agents depasse un seuil ou lorsque le rayon estime du sous-arbre devient important. Les lignes entre provider et agents restent gouvernees par `distanceForChildren()` uniquement pour eviter les chevauchements entre agents.

Les clusters racine sont conscients les uns des autres. `layoutRootChildren()` effectue plusieurs passes : il positionne les enfants de la racine, layout les sous-arbres providers, calcule `clusterBounds()` pour chaque enfant racine, puis `relaxRootClusterDistances()` allonge les liens racine des deux clusters lorsque leurs empreintes se chevauchent avec une marge. Ainsi, ajouter des agents a `LLM Provider 4` peut aussi eloigner `DevStral2 LLM API` ou `LLM Provider 3` si leurs clusters se touchent.

La scene utilise une camera de canvas independante des positions logiques :

- l'origine du graphe reste centree sur `Living AI Documentation` dans l'espace monde ;
- `Fit` est la seule action qui recalcule le zoom et recadre le graphe avec `zoomToFitBounds()` ;
- la molette zoome autour du pointeur pour cibler une region ;
- le drag sur une zone vide pan la scene complete, sans deplacer un noeud individuellement ;
- lorsqu'un noeud est selectionne, `selectedPanelAvoidanceDelta()` compare sa bounding box ecran avec la zone du panneau ;
- si le noeud reste visible, aucune translation n'est appliquee ;
- si le noeud risque d'etre cache sous le panneau, `syncCameraForPanelChange()` applique seulement la translation horizontale minimale necessaire ;
- lorsqu'un autre noeud est selectionne alors que le panneau est deja ouvert, le contenu du panneau change et la camera ne bouge que si ce nouveau noeud est lui aussi dans la zone d'occultation ;
- lorsque la selection est retiree, la translation horizontale accumulee est retiree sans recalculer le zoom.

Les connexions parent-enfant sont dessinees depuis le vecteur reel parent -> enfant. Les feuilles utilisent une intersection rectangulaire pour placer l'attache sur leur bord. Les briques polygonales utilisent une intersection rayon/segment avec les cotes du polygone, afin que les lignes partent du bord reel de la forme et non d'un cercle approximatif.

## Panneau

Le panneau de configuration est contextuel : aucun noeud selectionne laisse le graphe centre et masque le panneau ; selectionner un noeud affiche un panneau de consultation d'environ un tiers de la largeur et ne decale la camera que si le noeud selectionne serait masque. La fiche MCP contient un inventaire dense des outils et prompts disponibles afin de tester un panneau riche en donnees.

Le panneau DOM fallback plafonne sa largeur pour eviter une lecture trop longue et utilise des champs fluides pour eviter la distorsion des titres et inputs. L'apparition du panneau est animee en CSS, et la translation horizontale conditionnelle du graphe est interpolee dans le canvas sur 260 ms.

Les interactions du panneau sont isolees du canvas : les evenements pointer/click/touch/wheel du panneau stoppent leur propagation, et le handler canvas ignore les evenements dont la cible n'est pas le canvas. Cela empeche les champs, selects, boutons `Test`, `Apply` et `X` de fermer le panneau par deselection accidentelle.

## Consequences

### PROS

- L'experimentation HTML-in-Canvas reste separee de l'editeur vis-network de production.
- La route `/workspace` rend l'experience testable depuis le produit sans imposer encore une migration globale.
- TypeScript documente les structures principales (`Entity`, `EntityConfig`, `Point`, `Bounds`) et reduit le risque sur les prochains refactorings de layout.
- Le fallback DOM permet de verifier l'ergonomie meme sans Chrome Canary/Brave avec le flag `canvas-draw-element`.
- Le layout compact rend le preset initial lisible, tandis que la camera pan/zoom et la relaxation des clusters racine acceptent des graphes plus grands sans forcer les agents a traverser le centre.
- Le zoom utilisateur est preserve pendant la consultation : ouvrir le panneau ou changer de selection ne declenche plus de dezoomage intempestif.

### CONS

- Le rendu natif HTML-in-Canvas reste dependant d'une API experimentale et non disponible dans tous les navigateurs.
- Le workspace ne persiste pas encore le modele de configuration et ne s'integre pas encore aux donnees reelles du produit.
- `app.js` reste versionne comme artefact frontend statique tant que le projet n'a pas de bundler frontend dedie.
- La relaxation iterative et la detection d'occultation du panneau sont heuristiques : leurs constantes devront etre ajustees par observation visuelle.

## Verification

- `npx tsc -p src/frontend/workspace/tsconfig.json` : OK.
- `npm run check:frontend` : OK, 65 fichiers JavaScript verifies.
- `npm run build` : OK, compilation TypeScript workspace et copie vers `dist/src/frontend/`.
- Verification HTTP sur `http://localhost:4321/workspace/` : 200 OK sur le serveur courant.
