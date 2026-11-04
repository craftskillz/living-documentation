---
type: Document
title: Using Living Documentation well
description: Usage guide shared by users and AI agents, covering the file model, writing conventions, working with or without MCP, and the pitfalls to avoid.
tags:
  - guide
  - usage
  - ai-agents
  - mcp
  - okf
  - frontmatter
  - git
  - cli
timestamp: 2026-11-04T12:00:00Z
status: Draft
---

# Using Living Documentation well

This guide has two readers: the person using the application and the AI agent working in a documentation folder. The first three parts are shared, then each reader has their own part.

For an agent, the reference remains what the server exposes live: `GET /mcp` and `get_server_guide`.

## The idea in three points

- **Your documents are local Markdown files.** There is no database: a text editor and Git are enough to read them.
- **The document is the source of truth.** A diagram is a derived view and adds nothing that the documents do not contain.
- **Documentation can be checked.** A document bound to its source files signals when those files have changed.

## Getting started

Node.js 20.19 or later is required.

```bash
npx living-ai-documentation@latest                       # detects a nearby project or creates a starter
npx living-ai-documentation@latest ./docs                # serves an existing folder
npx living-ai-documentation@latest ./docs --port 4000 --open
```

The folder must be a **relative path**: absolute paths and `~` are rejected. Once started, the application answers on `http://localhost:4321`, the admin panel on `/admin` and the MCP server on `/mcp`.

## The file model

```text
docs/
├── .living-doc.json     project configuration
├── index.md             generated listing, reserved
├── log.md               generated changelog, reserved
├── liv-doc-main.md      folder manifest: order and hidden items
├── images/              images, served on /images
├── files/               attachments, served on /files
├── my-document.md       a document
└── PROCESSES/
    ├── liv-doc-main.md
    └── another-document.md
```

| File | Role | By hand? |
| --- | --- | --- |
| `*.md` | A document | Yes |
| `liv-doc-main.md` | `order` lists items to show first; `hidden` hides them in the explorer without blocking access by link or MCP | Yes, or by drag and drop |
| `.living-doc.json` | Theme, language, port, `sourceRoot`, Git… | Prefer the Admin screen |
| `index.md` | Lists the folder's documents and sub-folders | No: generated |
| `log.md` | Changelog | No: generated |

`index.md`, `log.md` and `liv-doc-main.md` are reserved: they never appear as documents.

The filename is only an identifier. **The title and date come from the frontmatter.** A new document takes the slug of its title: `My guide` becomes `my-guide.md`, then `my-guide-2.md` on collision. Older dated filenames remain valid.

## Writing a document

### The frontmatter

Each document starts with a YAML block:

```markdown
---
type: Document
title: A readable title
description: One sentence summarising the document.
tags:
  - a-topic
  - another-topic
timestamp: 2026-11-04T12:00:00Z
status: Draft
---
```

| Field | Status for `validate` |
| --- | --- |
| `type` | Required. Known values: `Document`, `ADR`, `Worklog`, `Rule`, `Technical Doc`, `Concept`. Any other value gives a warning. |
| `title` | Required |
| `timestamp` | Recommended, in ISO 8601 format. Missing: warning. Malformed: error. |
| `sources` | Optional. When present, each entry needs `path` and `hash`. |
| `description`, `tags`, `status`, `language` | Optional, but `description` and `tags` help find the document |
| `html_template` | Optional. Identifier of the HTML presentation template, written by the application when you choose one. |

Saving through the application or MCP normalizes this block. `type`, `title` and `timestamp` are filled in when missing, so the file may change slightly: this is not an error.

### Links

| Target | Syntax |
| --- | --- |
| Another document | `[Label](?doc=<doubly encoded id>)`; an agent copies the `linkHref` field returned by the MCP |
| Heading in the same document | `[Label](#heading-slug)` |
| Diagram | `[Label](/diagram?id=<diagram id>)` |
| Attachment | `[name](./files/<file>)` |

### Images and layout

Standard Markdown works as is. Comments placed just before an element control how it is displayed:

```markdown
<!-- image-width: 1/2 -->
<!-- image-align: center -->
![Architecture diagram](./images/diagram.png)
```

Widths: `full`, `3/4`, `2/3`, `1/2`, `1/3`, `1/4`. Alignments: `left`, `center`, `right`. Code and Mermaid blocks have their equivalents: `code-width`, `code-align`, `mermaid-width`, `mermaid-align`.

## For users

