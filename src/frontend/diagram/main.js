// ── Application entry point ───────────────────────────────────────────────────
// Wires all toolbar buttons, keyboard shortcuts, and bootstraps the app.

import { st, markDirty }      from './state.js';
import { TOOL_BTN_MAP }       from './constants.js';
import { showNodePanel, hideNodePanel, setNodeColor, changeNodeFontSize, setTextAlign, setTextValign, changeZOrder, activateStamp, cancelStamp, stepRotate, toggleNodeLock } from './node-panel.js';
import { groupNodes, ungroupNodes } from './groups.js';
import { showLinkPanel, hideLinkPanel } from './link-panel.js';
import { hideEdgePanel, setEdgeArrow, setEdgeDashes, changeEdgeFontSize, stepEdgeLabelRotation, clearEdgePorts, setEdgeColor, changeEdgeWidth } from './edge-panel.js';
import { startLabelEdit, startEdgeLabelEdit, hideLabelInput } from './label-editor.js';
import { hideSelectionOverlay, toggleResizeMode } from './selection-overlay.js';
import { togglePhysics, toggleGrid } from './grid.js';
import { toggleDebug }   from './debug.js';
import { adjustZoom, resetZoom } from './zoom.js';
import { loadDiagramList, newDiagram, saveDiagram } from './persistence.js';
import { copySelected, pasteClipboard, copySelectionAsPng, saveSelectionAsPng } from './clipboard.js';
import { createImageNode, toggleEdgeStraight } from './network.js';
import { uploadImageBlob } from './image-upload.js';
import { promptImageName } from './image-name-modal.js';
import { showToast }       from './toast.js';

// ── Tool management ───────────────────────────────────────────────────────────

function setTool(tool, shape) {
  st.currentTool = tool;
  if (shape) st.pendingShape = shape;

  document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('tool-active'));
  if (st.physicsEnabled) document.getElementById('btnPhysics').classList.add('tool-active');

  const key = tool === 'addNode' ? `addNode:${shape || st.pendingShape}` : tool;
  const btn = document.getElementById(TOOL_BTN_MAP[key]);
  if (btn) btn.classList.add('tool-active');

  document.getElementById('vis-canvas').classList.toggle('cursor-crosshair', tool === 'addNode' || tool === 'addEdge');

  if (tool === 'addEdge' && st.network) st.network.addEdgeMode();
  else if (st.network) st.network.disableEditMode();
}

function selectAll() {
  if (!st.network || !st.nodes) return;
  const ids = st.nodes.getIds();
  st.network.selectNodes(ids);
  st.selectedNodeIds = ids;
  showNodePanel();
}

function deleteSelected() {
  if (!st.network) return;
  st.network.deleteSelected();
  hideNodePanel();
  hideEdgePanel();
  hideLabelInput();
  hideSelectionOverlay();
  st.editingNodeId = null;
  st.editingEdgeId = null;
  markDirty();
}

// ── Sidebar & dark mode ───────────────────────────────────────────────────────

function toggleSidebar() {
  st.sidebarOpen = !st.sidebarOpen;
  const sb = document.getElementById('sidebar');
  sb.style.width    = st.sidebarOpen ? '14rem' : '0';
  sb.style.overflow = st.sidebarOpen ? '' : 'hidden';
}

function toggleDark() {
  const dark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('ld-dark', dark);
  document.getElementById('darkIcon').textContent = dark ? '☀' : '☽';
}

// ── Toolbar button wiring ─────────────────────────────────────────────────────

document.getElementById('btnSidebar').addEventListener('click', toggleSidebar);

document.getElementById('toolSelect').addEventListener('click', () => setTool('select'));
document.getElementById('toolBox').addEventListener('click',      () => setTool('addNode', 'box'));
document.getElementById('toolEllipse').addEventListener('click',  () => setTool('addNode', 'ellipse'));
document.getElementById('toolDatabase').addEventListener('click', () => setTool('addNode', 'database'));
document.getElementById('toolCircle').addEventListener('click',   () => setTool('addNode', 'circle'));
document.getElementById('toolActor').addEventListener('click',    () => setTool('addNode', 'actor'));
document.getElementById('toolPostIt').addEventListener('click',   () => setTool('addNode', 'post-it'));
document.getElementById('toolTextFree').addEventListener('click', () => setTool('addNode', 'text-free'));
document.getElementById('toolImage').addEventListener('click',    () => setTool('addNode', 'image'));
document.getElementById('toolArrow').addEventListener('click',    () => setTool('addEdge'));

