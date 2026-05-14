# PROJECT-INSTRUCTIONS - Living Documentation

This file is the shared working contract for AI assistants working on this project. It explains how to integrate Living Documentation into the AI-assisted development workflow.

`AGENTS.md` and `CLAUDE.md` are tool-specific entry points. They should stay short and point to this file, which carries the common rules.

## Startup Routine

Before changing the project:

1. Read `AGENTS.md` or `CLAUDE.md`, depending on the tool.
2. Read this file: `DOCS_FOLDER/AI/PROJECT-INSTRUCTIONS.md`.
3. Read `DOCS_FOLDER/AI/PROJECT-STACK.md` to understand the stack, useful source tree, core concepts, and structural conventions.
4. Read `DOCS_FOLDER/AI/PROJECT-USEFUL-COMMANDS.md` to know the development, build, test, lint, and setup commands.
5. Read `memory/MEMORY.md` and load only the memory files relevant to the task.
6. Read every rule in `DOCS_FOLDER/AI/rules/*.md`.
7. Read `DOCS_FOLDER/WORKLOG/current-task.md` if present to resume the state of the current task.
8. Inspect existing ADRs: list `DOCS_FOLDER/ADRS/`, read only `description` and `tags` first, then open the full ADR only when relevant.
9. Check whether the Living Documentation MCP server is available before creating or modifying documentation.

## Living Documentation MCP

The Living Documentation MCP is the preferred channel for reading, creating, and maintaining project documentation. When it is available, the AI must use it instead of editing Markdown files by hand.

Use in particular:

- `list_documents` to discover existing documents;
- `read_document` to read a document source;
- `create_document` or `update_document` to create or correct a document;
- `list_source_files`, `read_source_file`, and `search_source` to connect documentation to code;
- `add_metadata` to attach a document to the source files that prove it;
- `refresh_metadata` to recalculate hashes after updates;
- `get_accuracy` or equivalent tools to detect drift between documentation and code.

If the MCP is not available, the AI may propose documentation changes, but it must explicitly state that metadata and hashes could not be updated.

## Continuous Documentation

Documentation is not a separate step to do later. It is part of the normal AI-assisted development workflow.

At the end of every coherent feature, meaningful refactor, behavioral change, or durable decision, the AI must decide whether documentation should be updated.

Create or update a document when the change:

- modifies an architecture boundary;
- introduces or changes a public contract;
- changes a storage format, protocol, or workflow;
- adds a convention future changes must follow;
- makes an existing document incomplete, ambiguous, or wrong;
- resolves a trade-off that would be hard to infer from code alone.

Do not create durable documentation for trivial fixes, mechanical renames, or formatting-only changes.

## Progress Tracking

The `DOCS_FOLDER/WORKLOG/` folder holds the operational state of in-progress tasks and the resume points between AI assistants. It does not replace ADRs.
The `DOCS_FOLDER/WORKLOG/` folder contains three complementary kinds of files; none of them replaces the durable ADRs that live under `DOCS_FOLDER/ADRS/`.

### 1. `DOCS_FOLDER/WORKLOG/current-task.md` — shared resume point

Every assistant must read it before resuming a task and update it before handing over when it has started, finished, interrupted, or left a known follow-up.

The worklog must stay factual and useful for the next agent:

- current status;
- task in progress;
- in-scope and out-of-scope items if needed;
- files or areas concerned;
- verifications performed;
- remaining verifications;
- next recommended action.

### 2. `DOCS_FOLDER/WORKLOG/ROADMAP.md` — ticket backlog

Ordered list of tickets needed to ship the product (or a major milestone). Format close to an ADR: frontmatter (`date`, `status`, `description`, `tags`) + Markdown body.

The starter ships an example roadmap — the user must replace it with the project's real tickets.

When a ticket is done, the agent:

1. checks and strikes through the ticket's line in `ROADMAP.md`;
2. creates a dedicated document under `DOCS_FOLDER/WORKLOG/` recording the realization (see section 3).

Checking convention inside the "Recommended order" section:

- `[ ]` or `[]` — ticket not started;
- `[x] ~~Ticket XX - ...~~` — ticket done, struck through for quick scanning.

### 3. `DOCS_FOLDER/WORKLOG/YYYY_MM_DD_HH_mm_[WORKLOG]_ticket_XX_<slug>.md` — per-ticket realization record

Every time a roadmap ticket is completed, create a dedicated document under `DOCS_FOLDER/WORKLOG/`. The format looks like an ADR (same frontmatter) but the **semantics differ**:

- ADRs (`DOCS_FOLDER/ADRS/`) document the project's **durable decisions**: architecture, public contracts, structural conventions. They describe the **WHAT** and the **WHY**.
- per-ticket WORKLOG documents record the **realization** of a roadmap ticket: what was done, what choices were made during execution, what verifications were run. They describe **WHAT THE AGENT DID** for that specific ticket.

