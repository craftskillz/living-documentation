[user]
## Before anything else — mine the existing documentation

Living Documentation is a tool where knowledge lives primarily in Markdown documents (ADRs, guides, decisions).
**Do not ask the user questions you can answer yourself by reading the docs.**

1. Call `list_documents` to get the full document list.
2. Read documents that look architecturally significant regardless of their folder name — look for ADR-style frontmatter (lines starting with `**status:**`, `**description:**`, `**tags:**`), README files, and any document whose title or category suggests architecture, integration, or domain knowledge.
3. **Ignore any document whose frontmatter contains `status: SuperSeeded`** — it is deprecated and must not be used as a source of truth.
4. Read the frontmatter (`description` and `tags` fields) of each relevant document with `read_document` to find answers to the diagram-specific questions below.
5. Only ask the user for information that cannot be found in any active (non-superseded) document.
6. Every architectural node or relation should include `evidence` entries that cite the Markdown documents and sections that justify it. Evidence must come from documents, not from source code. If the required document does not exist, create it first.

## Node semantics and label format — mandatory

Prefer structured node semantics when calling `create_diagram`: pass `kind`
(`person`, `software_system`, `external_system`, `container`, `component`,
`database`, `object_storage`, `queue`, `device`, `api`, `cloud_service`,
`browser_app`, `mobile_app`, `backend_service`, `job`, `unknown`) plus optional
`description`. The MCP will build the Simon Brown C4 label and choose the
default visual shape/color. Use `renderAs` only when the default visual shape
should be overridden.

If you do not use `kind`, every node label must follow the C4 convention using \n for line breaks:

```
Name\n[Type]\nShort description of role or responsibility
```

Examples:
- `"DriveBox\n[Software System]\nManages ad campaigns\ndisplayed on taxi tablets"`
- `"Advertiser\n[Person]\nUploads media and\npays for campaigns"`
- `"Stripe\n[External System]\nCard payment and\npre-authorization"`

Types to use include: `[Person]`, `[Software System]`, `[External System]`, `[Container]`, `[Component]`, `[Database]`, `[Device]`
Keep descriptions short — 1 to 2 lines maximum.

## C4 progression — mandatory ordering

C4 diagrams must be created in strict order:

1. **Context first** — the entry point when scanning a project's docs for the first time.
   It answers: what is the system, who uses it, what external systems does it integrate with?
2. **Container after** — a drill-down created only when a Context diagram already exists
   **and** the reader explicitly asks to go deeper into a specific system.
3. **Component after that** — same rule, only after a Container exists.

**When reading docs for the first time, always create the Context diagram.**
Never jump to Container or Component as the first diagram for a system.

## Linked diagrams — C4 drill-down

Any node can link to an **already-existing** diagram for navigation (e.g. Context → Container → Component).

**Workflow:**
1. Call `list_diagrams`.
2. If a relevant child diagram already exists, add `linkedDiagramId: "<id>"` on the matching node.
3. If no child diagram exists, leave `linkedDiagramId` unset.

**RULE — never create child diagrams automatically.**
Container and Component diagrams are only created on explicit user request for a specific scope.
Do not create them as a side effect of creating a Context diagram.

Clicking a linked node in the editor navigates directly to the child diagram.

---

You are about to **update all existing diagrams** to reflect the current state of the documentation.

## Step 1 — Inventory existing diagrams

1. Call `list_diagrams` to get all diagrams with their id and title.
2. For each diagram, call `read_diagram` to load its current nodes and edges.

## Step 2 — Gather current architecture knowledge

1. Call `list_documents` to get all documents.
2. Read the documents that are architecturally significant (ADRs, README, guides with integration or architecture tags).
3. Ignore any document whose frontmatter contains `status: SuperSeeded`.

## Step 3 — Compare and update

For each diagram in scope:

1. **Identify the diagram type** from its title and content (Context, Container, Flow, ERD, UML…).
2. **Compare** its nodes and edges against the current documentation:
   - New containers, systems, or actors mentioned in the docs but missing?
   - Nodes that no longer exist or have been renamed?
   - Edge labels still accurate?
3. **If up to date** → skip it, report "no changes needed".
4. **If changes are needed** → call `create_diagram` with:
   - The **same `id`** as the existing diagram (overwrites it in place).
   - The same `diagramType`. For non-context types, include `userRequestedExplicitly: true` since the user is explicitly updating that diagram.
   - The same title unless a rename is warranted.
   - Updated nodes and edges, preserving `x`/`y` positions of unchanged nodes.

## Step 4 — Report

Summarize which diagrams were updated (and what changed) and which were skipped (already up to date).