document.getElementById('btnDelete').addEventListener('click', deleteSelected);
document.getElementById('btnPhysics').addEventListener('click', togglePhysics);
document.getElementById('btnGrid').addEventListener('click', toggleGrid);
document.getElementById('btnEdgeStraight').addEventListener('click', toggleEdgeStraight);
document.getElementById('btnResizeMode').addEventListener('click', toggleResizeMode);

document.getElementById('btnZoomOut').addEventListener('click',   () => adjustZoom(-0.2));
document.getElementById('btnZoomIn').addEventListener('click',    () => adjustZoom(0.2));
document.getElementById('btnZoomReset').addEventListener('click', resetZoom);

document.getElementById('btnDark').addEventListener('click', toggleDark);
document.getElementById('btnDebug').addEventListener('click', toggleDebug);
document.getElementById('btnSave').addEventListener('click',  saveDiagram);
document.getElementById('btnNewDiagram').addEventListener('click', newDiagram);

// Dirty state on title edits
document.getElementById('diagramTitle').addEventListener('input', markDirty);

// ── Node panel wiring ─────────────────────────────────────────────────────────

document.getElementById('nodePanel').addEventListener('click', (e) => {
  const colorBtn = e.target.closest('[data-color]');
  if (colorBtn) setNodeColor(colorBtn.dataset.color);
});
document.getElementById('btnNodeLock').addEventListener('click', toggleNodeLock);
document.getElementById('btnNodeLabelEdit').addEventListener('click', startLabelEdit);
document.getElementById('btnNodeLink').addEventListener('click', () => {
  if (st.selectedNodeIds.length === 1) showLinkPanel(st.selectedNodeIds[0]);
});
document.getElementById('btnNodeFontDecrease').addEventListener('click', () => changeNodeFontSize(-1));
document.getElementById('btnNodeFontIncrease').addEventListener('click', () => changeNodeFontSize(1));
document.getElementById('btnAlignLeft').addEventListener('click',   () => setTextAlign('left'));
document.getElementById('btnAlignCenter').addEventListener('click', () => setTextAlign('center'));
document.getElementById('btnAlignRight').addEventListener('click',  () => setTextAlign('right'));
document.getElementById('btnValignTop').addEventListener('click',    () => setTextValign('top'));
document.getElementById('btnValignMiddle').addEventListener('click', () => setTextValign('middle'));
document.getElementById('btnValignBottom').addEventListener('click', () => setTextValign('bottom'));
document.getElementById('btnZOrderBack').addEventListener('click',  () => changeZOrder(-1));
document.getElementById('btnZOrderFront').addEventListener('click', () => changeZOrder(1));
document.getElementById('btnRotateCW').addEventListener('click',    () => stepRotate(10));
document.getElementById('btnRotateCCW').addEventListener('click',   () => stepRotate(-10));
// Stamp buttons: capture targets on mousedown (before vis-network can fire
// deselectNode), then activate the stamp mode on click.
['btnStampColor', 'btnStampFontSize'].forEach((id) => {
  document.getElementById(id).addEventListener('mousedown', (e) => {
    e.preventDefault(); // prevent canvas focus loss
    st.stampTargetIds = [...st.selectedNodeIds]; // save before any deselect fires
  });
});
document.getElementById('btnStampColor').addEventListener('click',    () => activateStamp('color'));
document.getElementById('btnStampFontSize').addEventListener('click', () => activateStamp('fontSize'));
const _autoSaveImg = new URLSearchParams(window.location.search).get('img');
const _onCopyPng = _autoSaveImg
  ? () => saveSelectionAsPng(_autoSaveImg)
  : () => copySelectionAsPng();
document.getElementById('btnCopyPng').addEventListener('click', _onCopyPng);
document.getElementById('btnGroup').addEventListener('click',   () => groupNodes());
document.getElementById('btnUngroup').addEventListener('click', () => ungroupNodes());

// ── Edge panel wiring ─────────────────────────────────────────────────────────

