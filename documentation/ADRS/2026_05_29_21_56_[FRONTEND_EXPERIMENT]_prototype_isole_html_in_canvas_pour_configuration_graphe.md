---
**date:** 2026-05-29
**status:** To be validated
**description:** Ajout d'un prototype isole sous experiments/html-in-canvas-configuration pour explorer une interface de configuration graphe hierarchique avec providers LLM polygonaux, agents feuilles, MCP par defaut, panneau contextuel tiers d'ecran, camera pan/zoom et rendu HTML-in-Canvas ou fallback DOM.
**tags:** html-in-canvas, drawElementImage, layoutsubtree, frontend, experiment, configuration-graph, llm-provider, agent, mcp, dynamic-polygon, contextual-panel, pan-zoom, panel-translation, cluster-relaxation, delete-confirmation
---

# Prototype isole HTML-in-Canvas pour configuration graphe

## Contexte

L'objectif est d'explorer une interface de configuration plus spatiale que les pages admin classiques : Living Documentation apparait comme une brique centrale, les providers LLM et MCP sont connectes a cette brique, et les agents sont rattaches aux providers qui les executent.

Le projet possede deja un editeur de diagrammes de production fonde sur `src/frontend/diagram/` et des contraintes vis-network documentees. Introduire directement une API navigateur experimentale dans ce chemin augmenterait le risque de regression.

## Decision

Creer un prototype totalement isole dans `experiments/html-in-canvas-configuration/` au lieu de modifier l'editeur de diagrammes existant.

Le prototype contient :

- une page statique `index.html` avec un canvas `layoutsubtree` et un formulaire enfant direct du canvas ;
- un script `app.js` qui dessine le graphe hierarchique, les connexions, la grille, les briques polygonales, les feuilles et la camera pan/zoom en Canvas 2D ;
- un style `styles.css` pour un panneau de configuration dense et professionnel ;
- un `README.md` avec les instructions de lancement et d'activation du flag navigateur.

Quand `CanvasRenderingContext2D.drawElementImage` et `canvas.requestPaint` existent, le formulaire est rendu dans le canvas via HTML-in-Canvas. Sinon, le meme formulaire est monte dans un panneau DOM de fallback, afin que l'experimentation reste utilisable dans les navigateurs courants.

Le modele du prototype est hierarchique :

- `Living AI Documentation` est la brique systeme racine ;
- les `LLM providers` sont des briques polygonales rattachees a la racine ;
- `MCP` est une feuille racine presente par defaut et expose ses details dans le panneau de consultation ;
- les `Agents` sont des feuilles rattachees a un provider LLM ;
- le concept de `collector` n'existe pas dans ce prototype.

Chaque brique polygonale calcule son nombre de cotes avec `max(6, nombreDeNoeudsEnfants)`. L'information numerique de ports n'est pas affichee dans le dessin : la geometrie suffit a exprimer la capacite de connexion.

Le layout privilegie un rendu compact par defaut. Les providers autour de `Living AI Documentation` utilisent leur rayon de collision propre pour les petits sous-arbres, afin que le preset initial reste visible sans lignes inutilement longues. Les agents d'un provider sont distribues dans un eventail oriente vers l'exterieur du graphe : cela evite de pousser un agent vers la brique racine et limite l'extension globale.

Quand un provider devient dense, la pression est appliquee au niveau racine. `distanceForRootChild()` augmente d'abord la distance entre `Living AI Documentation` et ce provider lorsque le nombre d'agents depasse un seuil ou lorsque le rayon estime du sous-arbre devient important. Les lignes entre provider et agents restent gouvernees par `distanceForChildren()` uniquement pour eviter les chevauchements entre agents.

Les clusters racine sont aussi conscients les uns des autres. `layoutRootChildren()` effectue plusieurs passes : il positionne les enfants de la racine, layout les sous-arbres providers, calcule `clusterBounds()` pour chaque enfant racine, puis `relaxRootClusterDistances()` allonge les liens racine des deux clusters lorsque leurs empreintes se chevauchent avec une marge. Ainsi, ajouter des agents a `LLM Provider 4` peut aussi eloigner `DevStral2 LLM API` ou `LLM Provider 3` si leurs clusters se touchent.

La scene utilise une camera de canvas independante des positions logiques :