| I want to… | Where to go |
| --- | --- |
| Read, create, edit, search | <kbd>Home</kbd>: inline editing, snippets, tables, pasted images, annotations |
| Organize my documents | The <kbd>Home</kbd> explorer, by drag and drop; links to moved items are rewritten |
| Draw a diagram | <kbd>Diagram</kbd> |
| Find an attachment | <kbd>Files</kbd> |
| Configure an LLM and agents | <kbd>Workspace</kbd>, then <kbd>Agents</kbd> to run them from any page |
| Check what my agents see | <kbd>AI Context</kbd>: rules, memory, MCP explorer |
| Set up Git, theme, language | <kbd>Admin</kbd> |
| Go back in time | <kbd>Versions</kbd> on a document: diff and block-level restore |
| Present a document in a polished page | <kbd>Generate as HTML</kbd> on a document to choose a template, then <kbd>View as HTML</kbd>. The page is rendered on demand from the Markdown; no HTML file is written. |

To connect an external agent, add the MCP server. For example, with Claude Code:

```bash
claude mcp add --transport http living-ai-documentation http://localhost:4321/mcp
```

## For AI agents

### Choosing how to work

```text
Is the living-ai-documentation MCP available?
├── Yes → go through the MCP, never write the files directly
└── No  → write the files by hand, and tell the user
```

### With the MCP

1. Call `get_server_guide` if the server does not pass on its instructions.
2. Call `list_documents`, then `read_document`, before creating anything.
3. Create with `create_document`. It never overwrites: a name collision gives a `-2` suffix.
4. Modify with `update_document`, which **replaces the whole content**: send the complete document. The name and folder do not change.
5. For a document describing code: `add_metadata` on the source files that prove it, then `refresh_metadata` after each correction.

| Need | Tools |
| --- | --- |
| Read the project's code | `list_source_files`, `read_source_file`, `search_source`, after the documentation |
| Get the working state in one call | `build_context` |
| Detect drift | `get_accuracy`, `review_adr_relevance`, `list_adrs_below_accuracy` |
| Make a diagram | `list_diagrams` and reading the documents, then `create_diagram` |
| Generate an image | `generate_image` |

Three rules apply:

- **Different folder.** If the user points to a folder that does not match this MCP workspace, ask whether the mismatch is intentional. Do not silently change strategy.
- **ADR status.** Create at `To be validated`. Only the human moves it to `Accepted`. A replaced ADR moves to `SuperSeeded` and is never deleted.
- **Diagrams.** Never invent an actor or relationship absent from the documents. Any diagram other than a context diagram requires an explicit request from the user.

The project's instructions (`AGENTS.md`, `CLAUDE.md`, `AI/PROJECT-INSTRUCTIONS.md`, `AI/rules/`) take precedence over this guide when they exist.

### Without the MCP

1. Write the full frontmatter described above, in YAML, never in the `**key:** value` form.
2. Name the file with the slug of its title.
3. Do not edit `index.md` or `log.md`.
4. Check with `validate`, which writes nothing.
5. **Tell the user** that metadata and hashes were not updated, and list the source files to attach.

## Pitfalls to know

| Pitfall | What happens | What to do |
| --- | --- | --- |
| Automatic commits | When Git integration is enabled, a write from the application or through an MCP write tool can create a commit on the current branch. Pushing depends on `pushMode`. | Check `gitIntegration` before writing. Be careful with confidential content if the repository is pushed. |
| `migrate` reaching too far | It walks every `.md` in the folder. If the documentation folder also holds code or other sources, their frontmatter is rewritten and `index.md` files are added there. | Always run `migrate <folder> --dry-run` first. |
| `validate` failing | `validate` compares each `index.md` to what the generator would produce. A hand-edited index or a new sub-folder makes it fail. | Fix it with `migrate`, after the `--dry-run`, not by hand. |
| Absolute path | The CLI rejects absolute paths, including for `validate` and `migrate`. | Move to the parent folder and pass a relative path. |
| Never-migrated folder | The server does not open it as is: a migration is required. | Preview with `--dry-run`, then migrate. |
| `hidden` is not protection | A hidden item stays reachable by link and through the MCP. | Do not use it to protect sensitive content. |

## Command reference

| Command | Effect |
| --- | --- |
| `living-ai-documentation <folder>` | Serves the folder; `--port`, `--open` |
| `living-ai-documentation validate <folder>` | Checks the folder without writing anything; exits with an error on any violation |
| `living-ai-documentation migrate <folder> --dry-run` | Reports what the migration would change, without writing anything |
| `living-ai-documentation migrate <folder>` | Converts the frontmatter and folder prefixes, regenerates the `index.md` files |
| `living-ai-documentation import <source> <folder>` | Imports an external OKF bundle into the project, under `IMPORTED/<bundle>` |
