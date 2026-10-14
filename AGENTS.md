# AGENTS.md - Living Documentation

Ce fichier est le point d'entrée pour Codex et les outils de type agent.

> ⚠️ **COÛT ET DURÉE — à appliquer AVANT toute tâche** (règle complète : `documentation/AI/rules/cost-efficient-agent-workflow.md`, incident : `memory/agent-cost-lessons.md`) :
> 1. Vérifier l'environnement d'abord (build, lint, un test Playwright). En cas d'échec d'environnement, s'arrêter et le signaler, sans contournement.
> 2. Tests ciblés pendant la boucle TDD ; suites complètes une seule fois en fin d'US ; pas de mutation testing sauf demande.
> 3. Une US par session.
> 4. Lire des extraits ciblés, filtrer les sorties.
> 5. Plus de 3 tentatives ou un contournement : s'arrêter et demander.

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
