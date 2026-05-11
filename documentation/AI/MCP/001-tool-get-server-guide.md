# MCP tool: `get_server_guide`

## Description

Return the living-documentation server guide: purpose, mandatory workflow, scope rules (context vs container/UML), diagram conventions, node/edge format, and coordinate system. Call this first whenever you are unsure how to use the server.

## Schéma d'entrée

```json
{
  "type": "object",
  "properties": {}
}
```

## Requête effectuée

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_server_guide",
    "arguments": {}
  }
}
```

## Résultat

# Living Documentation — Server Guide

This server maintains a living documentation system composed of:
- **Documents** (Markdown) — the source of truth.
- **Diagrams** — visual derivations of documents.

## Document ↔ diagram contract
Documents are authoritative. Diagrams are derived views and must not introduce
information that is absent from the documents. If a diagram needs a concept
that isn't documented yet, create or update the document first.

## Cross-project documentation workspace convention
The configured documentation workspace and the source folder mentioned by the
user may intentionally differ. This is valid when the user wants to keep
analysis documents and diagrams in a new Living Documentation project instead
of writing into the source repository.

When a user points you to a folder or repository and it does not appear to
match this MCP's configured `sourceRoot` / document inventory, do **not**
silently switch strategy, do **not** write documents by hand into the pointed
repository, and do **not** assume the MCP is misconfigured. Ask the user to
confirm whether this mismatch is intentional.

If the user confirms the mismatch is intentional, keep using this MCP workspace
as the documentation target. First create the missing Markdown source-of-truth
documents in this MCP project (overview, actors, runtime containers, external
systems, data flows, key decisions, constraints) using `create_document`.
Only after those documents exist and have been read should you create diagrams
from them. Use source-code access only as research input for the documents; the
diagram evidence must cite Markdown documents from this MCP workspace.

## Feature workflow — ADRs are how the documentation grows
When a coding agent implements or modifies a feature on this project, the
feature is **not done** until an ADR (Architecture Decision Record) has been
created (or an existing one superseded) and bound to the source files it
covers. This is what keeps the documentation alive.

### Mandatory steps after finishing a feature
1. `list_documents` — get the inventory.
2. Shortlist ADRs whose title / category looks topically related to the
   feature, then `read_document` their frontmatter (`description`,
   `tags`) to confirm.
3. **Supersede check** — if an existing ADR is **made obsolete** by the new
   feature, use `update_document(id, ...)` to flip its `**status:**` to
   `SuperSeeded` and add a one-line pointer to the new ADR (do **not** call
   `create_document` — it does not overwrite and will reject a colliding
   filename).
4. `create_document` for the new ADR with the **mandatory frontmatter**
   below at `status: To be validated`.
5. `add_metadata` for **each source file** that materially carries the
   feature's logic — never god files (see `add_metadata`).

### Mandatory ADR frontmatter
Every ADR document body starts with:

```
---
**date:** YYYY-MM-DD
**status:** To be validated
**description:** One dense, technical sentence — what the decision does, not why.
**tags:** 5–10 specific tags mixing concepts, technologies, and key symbol names
---
```

Rules:
- `status:` is **always** `To be validated` at creation. Only the human
  owner promotes to `Accepted`. The status has **no effect** on how the LLM
  treats the ADR — only `SuperSeeded` is filtered downstream.
- `description:` stays factual and short — one sentence. The "why" goes in
  the body.
- `tags:` are the primary search signal. Mix library names (`stripe`,
  `amplify`), domain concepts (`workflow`, `moderation`), and symbol
  names (`useAdScheduler`, `presigned-url`).
- `category` argument: domain bucket in the filename pattern, uppercase,
  e.g. `SERVICES CLOUD`, `INTEGRATION`, `ALGORITHMES`.
- `folder` argument: `adrs` (or the project's ADR sub-folder).

## Markdown conventions for documents written via this MCP

Standard CommonMark + GitHub-flavored Markdown is supported as-is (lists, code
blocks, tables, blockquotes, `<details>/<summary>`, etc.). Use vanilla syntax
for those — there is no need to align table columns visually.

The viewer recognises four project-specific link patterns. Use them whenever
they apply, otherwise the cross-reference is invisible to the reader:

- **Cross-document link** — `[label](?doc=<doublyEncodedId>)`. The `id`
  returned by `list_documents` and `create_document` is **already** URL-encoded
  once (a doc in folder `adrs/` has id `adrs%2Ffoo`, not `adrs/foo`).
  To embed it in a query string you must encode it **again** — every `%`
  becomes `%25`, so `adrs%2Ffoo` becomes `adrs%252Ffoo` in the link href.
  **Operational rule (preferred — zero encoding to do)**: copy the
  `linkHref` field returned by `list_documents` and `create_document` and
  paste it verbatim between the parentheses. Worked example:
  `{ id: "adrs%2Ffoo", linkHref: "?doc=adrs%252Ffoo" }` →
  `[Foo ADR](?doc=adrs%252Ffoo)`. Append `#heading-slug` to the linkHref
  to jump to a specific heading inside the target doc.