- l'origine du graphe reste centree sur `Living AI Documentation` dans l'espace monde ;
- `Fit` est la seule action qui recalcule le zoom et recadre le graphe avec `zoomToFitBounds()` ;
- la molette zoome autour du pointeur pour cibler une region ;
- le drag sur une zone vide pan la scene complete, sans deplacer un noeud individuellement ;
- lorsqu'un noeud est selectionne depuis un etat sans selection, le panneau apparait et `syncCameraForPanelChange()` applique uniquement une translation horizontale de la camera ;
- lorsqu'un autre noeud est selectionne alors que le panneau est deja ouvert, seul le contenu du panneau change : le zoom, `cameraY` et `cameraX` restent stables ;
- lorsque la selection est retiree, la translation horizontale du panneau est retiree sans recalculer le zoom.

L'action `+` est contextuelle : lorsqu'aucun noeud, une brique racine ou MCP est selectionne, elle ajoute un provider LLM a la racine ; lorsqu'un provider LLM ou l'un de ses agents est selectionne, elle ajoute un agent sous ce provider.

Le panneau de configuration est contextuel : aucun noeud selectionne laisse le graphe centre et masque le panneau ; selectionner un noeud affiche un panneau de consultation d'environ un tiers de la largeur et decale horizontalement la camera. La fiche MCP contient un inventaire dense des outils et prompts disponibles afin de tester un panneau riche en donnees.

Le panneau DOM fallback plafonne sa largeur pour eviter une lecture trop longue et utilise des champs fluides pour eviter la distorsion des titres et inputs. L'apparition du panneau est animee en CSS, et la translation horizontale du graphe est interpolee dans le canvas sur 260 ms.

Les interactions du panneau sont isolees du canvas : les evenements pointer/click/touch/wheel du panneau stoppent leur propagation, et le handler canvas ignore les evenements dont la cible n'est pas le canvas. Cela empeche les champs, selects, boutons `Test`, `Apply` et `X` de fermer le panneau par deselection accidentelle.

Les connexions parent-enfant sont dessinees depuis le vecteur reel parent -> enfant. Les feuilles utilisent une intersection rectangulaire pour placer l'attache sur leur bord. Les briques polygonales utilisent une intersection rayon/segment avec les cotes du polygone, afin que les lignes partent du bord reel de la forme et non d'un cercle approximatif.

La suppression via le bouton `X` agit directement sur `selectedId`. Les noeuds proteges `root` et `mcp` ne sont pas supprimables. Les suppressions actives ouvrent une modale de confirmation qui annonce le noeud vise, precise si des enfants/descendants seront aussi supprimes, puis supprime le sous-arbre et reselectionne le parent si l'utilisateur confirme.

## Consequences

### PROS

- L'experimentation HTML-in-Canvas peut avancer sans toucher au chemin de production vis-network.
- Le prototype teste le modele d'interaction essentiel : ajout contextuel de providers/agents, selection, edition contextuelle, panneau de configuration, croissance geometrique par niveau, zoom regional et pan global.
- Le fallback DOM permet de verifier l'ergonomie meme sans Chrome Canary/Brave avec le flag `canvas-draw-element`.
- Les fichiers sont simples, sans dependance ni bundler, coherents avec la stack frontend actuelle.
- Le layout compact rend le preset initial lisible, tandis que la camera pan/zoom et la relaxation des clusters racine acceptent des graphes plus grands sans forcer les agents a traverser le centre.
- Le zoom utilisateur est preserve pendant la consultation : ouvrir le panneau ou changer de selection ne declenche plus de dezoomage intempestif.

### CONS

- Le rendu natif HTML-in-Canvas reste dependant d'une API experimentale et non disponible dans tous les navigateurs.
- Le prototype ne persiste pas encore le modele de configuration et ne s'integre pas aux routes existantes.
- Le formulaire est schema-like mais pas encore relie aux vrais types de configuration du produit.
- Les tests automatises restent limites a la syntaxe JS et a une verification navigateur du prototype.
- La relaxation iterative est heuristique : ses constantes devront etre ajustees par observation visuelle sur des graphes denses.

## Verification

- `node --check experiments/html-in-canvas-configuration/app.js` : OK.
- Verification HTTP sur `http://localhost:8080/experiments/html-in-canvas-configuration/?v=panel-translate-1` : 200 OK.
- Verification navigateur locale sur `http://localhost:8080/experiments/html-in-canvas-configuration/?v=panel-translate-1` : OK en fallback DOM.
- Verification navigateur : le preset initial charge avec le panneau masque et les assets `panel-translate-1`.
- Verification navigateur : clic `+` ouvre le panneau, puis second clic `+` change la selection avec le panneau deja ouvert.
- Verification code : `resetView()` reste utilise pour `Fit` et reset ; la selection passe par `syncCameraForPanelChange()` / `translateCamera()` pour ne pas modifier le zoom.
