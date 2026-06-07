[user]

## Before anything else , mine the existing documentation

Living Documentation is a tool where knowledge lives primarily in Markdown documents (ADRs, guides, decisions).
**Do not ask the user questions you can answer yourself by reading the docs.**

1. Call `list_documents` to get the full document list.
2. Read documents that look architecturally significant regardless of their folder name , look for ADR-style frontmatter (lines starting with `**status:**`, `**description:**`, `**tags:**`), README files, and any document whose title or category suggests architecture, integration, or domain knowledge.
3. **Ignore any document whose frontmatter contains `status: SuperSeeded`** , it is deprecated and must not be used as a source of truth.
4. Read the frontmatter (`description` and `tags` fields) of each relevant document with `read_document` to find answers to the diagram-specific questions below.
5. Only ask the user for information that cannot be found in any active (non-superseded) document.
6. Every architectural node or relation should include `evidence` entries that cite the Markdown documents and sections that justify it. Evidence must come from documents, not from source code. If the required document does not exist, create it first.

## Node semantics and label format , mandatory

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
Keep descriptions short , 1 to 2 lines maximum.

## C4 progression , mandatory ordering

C4 diagrams must be created in strict order:

1. **Context first** , the entry point when scanning a project's docs for the first time.
   It answers: what is the system, who uses it, what external systems does it integrate with?
2. **Container after** , a drill-down created only when a Context diagram already exists
   **and** the reader explicitly asks to go deeper into a specific system.
3. **Component after that** , same rule, only after a Container exists.

**When reading docs for the first time, always create the Context diagram.**
Never jump to Container or Component as the first diagram for a system.

## Linked diagrams , C4 drill-down

Any node can link to an **already-existing** diagram for navigation (e.g. Context → Container → Component).

**Workflow:**

1. Call `list_diagrams`.
2. If a relevant child diagram already exists, add `linkedDiagramId: "<id>"` on the matching node.
3. If no child diagram exists, leave `linkedDiagramId` unset.

**RULE , never create child diagrams automatically.**
Container and Component diagrams are only created on explicit user request for a specific scope.
Do not create them as a side effect of creating a Context diagram.

Clicking a linked node in the editor navigates directly to the child diagram.

---

You are about to create an **Entity-Relationship Diagram**.

## Step 1 , Answer these questions first (ask the user only if not found in docs)

1. **Domain** , What domain or bounded context does this ERD cover?
2. **Entities** , What are the main entities (tables, aggregates)?
3. **Relationships** , What are the relationships between them and their cardinalities (1:1, 1:N, N:M)?
4. **Key attributes** , Are there important attributes worth labeling on the edges?

## Step 2 , Build the diagram

### Layout rules (grid = 40 units)

- Each entity is a box. Place them so related entities are close together.
- Suggested starting positions for up to 6 entities:
  - top-left: x: -320, y: -200
  - top-center: x: 0, y: -200
  - top-right: x: 320, y: -200
  - bottom-left: x: -320, y: 200
  - bottom-center: x: 0, y: 200
  - bottom-right: x: 320, y: 200
- All positions must be multiples of 40.
- Color: c-blue for main entities, c-green for junction/pivot tables, c-slate for lookup/reference tables.

### Edge rules

- Label every edge with the cardinality and nature of the relationship:
  "1:N", "N:M", "has many", "belongs to", "references", etc.
- Edges are undirected by convention in ERDs , leave `label` descriptive.

## Step 3 , Call `create_diagram` with `diagramType: "erd"`.