- **Diagram link** (C4 drill-down or ADR → diagram pointer) —
  `[label](/diagram?id=<diagramId>)`.
- **File attachment** — `[name](./files/<filename>)` where `<filename>` is what
  `POST /api/files/upload` returned. The viewer auto-styles these as a purple
  pill with a paperclip glyph; do not add the glyph yourself.
- **In-doc anchor** — `[label](#heading-slug)` where `heading-slug` is the
  lowercased + dash-joined version of the heading text (auto-generated).

ASCII trees inside a fenced code block render with their box-drawing characters
preserved (`├──`, `└──`, `│ `). Prefer this over nested bullet lists when
describing a folder layout or a hierarchy in an ADR.

## Default diagram scope
- When documenting the project big picture, generate a **context diagram**.
- Do NOT generate container diagrams, component diagrams, or UML diagrams
  unless the user explicitly asks for them by name.
- If the user asks for "a diagram", "the big picture", or "documentation",
  produce a context diagram.

## Mandatory workflow before creating or updating any diagram
1. Call `list_documents` to see what exists.
2. Call `read_document` on the documents relevant to the requested diagram.
3. Call `list_diagrams` to check whether the diagram already exists
   (update rather than duplicate by passing its `id` back to `create_diagram`).
4. Only then call `create_diagram`, using node/edge content grounded in the
   documents you read.

Never invent actors, systems, or relationships that are not present in the
documents.

## Conventions by diagram type
### Context diagram (default)
- Central system as `box` (c-blue).
- Users / roles as `actor` (c-gray).
- External systems as `box` (c-slate).
- Persistence / datastores as `database` (c-teal).
- Keep to ~10 nodes maximum.

### Container diagram (explicit request only)
- Each deployable unit as `box`.
- Databases as `database`.
- Queues as `ellipse`.

### UML diagram (explicit request only)
- Follow the requested UML variant's conventions (class, sequence, state,
  activity, use-case …).

### Screen-guide diagram (explicit request only)
An annotated screenshot built in **three layers**. Source code is the reference
(not the Markdown docs) — use `read_source_file` / `search_source`.

**1. Background image** — one `image` node with the screenshot.
- `name: "screenshot"` (used as edge anchor; not displayed).
- `imageSrc`: URL returned by `POST /api/images/upload`.
- `width` / `height` = natural screenshot pixels. `locked: true`.

**2. Zone overlays** — one translucent `box` per major layout region
(left/right sidebar, top bar, main content, footer …).
- `bgOpacity: 0.15–0.20`, `locked: true`, empty label.
- `width` / `height` / `x` / `y` cover the zone on the screenshot.
- One distinct `color` per zone (e.g. c-red = left drawer, c-amber = top bar,
  c-cyan = main area). Typical count: **2–5 zones**.
- Each zone gets a **zone-label post-it** of the **same color**, placed inside
  or at the edge of the zone (1–3 words: "Top Bar", "Collapsible Drawer",
  "Main Page").

**3. Feature callouts** — one `post-it` per first-level feature, placed
**outside the screenshot** and linked to the UI element by a free-end arrow.
- First-level feature = visible without interaction + changes behavior
  significantly when used. Typical count: **4–10**.
- Label: 2–5 words, title-cased; multi-line allowed via `\n`.
- Color depends on kind:
  - **Interactive** (button, link, input, toggle) → `c-amber` or
    `c-orange` (yellow family). **Default.**
  - **Differentiating** (product-distinguishing feature) → a distinct
    non-yellow color (`c-purple`, `c-rose`, `c-red`, `c-sky`,
    `c-teal`, `c-green`). Reserve for the 1–3 hero features.

#### Free-end arrows — never anchor on the image node
Anchoring on the image makes every arrow converge to its centre. Use one of:
- **`anchor` node** (8×8, invisible at rest, visible on hover) placed on the
  target pixel inside the screenshot, with edge
  `{ from: "<post-it>", to: "<anchor name>" }`. **Preferred.**
- **Edge with `from` only (no `to`)** — renders a floating arrow
  endpoint the user can drag onto the target.

Edge labels stay empty on this diagram type — the arrow alone speaks. Missing-
label warnings are disabled for screen-guide.

### Edges
- Every edge MUST have a `label` describing the interaction as a verb phrase
  ("authenticates", "publishes events to", "reads from", "sends notifications via").
- Exception: screen-guide diagrams may have unlabeled edges.

