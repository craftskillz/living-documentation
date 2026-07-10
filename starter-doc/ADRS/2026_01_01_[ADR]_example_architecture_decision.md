---
type: ADR
title: Example Architecture Decision
description: Example ADR template showing how to record a project decision with enough context, consequences, and tags for an AI assistant to discover and reuse it later.
tags:
  - adr
  - template
  - architecture-decision
  - ai-context
  - documentation
timestamp: 2026-01-01T00:00:00Z
status: Example
---

# Example Architecture Decision

## Context

Replace this section with the situation that led to the decision.

Explain the problem in concrete terms:

- what was hard to understand, maintain, scale, test, or operate;
- which existing constraints mattered;
- which alternatives were considered;
- which user or developer workflow was affected.

An ADR should capture the reason behind the change, not only the final code shape. This is what makes it useful later for humans and for AI assistants that need to understand why the project works this way.

## Decision

Replace this section with the decision that was made.

Be specific enough that another developer or AI assistant can apply the same rule later. Mention the files, modules, data contracts, commands, or conventions that carry the decision when they are relevant.

Example:

- store project-level AI instructions in `AI/PROJECT-INSTRUCTIONS.md`;
- document the stack and commands in `AI/PROJECT-STACK.md` and `AI/PROJECT-USEFUL-COMMANDS.md`;
- expose tool-specific entry points through `AGENTS.md` and `CLAUDE.md`;
- keep reusable AI rules in `AI/rules/*.md`;
- use symbolic links when a document must appear in Living Documentation without duplicating the source of truth.

## Consequences

### PROS

- The decision is discoverable from the documentation, not only from code.
- AI assistants can read the ADR frontmatter first, then load the full ADR only when it matches the current task.
- Future changes can preserve the original intent instead of re-discovering it from implementation details.

### CONS

- The ADR must be maintained when the decision changes.
- A vague ADR is worse than no ADR because it gives future readers false confidence.
- If the same rule is repeated in too many places, the project can drift. Prefer one source of truth and link to it.

## Follow-up

When turning this example into a real ADR:

- rename the file with the actual date, category, and decision title;
- set `status` to `To be validated`, `Accepted`, `SuperSeeded`, `Partially SuperSeeded`, or the status convention used by the project;
- replace `description` with a one-sentence summary that is useful during ADR discovery;
- replace `tags` with searchable themes;
- remove this follow-up section if it is no longer useful.
