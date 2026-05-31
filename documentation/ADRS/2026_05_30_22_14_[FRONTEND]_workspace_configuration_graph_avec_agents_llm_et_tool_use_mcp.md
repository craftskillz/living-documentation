---
**date:** 2026-05-30
**status:** To be validated
**description:** Workspace de configuration graphique servi sur /workspace, avec agents LLM configurables, user input optionnel, marqueur de sortie attendu, boucle tool use MCP, lancement depuis la Home et creation de documents de run.
**tags:** workspace, html-in-canvas, typescript, configuration-graph, llm-provider, agent, mcp, tool-use, expected-output-marker, mermaid, run-agent, agents-ia, document-generation
---

# Workspace de configuration graphe avec agents LLM et tool use MCP

## Contexte

Le projet Living Documentation doit orchestrer des agents LLM qui consultent et maintiennent la documentation via le MCP. Le workspace graphique sert à déclarer les providers LLM, configurer les agents, tester les connexions et exécuter les agents depuis la Home.

Un run de l'agent `Générer Diagramme Mermaid` a montré qu'un modèle peut répondre par une introduction textuelle sans produire l'artefact demandé. Le backend acceptait jusque-là le premier message texte non vide comme succès final.

## Decision

Conserver le workspace TypeScript `/workspace` comme surface de configuration des agents, et ajouter une contrainte optionnelle `expectedOutputMarker` par agent.

Lorsqu'un agent définit ce marqueur, la boucle backend `runAgent` vérifie que la réponse finale contient ce marqueur. Si ce n'est pas le cas, elle ajoute un message correctif au modèle et lui donne un tour supplémentaire pour produire la sortie attendue. Si aucun tour ne produit le marqueur, l'exécution échoue explicitement au lieu de créer un document de succès incomplet.

## Architecture du graphe

Le modèle est hiérarchique avec quatre types de nœuds :

- **system** (`root`) — brique racine `Living AI Documentation`, immuable, non supprimable, non sélectionnable.
- **llm** — provider LLM OpenAI-compatible, enfant de root.
- **agent** — agent configuré avec system prompt et contraintes d'exécution, enfant d'un provider LLM.
- **mcp** — surface de consultation MCP, enfant de root, affiche l'inventaire des outils disponibles.

La géométrie polygonale des providers encode le nombre d'enfants (`max(6, nbAgents)` côtés). Le layout distribue les agents en éventail orienté vers l'extérieur et applique une relaxation entre clusters pour limiter les chevauchements.

## Panel agent

Champs de configuration :

