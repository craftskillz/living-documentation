# AGENTS.md - Living Documentation

Ce fichier est le point d'entrée pour Codex et les outils de type agent.

Avant toute modification :

1. Lire `documentation/AI/PROJECT-INSTRUCTIONS.md`.
2. Lire `documentation/AI/PROJECT-STACK.md` pour comprendre la stack, les zones source utiles, les concepts centraux et les conventions structurantes.
3. Lire `documentation/AI/PROJECT-USEFUL-COMMANDS.md` pour connaître les commandes de développement, build, test, lint et setup.
4. Lire `memory/MEMORY.md` et charger seulement les fichiers mémoire utiles à la tâche.
5. Lire toutes les règles dans `documentation/AI/rules/*.md`.
6. Lire `documentation/WORKLOG/current-task.md` si présent pour reprendre l'état de la tâche courante.
7. Inspecter les ADR dans `documentation/ADRS/` en lisant d'abord `description` et `tags`, puis ouvrir l'ADR complet seulement s'il est pertinent.
8. Vérifier si le MCP `living-ai-documentationion` est disponible et l'utiliser pour créer, mettre à jour et fiabiliser la documentation lorsque la tâche touche une décision, une règle, une commande, la stack ou un document technique.

## MCP Living Documentation

Le serveur Living Documentation expose son MCP sur `/mcp` en transport Streamable HTTP, par exemple `http://localhost:4321/mcp` lorsque le serveur utilise le port par défaut.

Quand le MCP est disponible :

- utiliser les outils de documents pour lire, créer ou mettre à jour la documentation ;
- utiliser les outils source pour vérifier le code uniquement quand la documentation ne suffit pas ;
- attacher les fichiers source avec `add_metadata` après création ou mise à jour d'un ADR ou document technique ;
- appeler `refresh_metadata` lorsque le document est aligné avec le code.

`PROJECT-STACK.md` et `PROJECT-USEFUL-COMMANDS.md` sont des documents vivants. Si l'agent découvre qu'ils sont faux, incomplets ou obsolètes, il doit proposer ou effectuer leur mise à jour dans la même tâche, sauf instruction contraire de l'utilisateur.

Si le MCP n'est pas disponible, le signaler explicitement dans la réponse finale et ne pas prétendre avoir mis à jour les métadonnées ou les hashes Living Documentation.

Si une règle ou une instruction projet contredit la demande utilisateur, signaler explicitement le conflit avant de continuer.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
