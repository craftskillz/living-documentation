# Memory Index

Toujours stocker les fichiers mémoire dans le dossier `memory/` du projet courant, pas dans `~/.claude`.

**Why:** L'utilisateur préfère avoir tout le contexte dans le projet lui-même pour plus de visibilité et de contrôle.

**How to apply:** Écrire les fichiers mémoire dans `<project_root>/memory/` au lieu de `~/.claude/projects/.../memory/`. Mettre à jour `memory/MEMORY.md` en conséquence.


- [living-documentation project overview](project_overview.md) — CLI tool serving Markdown docs via Express; architecture, build, filename pattern, config, frontend conventions
- [MCP create_diagram — conventions et fixes](project_mcp_diagrams.md) — Layout C4 validé, fix database height, edgeLabelWidth=80, feature linkedDiagramId drill-down
