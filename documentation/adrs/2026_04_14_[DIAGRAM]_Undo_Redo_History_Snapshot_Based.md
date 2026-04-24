---
`🗄️ ADR : 2026_04_14_[DIAGRAM]_Undo_Redo_History_Snapshot_Based.md`
**date:** 2026-04-14
**status:** Accepted
**description:** Add in-session undo/redo (Cmd+Z / Cmd+Shift+Z) to the diagram editor via a snapshot-based history module (history.js) that captures semantic node/edge state before every mutating action, with a max stack of 50 entries reset on diagram switch.
**tags:** diagram, undo, redo, history, snapshot, history.js, pushSnapshot, resetHistory, Cmd+Z, Cmd+Shift+Z, keyboard, state, vis-network, DataSet
---

## Context

The diagram editor supported no undo/redo. Any accidental action (deleting a node, resizing, changing a color) was irreversible without reloading the last saved version. Users had to save frequently as a workaround, which was disruptive. All user-visible mutations — adding/deleting nodes and edges, moving, resizing, rotating, label edits, color changes, lock/unlock, grouping, paste, link assignment — needed to be covered.

## Decision

### Architecture : snapshot-based history in a dedicated `history.js` module

A **snapshot-based** approach was chosen over a command-based one. Given the large variety of mutation types spread across many modules, implementing a command/inverse-command pair for each would have been extremely verbose and error-prone. Snapshots are simpler, the data is small (nodes + edges arrays identical to what `saveDiagram` serialises), and restoration is already proven (same path as `openDiagram`).

**`history.js`** exports four public functions:

| Function         | Role                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------- |
| `pushSnapshot()` | Capture current state **before** the mutation, push to `_undoStack`, clear `_redoStack` |
| `undo()`         | Pop `_undoStack`, push current state to `_redoStack`, restore                           |
| `redo()`         | Pop `_redoStack`, push current state to `_undoStack`, restore                           |
| `resetHistory()` | Clear both stacks — called in `openDiagram()` on every diagram switch                   |

**Stack limit:** 50 entries (`MAX_HISTORY`). Oldest entry is shifted out when exceeded.

### Snapshot format

Same semantic fields as `saveDiagram` (not the vis-network DataSet internals):

```js
{
  nodes: [{ id, label, shapeType, colorKey, nodeWidth, nodeHeight, fontSize,
             textAlign, textValign, rotation, labelRotation, imageSrc,
             groupId, nodeLink, locked, x, y }],
  edges: [{ id, from, to, label, arrowDir, dashes, fontSize, labelRotation,
             fromPort, toPort, edgeColor, edgeWidth, edgeLocked }],
  canonicalOrder: [...],
  edgesStraight: bool
}
```

### Restore strategy (`_restoreState`)

1. Clear `st.edges` first — the edge-remove DataSet listener detects orphaned anchors and removes them from `st.nodes`, avoiding cascade issues
2. Clear `st.nodes`
3. Re-add nodes with `visNodeProps()` reconstruction (same as `initNetwork`)
4. Re-add edges with full vis-network props (smooth, color, arrows, font)
5. Override `st.canonicalOrder` with snapshot value (the add-listener builds it in insertion order; we override immediately after)
6. Restore viewport (position + scale, `animation: false`)
7. Force `refreshNeeded = true` on all body nodes (custom ctxRenderer shapes cache closures)
8. Call `markDirty()` and `network.redraw()`

### Keyboard shortcuts

Added in `main.js` keydown handler:

- **Cmd+Z / Ctrl+Z** → `undo()`
- **Cmd+Shift+Z / Ctrl+Shift+Z** → `redo()`

Both are no-ops when the respective stack is empty.

### Coverage — `pushSnapshot()` call sites

`pushSnapshot()` is called **before** the mutation in every action that modifies diagram data:

| Module                 | Actions covered                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main.js`              | `deleteSelected()`                                                                                                                                    |
| `network.js`           | `addEdge` callback, `onDoubleClick` (add node, free arrow, anchor), mouseup anchor creation, `toggleEdgeStraight()`, `createImageNode()`              |
| `node-panel.js`        | `toggleNodeLock`, `setNodeColor`, `changeNodeFontSize`, `setTextAlign`, `setTextValign`, `applyStamp`, `stepRotate`, `changeZOrder`                   |
| `edge-panel.js`        | `toggleEdgeLock`, `clearEdgePorts`, `setEdgeColor`, `changeEdgeWidth`, `setEdgeArrow`, `setEdgeDashes`, `changeEdgeFontSize`, `stepEdgeLabelRotation` |
| `label-editor.js`      | `commitLabelEdit()` — only when label value actually changed                                                                                          |
| `clipboard.js`         | `pasteClipboard()`                                                                                                                                    |
| `groups.js`            | `groupNodes()`, `ungroupNodes()`                                                                                                                      |
| `selection-overlay.js` | `onResizeStart`, `onRotateStart`, `onLabelRotateStart` (before drag begins)                                                                           |
| `grid.js`              | `onDragEnd()` — only when `params.nodes` is non-empty                                                                                                 |
| `link-panel.js`        | `saveLinkPanel()` (url/diagram branches), `_createAndLinkDiagram()`, `removeLinkPanel()`                                                              |

### Scope

History is **in-session only** — not persisted. Switching diagrams resets both stacks via `resetHistory()` called in `openDiagram()`.

## Consequences

### PROS

- Every user-visible mutation is undoable/redoable with a standard keyboard shortcut
- Snapshot format reuses the existing serialisation logic — no duplication
- Restore logic mirrors `initNetwork` — no new edge cases introduced
- Zero performance impact during normal use (snapshots are small JS objects)
- History is scoped per diagram session — no cross-diagram bleed
- Label edit only pushes a snapshot when the text actually changed (no spurious undo steps on blur without edit)

### CONS

- Each click on incremental buttons (font size +/-, rotation step) creates one undo entry — users may need multiple Cmd+Z to reverse rapid adjustments
- Snapshot captures full node/edge arrays — for very large diagrams (hundreds of nodes), 50 snapshots could use noticeable memory (typically negligible)
- History is lost on page reload (intentional — no persistence requirement)