- Workspace folder readonly, auto-généré sous `AI/WORKSPACE/<agent_slug>`.
- System prompt.
- `Require a user input`.
- `Describe User input`, obligatoire quand `Require a user input` est coché.
- `Required output marker`, optionnel, par exemple ```mermaid pour imposer une sortie Mermaid.

Le bouton **Test** ouvre une modale d'exécution dédiée. Cette modale ne contient un champ de saisie que si `Require a user input` est actif ; sinon elle lance le test avec le system prompt configuré et un input vide. Elle affiche ensuite le résultat ou l'erreur dans la même modale sans écrire de document durable.

## Persistence

`PUT /api/workspace` et `GET /api/workspace` sérialisent l'état complet dans `DOCS_FOLDER/.workspace`.

Les champs persistés par entité incluent : `endpoint`, `token`, `model`, `timeout`, `description`, `workspaceFolder`, `systemPrompt`, `requiresUserInput`, `userInputDescription`, `expectedOutputMarker`.

Pour chaque agent, le backend garantit un dossier workspace sous `AI/WORKSPACE/<agent_slug>`. Ce dossier reçoit les documents de run de l'agent.

## Boucle agentique

`POST /api/workspace/run-agent` et `POST /api/workspace/run-agent-document` utilisent la fonction backend `runAgent` :

1. Si `mcpEndpoint` est fourni, appel `tools/list` au MCP.
2. Conversion des tools au format OpenAI function calling.
3. Envoi du system prompt, du user input éventuel et des tools au LLM.
4. Si le LLM demande des `tool_calls`, exécution via `tools/call`, puis réinjection des résultats comme messages `role: tool`.
5. Si le LLM fournit une réponse texte :
   - sans `expectedOutputMarker`, elle est acceptée comme réponse finale ;
   - avec `expectedOutputMarker`, elle est acceptée seulement si elle contient ce marqueur ;
   - sinon un message correctif est ajouté et un nouveau tour est lancé.
6. Après épuisement des tours, absence de réponse ou absence du marqueur requis devient une erreur explicite.

## Lancement depuis la Home

La Home `/` expose un bouton topbar `Agents IA` immédiatement après `Workspace`.

Le module `src/frontend/agents.js` :

- charge `GET /api/workspace` ;
- extrait les entités `kind === "agent"` ;
- retrouve le provider parent ;
- affiche les agents dans une modale en grille ;
- ouvre une modale de saisie seulement si `config.requiresUserInput === true` ;
- affiche `config.userInputDescription` comme consigne ;
- lance `POST /api/workspace/run-agent-document` ;
- affiche une notification persistante loading/success/error avec bouton `x` ;
- propose `Open document` si un document a été créé et ferme le toast après ouverture.

## Documents de run

`POST /api/workspace/run-agent-document` relit `.workspace`, résout l'agent, son provider parent et le MCP, puis exécute `runAgent`.

En succès, la route crée un document Markdown dans `DOCS_FOLDER/<agent.config.workspaceFolder>` avec catégorie `[AGENT]`, titre `Run - <Nom Agent>`, contexte d'exécution, user input et réponse finale.

En échec d'exécution LLM/MCP ou de validation `expectedOutputMarker`, si l'agent et son provider ont été résolus, la route crée aussi un document avec `status: Failed` contenant l'erreur.

## Configuration Mermaid

L'agent `Générer Diagramme Mermaid` est configuré avec :

- un prompt strict demandant de produire directement un diagramme Mermaid, sans introduction ;
- `expectedOutputMarker: ```mermaid`.

Cette configuration évite qu'un document de succès soit créé avec une simple annonce du type "I will generate..." sans bloc Mermaid.

## Panel agent workspace

Le panel agent conserve les champs de configuration dans la zone centrale, mais les actions sont regroupées dans le footer `panel-actions`.

`Test` est le bouton footer commun :

- sur un LLM provider, il lance le test de connexion ;
- sur un agent, il ouvre la modale de test agent ;
- il n'est pas affiché pour les autres types.

`Delete` reste dans le même footer, à droite, et n'est pas affiché pour les entités protégées.

La section agent n'utilise pas de sélecteur dépendant de l'ordre comme `first-child`. Elle est rendue en grille simple, avec une hauteur minimale explicite pour `System prompt` et `Describe User input`, afin d'éviter les superpositions quand `Workspace folder` est présent.

La page workspace référence ses assets en chemins absolus `/workspace/styles.css` et `/workspace/app.js` pour que `/workspace` sans slash final charge le même CSS/JS que `/workspace/`.

## Routes backend

| Route | Description |
|---|---|
| `GET /api/workspace` | Lecture état workspace |
| `PUT /api/workspace` | Sauvegarde état workspace |
| `POST /api/workspace/list-models` | Liste modèles depuis `/v1/models` |
| `POST /api/workspace/test-llm` | Test connexion LLM |
| `POST /api/workspace/run-agent` | Boucle agentique LLM + MCP pour test depuis le workspace |
| `POST /api/workspace/run-agent-document` | Boucle agentique LLM + MCP puis création du document de run |

## Conséquences

### PROS
- Configuration graphique des providers et agents sans fichiers manuels.
- Boucle agentique générique : n'importe quel tool MCP peut être appelé selon le prompt.
- Les agents deviennent actionnables depuis la Home sans exposer endpoint/token/prompt au frontend.
- Les résultats sont capturés sous forme documentaire dans le dossier de l'agent, succès comme échec.
- Les agents nécessitant un format de sortie peuvent déclarer un marqueur de validation.
- Un agent Mermaid ne peut plus produire un document de succès sans bloc Mermaid.

### CONS
- `app.js` reste un artefact commité.
- Le rendu HTML-in-Canvas natif reste dépendant d'une API expérimentale.
- La boucle agentique ne streame pas les réponses intermédiaires.
- `expectedOutputMarker` est une validation textuelle simple, pas une validation syntaxique complète du format généré.
