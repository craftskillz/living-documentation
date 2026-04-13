// ── Clipboard (copy / paste) ───────────────────────────────────────────────────

import { st, markDirty } from './state.js';
import { visNodeProps, SHAPE_DEFAULTS }  from './node-rendering.js';
import { visEdgeProps }  from './edge-rendering.js';
import { showNodePanel } from './node-panel.js';
import { showToast }     from './toast.js';
import { uploadImageBlob } from './image-upload.js';

// ── Shared: render selection to a PNG blob ────────────────────────────────────

async function _selectionToBlob() {
  if (!st.network || !st.selectedNodeIds.length) return null;

  const PAD = 20;
  const dpr = window.devicePixelRatio || 1;

  // Compute bounding box in canvas coordinates
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of st.selectedNodeIds) {
    const n  = st.nodes.get(id);
    const bn = st.network.body.nodes[id];
    if (!bn) continue;
    const defaults = SHAPE_DEFAULTS[(n && n.shapeType) || 'box'] || [100, 40];
    const w   = (n && n.nodeWidth)  || defaults[0];
    const h   = (n && n.nodeHeight) || defaults[1];
    const rot = (n && n.rotation)   || 0;
    let hw, hh;
    if (rot === 0) {
      hw = w / 2; hh = h / 2;
    } else {
      const cos = Math.abs(Math.cos(rot)); const sin = Math.abs(Math.sin(rot));
      hw = (w * cos + h * sin) / 2;
      hh = (w * sin + h * cos) / 2;
    }
    minX = Math.min(minX, bn.x - hw); maxX = Math.max(maxX, bn.x + hw);
    minY = Math.min(minY, bn.y - hh); maxY = Math.max(maxY, bn.y + hh);
  }

  // Convert canvas coords to DOM pixels
  const tl = st.network.canvasToDOM({ x: minX, y: minY });
  const br = st.network.canvasToDOM({ x: maxX, y: maxY });

  const cropX = Math.max(0, Math.floor(tl.x - PAD));
  const cropY = Math.max(0, Math.floor(tl.y - PAD));
  const cropW = Math.ceil(br.x - tl.x + PAD * 2);
  const cropH = Math.ceil(br.y - tl.y + PAD * 2);

  // Temporarily deselect so highlights don't appear in the PNG
  const savedNodeIds = [...st.selectedNodeIds];
  st.network.unselectAll();
  st.selectedNodeIds = [];
  st.network.redraw();

  const visCanvas = document.querySelector('#vis-canvas canvas');
  if (!visCanvas) {
    st.network.selectNodes(savedNodeIds);
    return null;
  }

  // Crop into an offscreen canvas
  const out = document.createElement('canvas');
  out.width  = cropW * dpr;
  out.height = cropH * dpr;
  const octx = out.getContext('2d');

  const isDark = document.documentElement.classList.contains('dark');
  octx.fillStyle = isDark ? '#030712' : '#f9fafb';
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(visCanvas,
    cropX * dpr, cropY * dpr, cropW * dpr, cropH * dpr,
    0, 0, out.width, out.height
  );

  const blob = await new Promise((res) => out.toBlob(res, 'image/png'));
  return { blob, savedNodeIds };
}

// ── Copy selection as PNG (to clipboard) ─────────────────────────────────────

export async function copySelectionAsPng() {
  const result = await _selectionToBlob();
  if (!result) return;
  const { blob, savedNodeIds } = result;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    showToast('PNG copié dans le presse-papier');
  } catch {
    showToast('Impossible de copier l\'image', 'error');
  } finally {
    st.network.selectNodes(savedNodeIds);
  }
}

// ── Save selection as PNG to server ──────────────────────────────────────────

export async function saveSelectionAsPng(filename) {
  const result = await _selectionToBlob();
  if (!result) return;
  const { blob, savedNodeIds } = result;
  try {
    const name = filename.replace(/\.[^.]+$/, ''); // strip extension
    await uploadImageBlob(blob, 'png', name);
    showToast('Diagramme enregistré en tant qu\'image');
  } catch {
    showToast('Impossible d\'enregistrer l\'image', 'error');
  } finally {
    st.network.selectNodes(savedNodeIds);
  }
}

export function copySelected() {
  if (!st.network || !st.selectedNodeIds.length) return;

  // Use vis-network's full selection — includes anchor endpoints of free arrows,
  // which are excluded from st.selectedNodeIds (no node panel for anchors).
  const allNodeIds    = st.network.getSelectedNodes();
  const allEdgeIds    = new Set(st.network.getSelectedEdges());

  const positions   = st.network.getPositions(allNodeIds);
  const copiedNodes = allNodeIds.map((id) => {
    const { ctxRenderer, ...rest } = st.nodes.get(id);
    return { ...rest, x: positions[id]?.x ?? rest.x, y: positions[id]?.y ?? rest.y };
  });

  // Edges where both endpoints are in the selection, plus any explicitly selected edges.
  const selectedSet = new Set(allNodeIds);
  const copiedEdges = st.edges.get().filter((e) =>
    (selectedSet.has(e.from) && selectedSet.has(e.to)) || allEdgeIds.has(e.id)
  );

  st.clipboard = { nodes: copiedNodes, edges: copiedEdges };
}

export function pasteClipboard() {
  if (!st.clipboard || !st.clipboard.nodes.length || !st.network) return;

  const OFFSET = 40;
  const idMap  = {};
  st.clipboard.nodes.forEach((n) => { idMap[n.id] = 'n' + Date.now() + Math.random().toString(36).slice(2); });

  const newNodes = st.clipboard.nodes.map((n) => ({
    ...n, id: idMap[n.id], x: (n.x || 0) + OFFSET, y: (n.y || 0) + OFFSET,
    ...visNodeProps(n.shapeType || 'box', n.colorKey || 'c-gray', n.nodeWidth, n.nodeHeight, n.fontSize, n.textAlign, n.textValign),
  }));
  const newEdges = st.clipboard.edges.map((e) => ({
    ...e,
    id: 'e' + Date.now() + Math.random().toString(36).slice(2),
    from: idMap[e.from], to: idMap[e.to],
    ...visEdgeProps(e.arrowDir ?? 'to', e.dashes ?? false),
    ...(e.fontSize ? { font: { size: e.fontSize, align: 'middle', color: '#6b7280' } } : {}),
  }));

  st.nodes.add(newNodes);
  st.edges.add(newEdges);

  const newIds = newNodes.map((n) => n.id);
  st.network.selectNodes(newIds);
  st.selectedNodeIds = newIds;
  st.selectedEdgeIds = [];
  showNodePanel();
  markDirty();

  // Offset clipboard so each successive paste is staggered
  st.clipboard = {
    nodes: st.clipboard.nodes.map((n) => ({ ...n, x: (n.x || 0) + OFFSET, y: (n.y || 0) + OFFSET })),
    edges: st.clipboard.edges,
  };
}
