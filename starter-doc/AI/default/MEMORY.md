---
type: Technical Doc
title: MEMORY
---

# Memory Index

Always store project memory in the current project's `memory/` folder.

Do not write project memory to a tool-specific global folder, for example `~/.claude`.

## Recommended Memory Files

List the memory files that are actually useful to this project, for example:

```text
memory/project-overview.md
memory/architecture.md
memory/testing.md
memory/domain-language.md
```

## Usage Rule

Memory is for stable, frequently reused context.

Durable decisions should be written as ADRs under `DOCS_FOLDER/ADRS/`.

Update this file when memory files are added, renamed, or removed.
