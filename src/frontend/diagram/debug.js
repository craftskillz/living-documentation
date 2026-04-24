// ── Debug overlay ─────────────────────────────────────────────────────────────
// DOM overlay showing node IDs and bounding-box coordinates for each node.
// Toggled by the showDiagramDebug config flag (Admin panel).

import { st } from './state.js';

export function toggleDebug() {
  st.debugMode = !st.debugMode;
  document.getElementById('btnDebug').classList.toggle('tool-active', st.debugMode);
  if (st.network) st.network.redraw();
}

// Called on network "afterDrawing". Recycles existing .debug-box elements by node id.
export function drawDebugOverlay() {
  const layer = document.getElementById('debugLayer');
  if (!st.debugMode || !st.network) { layer.innerHTML = ''; return; }

  const existing = new Map(
    [...layer.querySelectorAll('.debug-box')].map((el) => [el.dataset.nid, el])
  );
  const seen = new Set();

  for (const id of st.canonicalOrder) {
    const bodyNode = st.network.body.nodes[id];
    if (!bodyNode) continue;
    const w  = bodyNode.shape.width  || 0;
    const h  = bodyNode.shape.height || 0;
    const cx = bodyNode.x, cy = bodyNode.y;
    const L  = cx - w / 2, T = cy - h / 2;

    const dom  = st.network.canvasToDOM({ x: cx + w / 2 + 8, y: cy - h / 2 });
    const text = [`id : ${id}`, `cx=${Math.round(cx)}  cy=${Math.round(cy)}`, `w =${Math.round(w)}   h =${Math.round(h)}`, `L =${Math.round(L)}   T =${Math.round(T)}`].join('\n');

    let box = existing.get(String(id));
    if (!box) { box = document.createElement('div'); box.className = 'debug-box'; box.dataset.nid = String(id); layer.appendChild(box); }
    box.textContent = text;
    box.style.left  = Math.round(dom.x) + 'px';
    box.style.top   = Math.round(dom.y) + 'px';
    seen.add(String(id));
  }

  existing.forEach((el, nid) => { if (!seen.has(nid)) el.remove(); });
}
