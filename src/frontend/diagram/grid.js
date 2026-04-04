// ── Grid & physics ────────────────────────────────────────────────────────────
// Grid rendering (beforeDrawing), snap-to-grid (dragEnd), physics toggle.

import { st, markDirty } from './state.js';
import { GRID_SIZE } from './constants.js';


export function togglePhysics() {
  st.physicsEnabled = !st.physicsEnabled;
  const btn = document.getElementById('btnPhysics');
  btn.classList.toggle('tool-active', st.physicsEnabled);
  btn.title = st.physicsEnabled ? 'Anti-chevauchement actif' : 'Anti-chevauchement (espace les nœuds qui se superposent)';

  if (!st.network) return;

  st.network.setOptions({
    physics: {
      enabled: st.physicsEnabled,
      stabilization: { enabled: false }, // no auto-stop — stays on until user toggles off
      barnesHut: {
        gravitationalConstant: -800, // mild repulsion — only pushes overlapping nodes
        centralGravity: 0,           // no pull toward centre — distant nodes stay put
        springLength: 100,
        springConstant: 0.01,
        damping: 0.6,                // high damping — nodes settle fast, no oscillation
        avoidOverlap: 1,             // vis-network built-in overlap avoidance
      },
    },
  });
}

export function toggleGrid() {
  st.gridEnabled = !st.gridEnabled;
  const btn = document.getElementById('btnGrid');
  btn.classList.toggle('tool-active', st.gridEnabled);
  btn.title = st.gridEnabled ? 'Grille activée (snap on)' : 'Grille / Snap to grid (G)';
  if (st.network) st.network.redraw();
}

// Called on network "beforeDrawing" — draws grid lines in physical pixel space.
export function drawGrid(ctx) {
  if (!st.gridEnabled || !st.network) return;
  const isDark = document.documentElement.classList.contains('dark');
  const color  = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)';
  const scale  = st.network.getScale();
  const center = st.network.getViewPosition();
  const canvas = ctx.canvas;
  const W = canvas.width, H = canvas.height;

  // vis.js coordinates (center.x, scale) are in CSS pixels; must multiply by DPR
  // so the grid aligns correctly on Retina/HiDPI displays.
  const dpr    = window.devicePixelRatio || 1;
  const step   = GRID_SIZE * scale * dpr;
  const offsetX = (((W / 2 - center.x * scale * dpr) % step) + step) % step;
  const offsetY = (((H / 2 - center.y * scale * dpr) % step) + step) % step;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // physical pixel space
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  for (let x = offsetX; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = offsetY; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.restore();
}

// Called on network "dragEnd" — snaps dragged nodes to the grid.
export function onDragEnd(params) {
  if (st.gridEnabled && params.nodes && params.nodes.length > 0) {
    params.nodes.forEach((id) => {
      const bodyNode = st.network.body.nodes[id];
      if (!bodyNode) return;
      // shape.width/height are set by resize() on each draw — exact visual size
      const w = bodyNode.shape.width  || 0;
      const h = bodyNode.shape.height || 0;
      const cx = bodyNode.x, cy = bodyNode.y;
      // Snap the visual top-left corner to grid lines
      const snappedLeft = Math.round((cx - w / 2) / GRID_SIZE) * GRID_SIZE;
      const snappedTop  = Math.round((cy - h / 2) / GRID_SIZE) * GRID_SIZE;
      st.network.moveNode(id, snappedLeft + w / 2, snappedTop + h / 2);
    });
  }
  markDirty();
}
