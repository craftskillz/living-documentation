---
**date:** 2026-05-30
**status:** To be validated
**description:** Workspace de configuration graphique servi sur /workspace, avec graphe hierarchique pan/zoom, panneau contextuel dark mode par kind, persistence JSON, providers LLM configurables, agents avec system prompt, boucle tool use MCP et selection de modele dynamique.
**tags:** workspace, html-in-canvas, typescript, configuration-graph, llm-provider, agent, mcp, tool-use, pan-zoom, panel, persistence, ollama, chat-completions, model-select, run-agent, dark-mode, blueprint, topbar
---

# Workspace de configuration graphe avec agents LLM et tool use MCP

## Contexte

Le projet Living Documentation doit pouvoir orchestrer des agents LLM qui consultent et maintiennent la documentation via le MCP. Une interface de configuration graphique est nécessaire pour déclarer les providers LLM, configurer les agents et tester les connexions sans passer par des fichiers de configuration manuels.

## Décision

Implémenter `src/frontend/workspace/` comme workspace de configuration complet, servi par Express sur `/workspace`, compilé en TypeScript vers `app.js` avant la copie des assets.

## Architecture du graphe

Le modèle est hiérarchique avec quatre types de nœuds :

- **system** (`root`) — brique racine immuable, non supprimable, non sélectionnable.
- **llm** — provider LLM OpenAI-compatible (Ollama, OpenAI, etc.), enfant de root.
- **agent** — agent configuré avec un system prompt, enfant d'un provider LLM.
- **mcp** — surface de consultation MCP, enfant de root.

## Panel contextuel — dark mode par kind

Le panel est rendu en dark (`#111827`) avec des champs semi-transparents. Les champs affichés varient selon le kind :

| Kind | Champs visibles |
|---|---|
| llm | Endpoint, API token, Model (selectbox dynamique), Workspace folder ignoré, Timeout, Description |
| agent | System prompt, User input, Workspace folder (readonly), réponses scrollables |
| mcp | Inventaire des tools/prompts uniquement |
| root | Aucun panel (clic ignoré) |

**Bouton ×** (jaune) = fermer le panel. **Bouton Delete** (rouge, footer droite) = ouvre la popup de confirmation. **Bouton Test** (footer gauche, LLM uniquement) = test de connexion. **Bouton Clear** (footer gauche, agent uniquement) = vide les réponses.

## Sélection de modèle dynamique

Le champ Model est une `<select>` peuplée via `POST /api/workspace/list-models` avec animation spinner sur le bouton ↻. Le bouton Test est désactivé si aucun modèle n'est sélectionné.

## Dossiers workspace pour agents

À chaque save, le backend crée `AI/WORKSPACE/<slug>` pour chaque nœud **agent** (pas LLM). Renommage de l'agent → popup de confirmation avec les chemins source/destination → `fs.renameSync` côté backend si confirmé.

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

## Topbar principale alignée

La topbar de `/` a été alignée visuellement avec le workspace : hauteur 72px, badge LD, sous-titre dynamique depuis `cfg.title`, boutons ghost-button (bordure, 34px, font 700), ordre : Workspace | Blueprint | Word Cloud | Diagram | AI Context | Files | Admin | dark toggle | Search.

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

### CONS
- `app.js` reste un artefact commité (pas de bundler frontend dédié).
- Le rendu HTML-in-Canvas reste dépendant d'une API expérimentale.
- La boucle agentique ne streame pas les réponses intermédiaires.
