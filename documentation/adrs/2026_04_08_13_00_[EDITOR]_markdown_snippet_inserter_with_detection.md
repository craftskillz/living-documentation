---
`🗄️ ADR : 2026_04_08_13_00_[EDITOR]_markdown_snippet_inserter_with_detection.md`
**date:** 2026-04-08
**status:** Pending Validation
**description:** Add a 🧩 Snippets button in edit mode that opens a modal for inserting pre-built Markdown constructs at cursor position, with automatic detection and pre-filling when an existing snippet is selected in the editor.
**tags:** editor, snippet, modal, markdown, table, tree, detection, frontend, inline-editing, clipboard
---

## Context

The inline editor (`<textarea>`) only accepts raw Markdown. Advanced constructs like `<details>` collapsible blocks, aligned tables, ASCII tree diagrams, or cross-document anchor links require precise syntax that most users don't know by heart. There was no guided way to insert these patterns or to edit them once written.

## Decision

A **🧩 Snippets** button is added between the Cancel and Save buttons in edit mode. Clicking it opens a modal with:

- A `<select>` for 13 snippet types:
  - **Simple** (no editor): collapsible block (`<details>`/`<summary>`), link, link to document, anchor link, anchor link in another document, numbered list (3-level), bullet list (3-level), code block, blockquote, horizontal separator, image
  - **Complex** (dedicated editor):
    - **Table** — dynamic grid with `+`/`−` row/column controls; generates a width-aligned Markdown table
    - **Tree** — list of items with `←`/`→` indent controls; generates a `text` code block with `├──` / `└──` / `│` connectors at all nesting levels
- A **live Markdown preview** updated on every field change
- An **Insert** button that splices the generated text at the saved cursor position, replacing any selection

**Detection mode**: if text is selected in the editor before opening the modal, `detectSnippetType()` runs a series of regex tests to identify the type. On success:
- The `<select>` is set to the detected type
- `parseAndFillSnippet()` extracts values from the raw Markdown and pre-fills all fields
- A green info banner confirms the detection
On failure (unrecognised selection), an orange warning is shown and the modal defaults to "collapsible"; the snippet will still replace the selection on Insert.

The cursor position (`selectionStart` / `selectionEnd`) is saved at modal open time so the insertion is deterministic regardless of focus changes inside the modal.

For document/anchor-doc links the `<select>` is populated from `allDocs` (already in memory) — no extra API call.

## Consequences

### PROS

- Users can insert any complex Markdown construct without knowing the syntax
- Round-trip editing: select a snippet, open the modal, tweak fields, re-insert — the workflow is consistent
- The table and tree editors eliminate the most error-prone manual formatting tasks
- Detection covers all 13 types via regex; adding new types only requires extending `detectSnippetType` and `parseAndFillSnippet`
- No backend change — purely frontend

### CONS

- The `index.html` script section grows significantly (≈ 250 lines added)
- Detection is regex-based and cannot handle malformed or hand-edited snippets that deviate from the canonical format
- The table editor re-renders the full grid on every `+`/`−` click (acceptable for small tables, but not optimised for large ones)
