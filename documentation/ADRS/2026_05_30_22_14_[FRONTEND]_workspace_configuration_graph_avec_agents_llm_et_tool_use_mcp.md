---
type: ADR
title: Workspace Configuration Graph Avec Agents Llm Et Tool Use Mcp
description: Workspace de configuration graphique servi sur /workspace dans l'application Svelte, avec graphe hierarchique pan/zoom, persistence JSON, providers LLM configurables, agents avec system prompt, boucle tool use MCP et selection de modele dynamique.
tags:
  - workspace
  - svelte5
  - html-in-canvas
  - typescript
  - configuration-graph
  - llm-provider
  - agent
  - mcp
  - tool-use
  - pan-zoom
  - panel
  - persistence
  - ollama
  - chat-completions
  - model-select
  - run-agent
  - workspace-route
timestamp: 2026-05-30T22:14:00Z
status: To be validated
---

# Workspace de configuration graphe avec agents LLM et tool use MCP

## Contexte

Le projet Living Documentation doit pouvoir orchestrer des agents LLM qui consultent et maintiennent la documentation via le MCP. Une interface de configuration graphique est nécessaire pour déclarer les providers LLM, configurer les agents et tester les connexions sans passer par des fichiers de configuration manuels.

## Décision

Implémenter `/workspace` comme route Svelte (`src/frontend-svelte/src/routes/Workspace.svelte`) qui initialise le moteur de graphe TypeScript situé dans `src/frontend-svelte/src/lib/workspace/`. L'état du graphe est persisté côté backend dans `.workspace` via `src/routes/workspace.ts`.

## Architecture du graphe

Le modèle est hiérarchique avec quatre types de nœuds :

- **system** (`root`) , brique racine immuable, non supprimable, non sélectionnable.
- **llm** , provider LLM OpenAI-compatible (Ollama, OpenAI, etc.), enfant de root.
- **agent** , agent configuré avec un system prompt, enfant d'un provider LLM.
- **mcp** , surface de consultation MCP, enfant de root.

## Panel contextuel , dark mode par kind

Le panel est rendu dans le canvas quand l'API HTML-in-Canvas est disponible, avec un fallback DOM hors canvas sinon. Les champs affichés varient selon le kind :

| Kind  | Champs visibles                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------- |
| llm   | Endpoint, API token, Model (selectbox dynamique), Timeout, Description                          |
| agent | Workspace folder readonly, System prompt, User input optionnel, Required output marker, Description |
| mcp   | Inventaire des tools/prompts uniquement                                                         |
| root  | Aucun panel (clic ignoré)                                                                       |

Le bouton `+` est contextuel : sans provider LLM sélectionné, il ajoute un provider ; depuis un provider LLM ou un agent enfant, il ajoute un agent sous le provider. Le bouton `Test` teste un provider LLM ou ouvre la popup d'exécution d'un agent selon la sélection.

## Sélection de modèle dynamique

Le champ Model est une `<select>` peuplée via `POST /api/workspace/list-models` avec animation spinner sur le bouton de rechargement. Le bouton Test est désactivé pour un LLM si aucun modèle n'est sélectionné.

## Dossiers workspace pour agents

À chaque sauvegarde, le backend crée `AI/WORKSPACE/<slug>` pour chaque nœud **agent** (pas LLM). Si le libellé d'un agent change et que son dossier existant doit être renommé, l'interface demande confirmation avant que le backend déplace le dossier.

## Propagation LLM → agents

Quand model ou timeout change sur un nœud LLM, tous ses agents enfants reçoivent les nouvelles valeurs via `syncSelectedFromForm`.

## Comportement caméra

- Panel fermé → clic nœud → caméra centre le nœud horizontalement dans la zone gauche disponible.
- Panel ouvert → changement de sélection → translation minimale si occlusion.
- Désélection → caméra revient à sa position d'origine.

## Boucle agentique (run-agent)

`POST /api/workspace/run-agent` orchestre la boucle LLM ↔ MCP côté backend :

1. Appel `tools/list` au MCP → conversion au format OpenAI.
2. LLM reçoit `tools: [...]` et répond avec `tool_calls`.
3. Backend exécute chaque appel MCP, renvoie les résultats comme messages `role: tool`.
4. Boucle jusqu'à 5 tours max, timeout configurable jusqu'à 600s (défaut 180s).
5. Si le modèle retourne 400 avec tools (ex: deepseek-r1) → retry sans tools avec descriptions en contexte.

`POST /api/workspace/run-agent-document` exécute le même agent depuis son identifiant stocké dans `.workspace` et écrit un document Markdown de résultat dans le dossier `AI/WORKSPACE/<slug>` de l'agent.

## Routes backend

| Route                                      | Description                                      |
| ------------------------------------------ | ------------------------------------------------ |
| `GET /api/workspace`                       | Lecture état workspace depuis `.workspace`       |
| `PUT /api/workspace`                       | Sauvegarde état workspace et dossiers agents     |
| `POST /api/workspace/list-models`          | Liste modèles depuis `/v1/models` ou `/models`   |
| `POST /api/workspace/test-llm`             | Test connexion LLM                               |
| `POST /api/workspace/run-agent`            | Boucle agentique LLM + MCP depuis configuration  |
| `POST /api/workspace/run-agent-document`   | Exécution d'un agent persistant + document run   |

## Conséquences

### PROS

- Configuration graphique des providers et agents sans fichiers manuels.
- Boucle agentique générique : n'importe quel tool MCP peut être appelé selon le prompt.
- Fallback DOM assure l'utilisabilité sans flag navigateur expérimental.
- Persistence locale transparente (auto-save).
- La route Workspace suit maintenant l'architecture frontend Svelte unifiée du projet.

### CONS

- Le rendu HTML-in-Canvas reste dépendant d'une API expérimentale et conserve un fallback DOM.
- La boucle agentique ne streame pas les réponses intermédiaires.
- Les runs agentiques persistés créent des documents Markdown dans `AI/WORKSPACE/`, ce qui peut nécessiter un nettoyage documentaire périodique.
