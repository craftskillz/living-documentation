// ── Node link panel ───────────────────────────────────────────────────────────
// Lets the user attach a URL or diagram link to a node.

import { st, markDirty } from './state.js';
import { openDiagram }   from './persistence.js';
import { showToast }     from './toast.js';
import { t }             from './t.js';

let _panelNodeId = null;

export function showLinkPanel(nodeId) {
  _panelNodeId = nodeId;
  const n    = st.nodes.get(nodeId);
  const link = (n && n.nodeLink) || null;

  const panel = document.getElementById('linkPanel');
  panel.classList.remove('hidden');

  // Populate form from existing link
  const typeUrl      = document.getElementById('linkTypeUrl');
  const typeDiagram  = document.getElementById('linkTypeDiagram');
  const typeNew      = document.getElementById('linkTypeNew');
  const urlInput     = document.getElementById('linkUrlInput');
  const diagSelect   = document.getElementById('linkDiagramSelect');
  const newNameInput = document.getElementById('linkNewName');

  // Populate diagram list
  diagSelect.innerHTML = '';
  st.diagrams.forEach((d) => {
    if (d.id === st.currentDiagramId) return; // skip current
    const opt = document.createElement('option');
    opt.value       = d.id;
    opt.textContent = d.title;
    diagSelect.appendChild(opt);
  });

  if (link && link.type === 'url') {
    typeUrl.checked    = true;
    urlInput.value     = link.value;
    newNameInput.value = '';
  } else if (link && link.type === 'diagram') {
    typeDiagram.checked = true;
    diagSelect.value    = link.value;
    urlInput.value      = '';
    newNameInput.value  = '';
  } else {
    typeUrl.checked = true;
    urlInput.value  = '';
    newNameInput.value = '';
  }

  _syncLinkPanelVisibility();
}

export function hideLinkPanel() {
  document.getElementById('linkPanel').classList.add('hidden');
  _panelNodeId = null;
}

function _syncLinkPanelVisibility() {
  const typeUrl     = document.getElementById('linkTypeUrl').checked;
  const typeDiagram = document.getElementById('linkTypeDiagram').checked;
  const typeNew     = document.getElementById('linkTypeNew').checked;
  document.getElementById('linkUrlRow').classList.toggle('hidden', !typeUrl);
  document.getElementById('linkDiagramRow').classList.toggle('hidden', !typeDiagram);
  document.getElementById('linkNewRow').classList.toggle('hidden', !typeNew);
}

export function saveLinkPanel() {
  if (_panelNodeId === null) return;
  const typeUrl     = document.getElementById('linkTypeUrl').checked;
  const typeDiagram = document.getElementById('linkTypeDiagram').checked;
  const typeNew     = document.getElementById('linkTypeNew').checked;

  if (typeUrl) {
    const value = document.getElementById('linkUrlInput').value.trim();
    st.nodes.update({ id: _panelNodeId, nodeLink: value ? { type: 'url', value } : null });
    markDirty();
    hideLinkPanel();
  } else if (typeDiagram) {
    const value = document.getElementById('linkDiagramSelect').value;
    if (!value) return;
    st.nodes.update({ id: _panelNodeId, nodeLink: { type: 'diagram', value } });
    markDirty();
    hideLinkPanel();
  } else if (typeNew) {
    const name = document.getElementById('linkNewName').value.trim();
    if (!name) return;
    _createAndLinkDiagram(name);
  }
}

async function _createAndLinkDiagram(title) {
  const id = 'd' + Date.now();
  await fetch(`/api/diagrams/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, nodes: [], edges: [] }),
  });
  const res   = await fetch('/api/diagrams');
  st.diagrams = await res.json();
  st.nodes.update({ id: _panelNodeId, nodeLink: { type: 'diagram', value: id } });
  markDirty();
  hideLinkPanel();
  showToast(t('diagram.toast.diagram_linked').replace('{title}', title));
}

export function removeLinkPanel() {
  if (_panelNodeId === null) return;
  st.nodes.update({ id: _panelNodeId, nodeLink: null });
  markDirty();
  hideLinkPanel();
}

// ── Navigation ────────────────────────────────────────────────────────────────
// Called on click (not drag). Returns true if navigation happened.

export function navigateNodeLink(nodeId) {
  const n    = st.nodes.get(nodeId);
  const link = n && n.nodeLink;
  if (!link) return false;
  if (link.type === 'url') {
    window.open(link.value, '_blank', 'noopener');
    return true;
  }
  if (link.type === 'diagram') {
    openDiagram(link.value);
    return true;
  }
  return false;
}

// ── Wire radio buttons ────────────────────────────────────────────────────────
['linkTypeUrl', 'linkTypeDiagram', 'linkTypeNew'].forEach((id) => {
  document.getElementById(id).addEventListener('change', _syncLinkPanelVisibility);
});
document.getElementById('btnLinkSave').addEventListener('click',   saveLinkPanel);
document.getElementById('btnLinkRemove').addEventListener('click', removeLinkPanel);
document.getElementById('btnLinkCancel').addEventListener('click', hideLinkPanel);
