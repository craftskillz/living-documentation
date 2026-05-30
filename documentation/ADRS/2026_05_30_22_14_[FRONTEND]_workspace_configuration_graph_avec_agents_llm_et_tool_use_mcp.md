---
**date:** 2026-05-30
**status:** To be validated
**description:** Workspace de configuration graphique servi sur /workspace, avec graphe hierarchique pan/zoom, panneau contextuel, persistence JSON, providers LLM configurables, agents avec system prompt, boucle tool use MCP et selection de modele dynamique.
**tags:** workspace, html-in-canvas, typescript, configuration-graph, llm-provider, agent, mcp, tool-use, pan-zoom, panel, persistence, ollama, chat-completions, model-select, run-agent
---

# Workspace de configuration graphe avec agents LLM et tool use MCP

## Contexte

Le projet Living Documentation doit pouvoir orchestrer des agents LLM qui consultent et maintiennent la documentation via le MCP. Une interface de configuration graphique est nécessaire pour déclarer les providers LLM, configurer les agents et tester les connexions sans passer par des fichiers de configuration manuels.

Le prototype HTML-in-Canvas initial (ADR supersédé) a validé l'approche graphique. Ce workspace devient la surface de configuration opérationnelle.

## Decision

Implémenter `src/frontend/workspace/` comme workspace de configuration complet, servi par Express sur `/workspace`, compilé en TypeScript vers `app.js` avant la copie des assets.

## Architecture du graphe

Le modèle est hiérarchique avec quatre types de nœuds :

- **system** (`root`) — brique racine `Living AI Documentation`, immuable, non supprimable, non sélectionnable (aucun panel à l'ouverture).
- **llm** — provider LLM OpenAI-compatible (Ollama, OpenAI, etc.), enfant de root.
- **agent** — agent configuré avec un system prompt, enfant d'un provider LLM.
- **mcp** — surface de consultation MCP, enfant de root, affiche l'inventaire des outils disponibles.

La géométrie polygonale des providers encode le nombre d'enfants (`max(6, nbAgents)` côtés). Le layout distribue les agents en éventail orienté vers l'extérieur. La relaxation multi-passes (`relaxRootClusterDistances`) évite les chevauchements entre clusters racine.

## Caméra et panel

- **Fit** recalcule zoom et position pour centrer le graphe visible.
- **Pan** sur zone vide, zoom molette autour du pointeur.
- **Sélection d'un nœud** (panel fermé) : anime le nœud au centre horizontal de la zone gauche (`availableWidth / 2 - entity.x * zoom`). La caméra revient à sa position d'origine à la désélection.
- **Sélection avec panel déjà ouvert** : translation minimale si le nœud risque d'être occulté par le panel.
- Les événements pointer/touch/wheel du panel stoppent leur propagation pour ne pas déclencher de désélection accidentelle.

## Panel contextuel par kind

### LLM provider
Champs : Endpoint (URL OpenAI-compatible), API token, Model (selectbox chargée dynamiquement depuis `/v1/models` via bouton ↻ avec animation spinner), Workspace folder (readonly, auto-généré), Timeout, Description.

Bouton **Test** (désactivé si aucun modèle sélectionné) : appel `POST /v1/chat/completions` avec `max_tokens: 1` si un modèle est sélectionné, sinon `GET /v1/models`. Résultat via toast ✓/✕.

### Agent
Champs : System prompt (textarea), User input (textarea — message `role: user` envoyé après le system prompt).

Bouton **Test** : déclenche la boucle agentique (voir ci-dessous).

### MCP
Affiche l'inventaire statique des outils et prompts disponibles. Pas de champs endpoint/token/model/timeout.

### Nœud root
Aucun panel — clic ignoré.

## Persistence

`PUT /api/workspace` et `GET /api/workspace` sérialisent l'état complet (entités + caméra) dans un fichier `.workspace` dans le dossier de documentation. Auto-save déclenché par chaque modification de champ (debounce). Les champs persistés par entité incluent : `endpoint`, `token`, `model`, `timeout`, `description`, `workspaceFolder`, `systemPrompt`.

## Boucle agentique (run-agent)

`POST /api/workspace/run-agent` orchestre la boucle LLM ↔ MCP côté backend :

1. Si `mcpEndpoint` fourni : appel `tools/list` au MCP pour récupérer les schémas de tools.
2. Conversion au format OpenAI (`type: "function"`), envoyés au LLM avec `tools: [...]`.
3. Si le LLM répond avec `tool_calls` : exécution de chaque appel via `tools/call` au MCP (Streamable HTTP JSON-RPC 2.0), résultats injectés comme messages `role: tool`.
4. Boucle jusqu'à 5 tours max ou réponse textuelle finale.
5. Timeout configurable jusqu'à 600s (défaut 180s).

Le LLM (Ollama/gemma4) décide lui-même quels tools appeler en fonction du system prompt et du user input. Le system prompt peut orienter sans hardcoder l'appel.

## Routes backend

| Route | Description |
|---|---|
| `GET /api/workspace` | Lecture état workspace |
| `PUT /api/workspace` | Sauvegarde état workspace |
| `POST /api/workspace/list-models` | Liste modèles depuis `/v1/models` |
| `POST /api/workspace/test-llm` | Test connexion LLM |
| `POST /api/workspace/run-agent` | Boucle agentique LLM + MCP |

## Conséquences

### PROS
- Configuration graphique des providers et agents sans fichiers manuels.
- Boucle agentique générique : n'importe quel tool MCP peut être appelé selon le prompt.
- Fallback DOM assure l'utilisabilité sans flag navigateur expérimental.
- Persistence locale transparente (auto-save).
- Sélection de modèle dynamique depuis le provider configuré.

### CONS
- `app.js` reste un artefact commité (pas de bundler frontend dédié).
- Le rendu HTML-in-Canvas natif reste dépendant d'une API expérimentale.
- La boucle agentique ne streame pas les réponses intermédiaires.
- Pas de gestion des erreurs MCP granulaire (échec silencieux si le MCP est down).
