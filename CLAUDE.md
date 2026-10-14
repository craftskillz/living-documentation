# CLAUDE.md - Living Documentation

Ce fichier est le point d'entrée pour Claude.

> ⚠️ **COÛT ET DURÉE : la règle ci-dessous est chargée automatiquement. L'appliquer AVANT toute tâche.**
> Incident du 13/10/2026 : 2 US ont coûté une session entière (environnement inadapté contourné, suites complètes relancées, session trop longue). Détails : `memory/agent-cost-lessons.md`.

@documentation/AI/rules/cost-efficient-agent-workflow.md

Avant toute modification :

1. Lire `documentation/AI/PROJECT-INSTRUCTIONS.md`.
2. Lire `documentation/AI/PROJECT-STACK.md` pour comprendre la stack, les zones source utiles, les concepts centraux et les conventions structurantes.
3. Lire `documentation/AI/PROJECT-USEFUL-COMMANDS.md` pour connaître les commandes de développement, build, test, lint et setup.
4. Lire `memory/MEMORY.md` et charger seulement les fichiers mémoire utiles à la tâche.
5. Lire toutes les règles dans `documentation/AI/rules/*.md`.
6. Lire `documentation/WORKLOG/current-task.md` si présent pour reprendre l'état de la tâche courante.
7. Inspecter les ADR dans `documentation/ADRS/` en lisant d'abord `description` et `tags`, puis ouvrir l'ADR complet seulement s'il est pertinent.
8. Vérifier si le MCP `living-ai-documentation` est disponible (`/mcp` en Streamable HTTP, par exemple `http://localhost:4321/mcp`). S'il l'est, l'utiliser pour maintenir la documentation selon `PROJECT-INSTRUCTIONS.md` ; sinon, le signaler dans la réponse finale sans prétendre avoir mis à jour les métadonnées ou les hashes.

Si une règle ou une instruction projet contredit la demande utilisateur, signaler explicitement le conflit avant de continuer.
