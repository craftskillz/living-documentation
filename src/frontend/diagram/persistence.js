// ── Persistence ───────────────────────────────────────────────────────────────
// API calls (CRUD) for diagrams + sidebar list rendering.

import { st, markDirty } from './state.js';
import { initNetwork }   from './network.js';
import { hideNodePanel } from './node-panel.js';
import { hideEdgePanel } from './edge-panel.js';
import { hideLabelInput }       from './label-editor.js';
import { hideSelectionOverlay } from './selection-overlay.js';

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderDiagramList() {
  const list = document.getElementById('diagramList');
  list.innerHTML = '';
  if (!st.diagrams.length) {
    list.innerHTML = '<p class="text-xs text-gray-400 dark:text-gray-600 px-3 py-3">Aucun diagramme</p>';
    return;
  }
  st.diagrams.forEach((d) => {
    const isActive = d.id === st.currentDiagramId;
    const item     = document.createElement('div');
    item.className = [
      'group flex items-center gap-1 px-2 py-1.5 mx-1 my-0.5 rounded-md cursor-pointer',
      'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
      isActive ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300',
    ].join(' ');

    const titleSpan = document.createElement('span');
    titleSpan.className   = 'flex-1 text-sm truncate';
    titleSpan.textContent = d.title;

    const deleteBtn = document.createElement('button');
    deleteBtn.title     = 'Supprimer';
    deleteBtn.className = 'hidden group-hover:flex items-center justify-center w-4 h-4 rounded text-gray-400 hover:text-red-500 shrink-0';
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteDiagram(d.id);
    });

    item.appendChild(titleSpan);
    item.appendChild(deleteBtn);
    item.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') return; openDiagram(d.id); });
    list.appendChild(item);
  });
}

export async function loadDiagramList() {
  const res   = await fetch('/api/diagrams');
  st.diagrams = await res.json();
  renderDiagramList();
  if (!st.diagrams.length) return;
  const urlId  = new URLSearchParams(window.location.search).get('id');
  const target = urlId && st.diagrams.find((d) => d.id === urlId) ? urlId : st.diagrams[0].id;
  openDiagram(target);
}

export async function openDiagram(id) {
  const res     = await fetch(`/api/diagrams/${id}`);
  const diagram = await res.json();
  st.currentDiagramId = id;
  st.isDirty          = false;
  st.edgesStraight    = diagram.edgesStraight === true;
  document.getElementById('btnSave').disabled      = true;
  document.getElementById('diagramTitle').value    = diagram.title || '';
  document.getElementById('btnEdgeStraight').classList.toggle('tool-active', st.edgesStraight);
  initNetwork(diagram.nodes || [], diagram.edges || [], st.edgesStraight);
  renderDiagramList();
}

export async function newDiagram() {
  const id = 'd' + Date.now();
  await fetch(`/api/diagrams/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Nouveau diagramme', nodes: [], edges: [] }),
  });
  const res   = await fetch('/api/diagrams');
  st.diagrams = await res.json();
  renderDiagramList();
  openDiagram(id);
}

export async function deleteDiagram(id) {
  if (!confirm('Supprimer ce diagramme ?')) return;
  await fetch(`/api/diagrams/${id}`, { method: 'DELETE' });
  const res   = await fetch('/api/diagrams');
  st.diagrams = await res.json();

  if (st.currentDiagramId === id) {
    st.currentDiagramId = null;
    if (st.network) { st.network.destroy(); st.network = null; }
    st.nodes = null;
    st.edges = null;
    document.getElementById('diagramTitle').value   = '';
    document.getElementById('btnSave').disabled     = true;
    hideNodePanel();
    hideEdgePanel();
    hideLabelInput();
    hideSelectionOverlay();
    if (st.diagrams.length > 0) openDiagram(st.diagrams[0].id);
    else document.getElementById('emptyState').classList.remove('hidden');
  }
  renderDiagramList();
}

export async function saveDiagram() {
  if (!st.currentDiagramId || !st.network) return;
  const positions = st.network.getPositions();

  // Serialise in canonicalOrder so z-order is restored on next load.
  const nodeData = st.canonicalOrder
    .map((id) => st.nodes.get(id))
    .filter(Boolean)
    .map((n) => ({
      id: n.id, label: n.label,
      shapeType: n.shapeType || 'box', colorKey: n.colorKey || 'c-gray',
      nodeWidth: n.nodeWidth || null, nodeHeight: n.nodeHeight || null,
      fontSize: n.fontSize || null, textAlign: n.textAlign || null, textValign: n.textValign || null,
      rotation: n.rotation || 0, labelRotation: n.labelRotation || 0,
      imageSrc: n.imageSrc || null,
      groupId: n.groupId || null,
      nodeLink: n.nodeLink || null,
      locked: n.locked || false,
      x: positions[n.id]?.x ?? n.x, y: positions[n.id]?.y ?? n.y,
    }));

  const edgeData = st.edges.get().map((e) => ({
    id: e.id, from: e.from, to: e.to,
    label: e.label || '', arrowDir: e.arrowDir || 'to',
    dashes: e.dashes || false, fontSize: e.fontSize || null,
    labelRotation: e.labelRotation || 0,
    fromPort: e.fromPort || null, toPort: e.toPort || null,
    edgeColor: e.edgeColor || null, edgeWidth: e.edgeWidth || null,
  }));

  const title = document.getElementById('diagramTitle').value || 'Sans titre';
  await fetch(`/api/diagrams/${st.currentDiagramId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, nodes: nodeData, edges: edgeData, edgesStraight: st.edgesStraight }),
  });
  st.isDirty = false;
  document.getElementById('btnSave').disabled = true;
  const res   = await fetch('/api/diagrams');
  st.diagrams = await res.json();
  renderDiagramList();
}
