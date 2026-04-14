// ── Grid & snap ───────────────────────────────────────────────────────────────
// Grid rendering (beforeDrawing), snap-to-grid (dragEnd).

import { st, markDirty }    from './state.js';
import { GRID_SIZE }         from './constants.js';
import { t }                 from './t.js';
import { pushSnapshot }      from './history.js';
import { snapToAlignGuides } from './alignment.js';



export function toggleGrid() {
  st.gridEnabled = !st.gridEnabled;
  const btn = document.getElementById('btnGrid');
  btn.classList.toggle('tool-active', st.gridEnabled);
  btn.title = t('diagram.toolbar.grid');
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

// Snap a canvas position to the nearest grid intersection.
export function snapToGrid(x, y) {
  return {
    x: Math.round(x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(y / GRID_SIZE) * GRID_SIZE,
  };
}

// Called on network "dragEnd" — alignment snap, then grid snap.
export function onDragEnd(params) {
  if (!params.nodes || !params.nodes.length) return;
  pushSnapshot();
  snapToAlignGuides(params);
  if (st.gridEnabled) {
    params.nodes.forEach((id) => {
      const bodyNode = st.network.body.nodes[id];
      if (!bodyNode) return;
      const cx = bodyNode.x, cy = bodyNode.y;
      // Snap the center of the shape to grid intersections
      const snappedX = Math.round(cx / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(cy / GRID_SIZE) * GRID_SIZE;
      st.network.moveNode(id, snappedX, snappedY);
    });
  }
  markDirty();
}