## Node label format (C4 convention)
Either provide a full C4 label in `name` using `\n` line breaks, or provide
`kind` plus optional `description` and let the MCP build the C4 label:
```
Name\n[Type]\nShort description of role or responsibility
```
Architectural `kind` is separate from visual `renderAs`: `kind` describes
the concept, `renderAs` chooses the shape. If `kind` is present and
`renderAs` is absent, the MCP chooses the default shape and color for that
kind. Legacy `type` still works as the visual shape when `kind` is absent.
Kinds: `person`, `software_system`, `external_system`, `container`,
`component`, `database`, `object_storage`, `queue`, `device`, `api`,
`cloud_service`, `browser_app`, `mobile_app`, `backend_service`, `job`,
`unknown`.
Types include `[Person]`, `[Software System]`, `[External System]`,
`[Container]`, `[Component]`, `[Database]`, `[Device]`.
Keep descriptions to 1–2 short lines.

## Coordinate system (when positions are provided)
- Origin `(0, 0)` is the canvas center.
- `+x` is right, `+y` is down.
- Use multiples of **40** for grid alignment.
- `x` and `y` are **optional**: omit them to let the editor auto-lay out
  nodes. Only provide coordinates when you want a fixed layout (e.g., following
  a C4 convention).
- **Screen-guide exception**: positions align to screenshot pixels (and
  anchors to target pixels), not to the 40-unit grid.

## Source code access (fallback only)
Three tools expose read-only access to the project source under `sourceRoot`
(configurable in `.living-doc.json`; defaults to the parent folder of
`docsFolder`):

- `list_source_files(pattern?, maxResults?)`
- `read_source_file(path)`
- `search_source(query, pattern?, maxResults?, caseSensitive?)`

**Rules**:
1. Documentation tools come first. Use source tools only when the docs do not
   carry the required detail (typical case: screen-guide diagrams, or
   low-level code documentation with no ADR).
2. If you find yourself reading more than 3 source files for the same
   diagram, stop and update the documentation first.
3. Common ignored folders (`node_modules`, `dist`, `.git`, `build`,
   `target`, …) are skipped automatically.

## Guardrails (enforced server-side in create_diagram)
- `diagramType` is required.
- Non-context types (`container`, `component`, `uml`, `screen-guide`) are
  rejected unless `userRequestedExplicitly: true` is also passed.
- `image` nodes without `imageSrc` are rejected.
- A response `warnings` array flags missing edge labels (except for
  screen-guide) or oversized context diagrams.

## Source-file metadata & accuracy
Documents can be bound to the source files they describe. Each binding stores
the file's SHA-256 hash so the system can detect drift between docs and code.

Tools:
- `list_metadata(id)` — returns the source files attached to a doc.
- `get_accuracy(id)` — classifies each entry (`unchanged` / `modified` /
  `missing`) and returns a weighted `accuracy` in [0, 1] (missing weighs 3×
  a simple modification).
- `add_metadata(id, path)` — attach a source file (path under
  `sourceRoot`) and record its current hash.
- `remove_metadata(id, path)` — detach an entry. Idempotent (no-op
  if the path is not attached). Use this to clean up orphans or to
  handle renames (`add_metadata` new path, then
  `remove_metadata` old path).
- `refresh_metadata(id)` — re-hash every attached file. Call **after**
  the doc has been updated to re-align it with the current source state.
- `list_documents_below_accuracy()` — audit: returns up to 10 documents
  whose accuracy < 80%, sorted most-degraded first, plus a
  `totalBelowThreshold` counter. SuperSeeded docs and docs without
  metadata are excluded. Use this instead of looping
  `list_documents` + `get_accuracy`.

Recommended workflow to keep docs accurate (single-doc):
1. `list_documents` → pick a doc.
2. `get_accuracy` → if accuracy < 1, the doc is drifting.
3. `read_document` and `read_source_file` on the `modified` entries.
4. Decide: is the doc still factually correct, or out of sync with the code?
   - **Still correct** → skip to step 5 (cosmetic code change, no doc rewrite).
   - **Out of sync** → update the doc with `update_document(id, content)`.
5. `refresh_metadata` to re-baseline the hashes.

Bulk audit workflow (Scenario B — invoke prompt `audit-doc-drift` for the
full template):
1. `list_documents_below_accuracy` → batch of up to 10 most-degraded docs.
2. For each item: `get_accuracy` + `read_document` + `read_source_file`
   on `modified` entries → decide:
   - **Description still holds** → `refresh_metadata` (re-baseline as-is).
   - **Description out of sync** → `update_document` → `refresh_metadata`.
3. Re-call `list_documents_below_accuracy` until `totalBelowThreshold`
   reaches 0 or the remaining items are intentionally drifting.

