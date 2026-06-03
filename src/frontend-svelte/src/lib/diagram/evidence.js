// ── Evidence / source consultation mode ───────────────────────────────────────
// Shows document-provenance markers for nodes and edges that carry `evidence`.

import { st } from './state.js';
import { t }  from './t.js';

function evidenceItems(item) {
  return Array.isArray(item && item.evidence)
    ? item.evidence.filter((e) => e && typeof e.documentId === 'string' && e.documentId.trim())
    : [];
}

function documentHref(documentId) {
  return '/?doc=' + encodeURIComponent(documentId);
}

function markerPositionForNode(node) {
  if (!st.network || !node) return null;
  const bodyNode = st.network.body.nodes[node.id];
  if (!bodyNode) return null;
  const w = (bodyNode.shape && bodyNode.shape.width) || node.nodeWidth || 120;
  const h = (bodyNode.shape && bodyNode.shape.height) || node.nodeHeight || 60;
  return st.network.canvasToDOM({ x: bodyNode.x + w / 2 - 8, y: bodyNode.y - h / 2 + 8 });
}

function markerPositionForEdge(edge) {
  if (!st.network || !edge) return null;
  const bbox = st.edgeLabelBBox && st.edgeLabelBBox[edge.id];
  if (bbox) return st.network.canvasToDOM({ x: bbox.cx, y: bbox.cy });

  const from = st.network.body.nodes[edge.from];
  const to = edge.to && st.network.body.nodes[edge.to];
  if (!from || !to) return null;
  return st.network.canvasToDOM({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 });
}

function makeMarker(kind, id, pos) {
  const marker = document.createElement('button');
  marker.type = 'button';
  marker.className = 'evidence-marker';
  marker.textContent = '⌘';
  marker.title = t('diagram.evidence.marker_title');
  marker.setAttribute('aria-label', marker.title);
  marker.style.left = `${Math.round(pos.x)}px`;
  marker.style.top = `${Math.round(pos.y)}px`;
  marker.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    showEvidencePanel(kind, id);
  });
  return marker;
}

export function renderEvidenceMarkers() {
  const layer = document.getElementById('evidenceLayer');
  if (!layer) return;
  layer.replaceChildren();
  layer.classList.toggle('hidden', !st.evidenceMode);
  if (!st.evidenceMode || !st.network || !st.nodes || !st.edges) return;

  for (const node of st.nodes.get()) {
    if (!evidenceItems(node).length || node.shapeType === 'anchor') continue;
    const pos = markerPositionForNode(node);
    if (pos) layer.appendChild(makeMarker('node', node.id, pos));
  }

  for (const edge of st.edges.get()) {
    if (!evidenceItems(edge).length) continue;
    const pos = markerPositionForEdge(edge);
    if (pos) layer.appendChild(makeMarker('edge', edge.id, pos));
  }
}

export function bindEvidenceModeToNetwork() {
  if (!st.network) return;
  st.network.on('afterDrawing', renderEvidenceMarkers);
  renderEvidenceMarkers();
}

export function initEvidenceMode() {
  window.addEventListener('diagram:network-ready', bindEvidenceModeToNetwork);
  document.getElementById('btnEvidenceClose')?.addEventListener('click', hideEvidencePanel);
}

export function toggleEvidenceMode() {
  st.evidenceMode = !st.evidenceMode;
  const btn = document.getElementById('btnEvidenceMode');
  if (btn) btn.classList.toggle('tool-active', st.evidenceMode);
  if (!st.evidenceMode) hideEvidencePanel();
  renderEvidenceMarkers();
}

export function hideEvidencePanel() {
  const panel = document.getElementById('evidencePanel');
  if (panel) panel.classList.add('hidden');
}

function showEvidencePanel(kind, id) {
  const panel = document.getElementById('evidencePanel');
  const title = document.getElementById('evidencePanelTitle');
  const body = document.getElementById('evidencePanelBody');
  if (!panel || !title || !body) return;

  const item = kind === 'node' ? st.nodes.get(id) : st.edges.get(id);
  const entries = evidenceItems(item);
  title.textContent = kind === 'node'
    ? t('diagram.evidence.node_title')
    : t('diagram.evidence.edge_title');
  body.replaceChildren();

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'text-sm text-gray-500 dark:text-gray-400';
    empty.textContent = t('diagram.evidence.empty');
    body.appendChild(empty);
  }

  for (const entry of entries) {
    const card = document.createElement('article');
    card.className = 'rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-2';

    const link = document.createElement('a');
    link.className = 'block text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline break-all';
    link.href = documentHref(entry.documentId);
    link.textContent = entry.documentId;
    card.appendChild(link);

    if (entry.section) {
      const section = document.createElement('p');
      section.className = 'text-xs font-medium text-gray-500 dark:text-gray-400';
      section.textContent = `${t('diagram.evidence.section_label')}: ${entry.section}`;
      card.appendChild(section);
    }

    if (entry.summary) {
      const summary = document.createElement('p');
      summary.className = 'text-sm text-gray-700 dark:text-gray-300 leading-snug';
      summary.textContent = entry.summary;
      card.appendChild(summary);
    }

    body.appendChild(card);
  }

  panel.classList.remove('hidden');
}