document.getElementById('edgeBtnNone').addEventListener('click',   () => setEdgeArrow('none'));
document.getElementById('edgeBtnTo').addEventListener('click',     () => setEdgeArrow('to'));
document.getElementById('edgeBtnBoth').addEventListener('click',   () => setEdgeArrow('both'));
document.getElementById('edgeBtnSolid').addEventListener('click',  () => setEdgeDashes(false));
document.getElementById('edgeBtnDashed').addEventListener('click', () => setEdgeDashes(true));
document.getElementById('btnEdgeFontDecrease').addEventListener('click', () => changeEdgeFontSize(-1));
document.getElementById('btnEdgeFontIncrease').addEventListener('click', () => changeEdgeFontSize(1));
document.getElementById('btnEdgeLabelEdit').addEventListener('click', startEdgeLabelEdit);
document.getElementById('btnEdgeLabelRotateCCW').addEventListener('click', () => stepEdgeLabelRotation(-Math.PI / 12));
document.getElementById('btnEdgeLabelRotateCW').addEventListener('click',  () => stepEdgeLabelRotation( Math.PI / 12));
document.getElementById('btnEdgeClearPorts').addEventListener('click', clearEdgePorts);
document.getElementById('btnEdgeWidthDecrease').addEventListener('click', () => changeEdgeWidth(-0.5));
document.getElementById('btnEdgeWidthIncrease').addEventListener('click', () => changeEdgeWidth(0.5));
document.getElementById('edgePanel').addEventListener('click', (e) => {
  const colorBtn = e.target.closest('[data-edge-color]');
  if (colorBtn) setEdgeColor(colorBtn.dataset.edgeColor);
});

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Delete' || e.key === 'Backspace')            { deleteSelected();           return; }
  if ((e.metaKey || e.ctrlKey) && e.key === 'a')             { e.preventDefault(); selectAll();       return; }
  if ((e.metaKey || e.ctrlKey) && e.key === 'c' && e.shiftKey) { e.preventDefault(); _onCopyPng(); return; }
  if ((e.metaKey || e.ctrlKey) && e.key === 'c')               { e.preventDefault(); copySelected();       return; }
  // Cmd+V is handled in the 'paste' event below (needs clipboardData access)
  if ((e.metaKey || e.ctrlKey) && e.key === 's')             { e.preventDefault(); saveDiagram();     return; }
  if (e.key === 'Escape' || e.key === 's' || e.key === 'S')  { cancelStamp(); hideLinkPanel(); setTool('select'); return; }
  if (e.key === 'r' || e.key === 'R')  { setTool('addNode', 'box');      return; }
  if (e.key === 'e' || e.key === 'E')  { setTool('addNode', 'ellipse');  return; }
  if (e.key === 'd' || e.key === 'D')  { setTool('addNode', 'database'); return; }
  if (e.key === 'c' || e.key === 'C')  { setTool('addNode', 'circle');   return; }
  if (e.key === 'a' || e.key === 'A')  { setTool('addNode', 'actor');    return; }
  if (e.key === 'f' || e.key === 'F')  { setTool('addEdge');                  return; }
  if (e.key === 'p' || e.key === 'P')  { setTool('addNode', 'post-it');       return; }
  if (e.key === 't' || e.key === 'T')  { setTool('addNode', 'text-free');     return; }
  if (e.key === 'g' || e.key === 'G')  { toggleGrid();                   return; }
});

// ── Paste (image or shapes) ───────────────────────────────────────────────────
document.addEventListener('paste', async (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (!st.network) return;
  e.preventDefault();

  const items     = Array.from(e.clipboardData?.items || []);
  const imageItem = items.find((it) => it.type.startsWith('image/'));

  if (imageItem) {
    const blob = imageItem.getAsFile();
    if (!blob) return;
    const ext = imageItem.type.split('/')[1] || 'png';

    const name = await promptImageName();
    if (name === null) return; // user cancelled

    try {
      const src = await uploadImageBlob(blob, ext, name);
      const center = st.network.getViewPosition();
      createImageNode(src, center.x, center.y);
      showToast('Image ajoutée');
      // Clear system clipboard so the next Cmd+V pastes shapes, not the image again
      // (our Cmd+C only writes to st.clipboard, not the system clipboard)
      navigator.clipboard.writeText('').catch(() => {});
    } catch {
      showToast('Impossible d\'importer l\'image', 'error');
    }
  } else {
    // No image — paste shapes from internal clipboard
    pasteClipboard();
  }
});

// ── Dark mode initialisation ──────────────────────────────────────────────────

document.getElementById('darkIcon').textContent =
  document.documentElement.classList.contains('dark') ? '☀' : '☽';

// ── Config fetch & debug button visibility ────────────────────────────────────

(async () => {
  try {
    const cfg = await fetch('/api/config').then((r) => r.json());
    if (cfg.showDiagramDebug) {
      document.getElementById('btnDebug').classList.remove('hidden');
      document.getElementById('sepDebug').classList.remove('hidden');
    }
  } catch {
    /* config unavailable — debug button stays hidden */
  }
})();

// ── Bootstrap ─────────────────────────────────────────────────────────────────

loadDiagramList();
