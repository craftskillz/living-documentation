// ── Group management ──────────────────────────────────────────────────────────

import { st, markDirty } from './state.js';
import { pushSnapshot }  from './history.js';
import { SHAPE_DEFAULTS } from './node-rendering.js';

// ── Create / destroy ──────────────────────────────────────────────────────────

export function groupNodes() {
  if (st.selectedNodeIds.length < 2) return;
  pushSnapshot();
  const groupId = 'g' + Date.now();
  st.selectedNodeIds.forEach((id) => st.nodes.update({ id, groupId }));
  markDirty();
}

export function ungroupNodes() {
  if (!st.selectedNodeIds.length) return;
  pushSnapshot();
  // Collect all members of any group touched by the selection
  const groupIds = new Set(
    st.selectedNodeIds.map((id) => { const n = st.nodes.get(id); return n && n.groupId; }).filter(Boolean)
  );
  st.nodes.get().forEach((n) => {
    if (n.groupId && groupIds.has(n.groupId)) st.nodes.update({ id: n.id, groupId: null });
  });
  markDirty();
}

// ── Selection expansion ───────────────────────────────────────────────────────
// Called from onSelectNode — expands selection to all group members.

export function expandSelectionToGroup(nodeIds) {
  const groupIds = new Set();
  nodeIds.forEach((id) => {
    const n = st.nodes.get(id);
    if (n && n.groupId) groupIds.add(n.groupId);
  });
  if (!groupIds.size) return nodeIds;

  const expanded = new Set(nodeIds);
  st.nodes.get().forEach((n) => {
    if (n.groupId && groupIds.has(n.groupId)) expanded.add(n.id);
  });
  return [...expanded];
}

// ── Group outline (drawn on canvas in afterDrawing) ───────────────────────────

function nodeBounds(id) {
  const n        = st.nodes.get(id);
  const bodyNode = st.network.body.nodes[id];
  if (!bodyNode) return null;
  const shape    = (n && n.shapeType) || 'box';
  const defaults = SHAPE_DEFAULTS[shape] || [100, 40];
  const W   = (n && n.nodeWidth)  || defaults[0];
  const H   = (n && n.nodeHeight) || defaults[1];
  const rot = (n && n.rotation)   || 0;
  const cx = bodyNode.x, cy = bodyNode.y;
  if (rot === 0) {
    return { minX: cx - W / 2, minY: cy - H / 2, maxX: cx + W / 2, maxY: cy + H / 2 };
  }
  const cos = Math.abs(Math.cos(rot)); const sin = Math.abs(Math.sin(rot));
  const hw = (W * cos + H * sin) / 2;
  const hh = (W * sin + H * cos) / 2;
  return { minX: cx - hw, minY: cy - hh, maxX: cx + hw, maxY: cy + hh };
}

export function drawGroupOutlines(ctx) {
  if (!st.network || !st.selectedNodeIds.length) return;

  // Find groupIds that have at least one selected member
  const selectedSet = new Set(st.selectedNodeIds);
  const activeGroups = new Set();
  st.selectedNodeIds.forEach((id) => {
    const n = st.nodes.get(id);
    if (n && n.groupId) activeGroups.add(n.groupId);
  });
  if (!activeGroups.size) return;

  // For each active group, compute bounding box over ALL members
  activeGroups.forEach((groupId) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    st.nodes.get().forEach((n) => {
      if (n.groupId !== groupId) return;
      const b = nodeBounds(n.id);
      if (!b) return;
      minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
    });
    if (minX === Infinity) return;

    const PAD = 14;
    ctx.save();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(minX - PAD, minY - PAD, maxX - minX + PAD * 2, maxY - minY + PAD * 2);
    ctx.setLineDash([]);
    ctx.restore();
  });
}
