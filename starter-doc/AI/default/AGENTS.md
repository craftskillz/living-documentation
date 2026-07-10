---
type: Technical Doc
title: AGENTS
---

# AGENTS.md - Living Documentation

This file is the entry point for Codex and agent-style tools.

Before making changes:

1. Read `DOCS_FOLDER/AI/PROJECT-INSTRUCTIONS.md`.
2. Read `DOCS_FOLDER/AI/PROJECT-STACK.md` to understand the stack, useful source areas, core concepts, and structural conventions.
3. Read `DOCS_FOLDER/AI/PROJECT-USEFUL-COMMANDS.md` to know the development, build, test, lint, and setup commands.
4. Read `memory/MEMORY.md` and load only useful memory files.
5. Read rules in `DOCS_FOLDER/AI/rules/*.md`.
6. Read `DOCS_FOLDER/WORKLOG/current-task.md` if present to resume the state of the current task, and `DOCS_FOLDER/WORKLOG/ROADMAP.md` if present to know which ticket to pick up next.
7. Inspect ADRs in `DOCS_FOLDER/ADRS/` by reading `description` and `tags` first, then open the full ADR only when relevant.
8. Check whether the `living-ai-documentation` MCP is available and use it to create, update, and keep documentation reliable when the task touches a decision, rule, command, stack, or technical document.

## Living Documentation MCP

The Living Documentation server exposes its MCP on `/mcp` with Streamable HTTP transport, for example `http://localhost:4321/mcp` when the server uses the default port.

When the MCP is available:

- use document tools to read, create, or update documentation;
- use source tools to inspect code only when documentation is not enough;
- attach source files with `add_metadata` after creating or updating an ADR or technical document;
- call `refresh_metadata` once the document is aligned with the code.

`PROJECT-STACK.md` and `PROJECT-USEFUL-COMMANDS.md` are living documents. If the agent discovers that they are wrong, incomplete, or obsolete, it should propose or perform their update in the same task unless the user says otherwise.

If the MCP is not available, state that explicitly in the final response and do not claim that Living Documentation metadata or hashes were updated.

If a rule or project instruction conflicts with the user request, state the conflict explicitly before proceeding.