If a durable choice is made during a ticket (for example, picking a folder-structure convention), create an architectural ADR under `DOCS_FOLDER/ADRS/` and point the WORKLOG document to that ADR — do not duplicate the reasoning.

Recommended frontmatter for a per-ticket WORKLOG document:

```markdown
---
**date:** YYYY-MM-DD
**status:** To Be Validated
**description:** One sentence summarizing what was done for this ticket.
**tags:** worklog, ticket, <domain slugs>
---
```

Recommended sections in the body:

- **Context** — short reminder of the ticket and its goal (one paragraph, link to `ROADMAP.md`);
- **Realization** — factual list of what was done;
- **Choices made** — technical decisions taken during the ticket. Point to an ADR if the decision is durable;
- **Verifications** — tests passed, manual validations;
- **Follow-ups** — points of attention for the next tickets;
- **Related documents** — link to `ROADMAP.md` and any ADR(s).

## ADRs

ADRs are the log of architecture and design decisions. They should stay short, traceable, and useful for deciding what to change later.

When a feature changes a durable decision:

1. Search for existing ADRs about the same topic.
2. If an ADR remains valid, complete or correct it.
3. If an ADR is replaced, mark it with the exact status `SuperSeeded` or `Partially SuperSeeded` and create a new ADR explaining the new decision.
4. Never delete a replaced ADR: the history is useful.
5. In the new ADR, explicitly mention the replaced ADR and why it is no longer enough.

The recommended initial status for an AI-created ADR is `To be validated`. A human can later validate it and change it to `Accepted`.

Each ADR should include frontmatter useful for discovery:

```markdown
---
**date:** YYYY-MM-DD
**status:** To be validated
**description:** One sentence summarizing the decision and why it matters.
**tags:** architecture, mcp, metadata
---
```

## Metadata And Reliability Gauge

A Living Documentation document should be linked to the source files that prove what it says. These links are stored as metadata and allow the document reliability score to be calculated.

When the AI creates or updates an ADR or technical document:

1. Identify the source files that are actually involved.
2. Attach those files to the document with `add_metadata`.
3. Avoid attaching overly generic files when a more precise file proves the content better.
4. After correcting the document, call `refresh_metadata` to recalculate hashes.
5. If a document remains correct after a cosmetic code change, use `refresh_metadata` to re-baseline the hash without rewriting the document unnecessarily.

Metadata is not optional for documents that describe code. If metadata cannot be updated, the AI must say so in its final response and list the files that should be attached.

## Project Stack And Commands

`DOCS_FOLDER/AI/PROJECT-STACK.md` contains the operational project summary: technical stack, important source areas, core concepts, and structural conventions.

`DOCS_FOLDER/AI/PROJECT-USEFUL-COMMANDS.md` contains commands that are actually useful: installation, local development, build, tests, lint, formatting, setup, and dangerous commands.

These two files are living documentation. The AI must propose updates when a task makes their content false, incomplete, or insufficiently precise.

Rules:

- keep these files short, concrete, and action-oriented;
- do not duplicate ADRs in them;
- point to ADRs when a durable explanation exists;
- verify that a command exists before documenting it;
- do not silently change a structural convention or dangerous command: explain the change and wait for validation when the risk is significant.

## AI Rules

Rules live in `DOCS_FOLDER/AI/rules/*.md`.

Each rule uses frontmatter:

- `id` - stable identifier;
- `title` - short human-readable name;
- `severity` - `guideline`, `warning`, or `required`;
- `description` - concise summary;
- `tags` - themes used for discovery;
- `appliesTo` - globs describing where the rule applies.

Apply every rule whose `appliesTo` patterns match files you touch. If a rule conflicts with the user request or another project instruction, state the conflict explicitly before proceeding.

## Memory

Memory files live in the project under `memory/`.

Do not store project memory in a tool-specific global folder if the user expects project-local memory. Update `memory/MEMORY.md` whenever memory files are added or removed.

Memory is for stable, frequently reused context. Durable decisions should instead be written as ADRs.

## Changing AI Instruction Files

The AI may propose changes to `AGENTS.md`, `CLAUDE.md`, `PROJECT-INSTRUCTIONS.md`, `PROJECT-STACK.md`, `PROJECT-USEFUL-COMMANDS.md`, `memory/MEMORY.md`, or rules in `AI/rules/`.

But these files directly steer AI assistant behavior. Before changing them, the AI must:

1. explain to the user what it wants to change;
2. explain why the change improves the workflow;
3. state any possible risks;
4. wait for explicit validation if the change may reduce visibility, remove a rule, weaken a constraint, or make the agent more autonomous.

No destructive change to these files should be made silently.

## Verification

Before finishing a task, run the smallest useful verification:

- build command if typed code or build files changed;
- focused tests if behavior changed;
- lint or formatting command if the project has one;
- MCP/documentation verification if ADRs or metadata were created or modified.

If a verification cannot be run, explain why.
