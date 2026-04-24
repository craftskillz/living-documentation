---
name: memory files location preference
description: User prefers memory files stored in the project directory, not in ~/.claude
type: feedback
---

Toujours stocker les fichiers mémoire dans le dossier `memory/` du projet courant, pas dans `~/.claude`.

**Why:** L'utilisateur préfère avoir tout le contexte dans le projet lui-même pour plus de visibilité et de contrôle.

**How to apply:** Écrire les fichiers mémoire dans `<project_root>/memory/` au lieu de `~/.claude/projects/.../memory/`. Mettre à jour `memory/MEMORY.md` en conséquence.
