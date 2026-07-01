---
**date:** 2026-07-01
**status:** Draft
**description:** Short presentation of the Diagram menu for creating, editing, and linking diagrams to your documents.
**tags:** diagram, diagrams, canvas, schema, markdown, evidence, mcp, drawio, documentation
---

### **Diagram** Menu

The <kbd>Diagram</kbd> menu lets you create and edit diagrams directly in **Living Documentation**.

It helps you turn an explanation into a visual view:

- architecture
- business flows
- processes
- dependencies
- document summaries
- diagrams prepared by an agent

<!-- image-width: 2/3 -->
![Example Living Documentation context diagram](/images/DOCUMENTATION/living_documentation_context_demo_conf.png)

<!-- image-width: 2/3 -->
![image](/images/DOCUMENTATION/exemple_diagramme_documentation.png)

---

### What is a diagram for?

A diagram is not meant to replace a document.

It makes visible what is difficult to read in a long text.

<!-- layout-columns -->

<!-- col -->

Use a diagram to show:

- actors
- systems
- relationships
- dependencies
- important steps
- main responsibilities

<!-- col -->

Avoid putting everything in one diagram.

A good diagram should remain quickly readable, even by someone discovering the topic.

<!-- /layout-columns -->

<!-- quote-type: info -->
<!-- quote-title: Simple principle -->
<!-- quote-icon -->
> A diagram should clarify a document, not become hidden documentation of its own.

---

### Open a diagram

A diagram can be opened in several ways.

| Access | Usage |
| --- | --- |
| <kbd>Diagram</kbd> menu | open the diagram editor |
| Diagram list | find an existing diagram |
| Link in a document | open the associated diagram directly |
| `/diagram?id=...` URL | open a specific diagram |

From the editor, the <kbd>Back</kbd> button returns to the previous page.

---

### Create a diagram

To create a new diagram:

1. open <kbd>Diagram</kbd>
2. click <kbd>+ New</kbd>
3. give the diagram a title
4. add shapes on the canvas
5. connect elements with arrows
6. click <kbd>Save</kbd>

The diagram is saved in the **Living Documentation** documentation workspace.

<!-- quote-type: success -->
<!-- quote-title: Good habit -->
<!-- quote-icon -->
> Give it a clear title from the start. It will be easier to find in the diagram list and to reference from a document.

---

### Available elements

The editor offers several shapes to quickly build a diagram.

<!-- layout-columns -->

<!-- col -->

| Element | Common use |
| --- | --- |
| Rectangle | system, screen, component, step |
| Ellipse | event, state, lightweight grouping |
| Database | storage, file, database, collection |
| Actor | user, role, person, team |

<!-- col -->

| Element | Common use |
| --- | --- |
| Post-it | note, comment, point of attention |
| Free text | title, annotation, legend |
| Image | screenshot, illustration, visual reference |
| Arrow | relationship, flow, dependency |

<!-- /layout-columns -->

You can then adjust colors, size, text, links, alignment, and display order.

---

### Draw quickly

The behavior is intentionally close to a drawing tool.

1. select a shape in the toolbar
2. place it on the canvas
3. double-click to edit its text
4. use an arrow to connect two elements
5. click an element to display its options

You can enable the grid, snap, and alignment guides to make the diagram cleaner.

---

### Link a diagram to a document

A diagram becomes truly useful when it is linked to the document that explains it.

In a Markdown document, you can insert a clickable image that opens the diagram:

```markdown
[![Context diagram](/images/DOCUMENTATION/my-diagram.png)](/diagram?id=diagram-id)
```

The reader sees the image in the document.

When they click it, the diagram opens in the editor.

<!-- quote-type: info -->
<!-- quote-title: Tip -->
<!-- quote-icon -->
> The document keeps the explanation. The diagram keeps the visual view. They should complement each other.

---

### Sources and traceability

Some diagrams can be generated or enriched by agents and MCP tools.

In that case, **Living Documentation** can keep source information:

- document used
- section used
- element concerned
- relationship represented

Source consultation mode lets you verify what a node or relationship is based on.

This is especially useful when a diagram is generated automatically from a document.

---

### Export or share

Depending on the need, you can:

- save the diagram
- copy an element or selection as PNG
- export the diagram as `.drawio`
- copy the technical diagram id
- insert a diagram image into a Markdown document

The `.drawio` export is useful if you need to rework the diagram in an external tool.

The Markdown image is useful if you want the diagram to be visible directly in a document.

---

### Diagrams and agents

Agents can help produce diagrams from your documents.

For example, an agent can:

- read a document
- identify important actors and systems
- propose a context diagram
- create or update a diagram
- link the result to the document

<!-- quote-type: warning -->
<!-- quote-title: Keep in mind -->
<!-- quote-icon -->
> An agent can produce a very good first version, but the final diagram should remain readable and validated by a human.

---

### Simple advice

Start small.

A good first diagram often contains:

- a clear title
- 5 to 7 important elements
- named relationships
- few colors
- a link to the associated document

When this first level is clear, you can create a second, more detailed diagram.
