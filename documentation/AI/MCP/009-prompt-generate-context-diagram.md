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

You are about to create a **C4 System Context Diagram** following Simon Brown's C4 model.

## Step 1 — Answer these three questions first (ask the user only if not found in docs)

1. **Scope** — What is the software system we are describing? What is its name and primary responsibility?
2. **Users** — Who uses it? For each type of user: what are they doing with the system?
3. **Integrations** — What external systems does it need to integrate with? What data or interactions flow between them?

Do not proceed to the diagram until you have clear answers to all three.

## Step 2 — Build the diagram

### Layout rules (grid = 40 units, physics is disabled — positions are final)
- **Main system** → center: x: 0, y: 0. Type: box. Color: c-blue.
- **Human users (actors)** → left: x: -320, y: 0. Spread vertically by ±160 if several. Type: actor. Color: c-gray.
- **External systems** → right: x: 320, y: 0. Spread vertically by ±160 if several. Type: box. Color: c-slate.
- **External databases / datastores** → below: x: 0, y: 240. Type: database. Color: c-teal.
- All positions must be multiples of 40.
- Keep the diagram under ~10 nodes total.

### Edge rules
- Direction: actor → system, system → external system, system → datastore.
- Every edge must have a label describing the interaction in plain language (e.g. "submits orders", "reads customer data", "sends notifications via").

### Color palette
| Element | Color |
|---|---|
| Main system | c-blue |
| Human actor | c-gray |
| External system | c-slate |
| Datastore | c-teal |

## Step 3 — Call `create_diagram` with `diagramType: "context"`.