// ── Long-press unlock ─────────────────────────────────────────────────────────
// Locked nodes/edges are fully non-interactive: any click on them is captured
// here before vis-network sees it. Holding the mouse button on a locked target
// for UNLOCK_HOLD_MS unlocks it, with a circular progress animation rendered
// next to the pointer. Releasing early or moving beyond a small tolerance
// cancels the hold without changing state.

import { st, markDirty } from './state.js';
import { pushSnapshot }  from './history.js';

const UNLOCK_HOLD_MS       = 2000;
const UNLOCK_MOVE_TOLERANCE = 8; // px

let _hold = null;

function isEdgeLocked(edge) {
  if (!edge) return false;
  const fromN = st.nodes && st.nodes.get(edge.from);
  const toN   = st.nodes && st.nodes.get(edge.to);
  const isFreeArrow = fromN && fromN.shapeType === 'anchor' && toN && toN.shapeType === 'anchor';
  return isFreeArrow ? !!(fromN.locked && toN.locked) : !!edge.edgeLocked;
}

// Returns a target descriptor ({type, id, ...}) if the DOM point lands on a
// locked node or locked edge, otherwise null.
function hitTestLocked(container, clientX, clientY) {
  if (!st.network || !st.nodes || !st.edges) return null;
  const rect = container.getBoundingClientRect();
  const pos  = { x: clientX - rect.left, y: clientY - rect.top };

  const nodeId = st.network.getNodeAt(pos);
  if (nodeId) {
    const n = st.nodes.get(nodeId);
    if (n && n.locked) {
      if (n.shapeType === 'anchor') {
        // Locked anchor → resolve to its parent free-arrow so the whole arrow unlocks.
        const edges = st.edges.get({ filter: (e) => e.from === nodeId || e.to === nodeId });
        for (const e of edges) {
          if (isEdgeLocked(e)) {
            return { type: 'edge', id: e.id, isFreeArrow: true, fromId: e.from, toId: e.to };
          }
        }
        return null;
      }
      return { type: 'node', id: nodeId };
    }
  }
  const edgeId = st.network.getEdgeAt(pos);
  if (edgeId) {
    const e = st.edges.get(edgeId);
    if (isEdgeLocked(e)) {
      const fromN = st.nodes.get(e.from);
      const toN   = st.nodes.get(e.to);
      const isFreeArrow = fromN && fromN.shapeType === 'anchor' && toN && toN.shapeType === 'anchor';
      return { type: 'edge', id: edgeId, isFreeArrow, fromId: e.from, toId: e.to };
    }
  }
  return null;
}

function createOverlay() {
  const C = 2 * Math.PI * 20;
  const el = document.createElement('div');
  el.className = 'unlock-hold-overlay';
  el.style.cssText = [
    'position:fixed',
    'pointer-events:none',
    'width:56px', 'height:56px',
    'z-index:10000',
    'transform:translate(-50%,-50%)',
    'transition:opacity 120ms',
    'opacity:0',
  ].join(';');
  el.innerHTML = `
    <svg viewBox="0 0 56 56" width="56" height="56">
      <circle cx="28" cy="28" r="24" fill="rgba(17,24,39,0.75)" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
      <circle class="uh-progress" cx="28" cy="28" r="20" fill="none"
              stroke="#f97316" stroke-width="3"
              stroke-dasharray="${C}" stroke-dashoffset="${C}"
              transform="rotate(-90 28 28)" stroke-linecap="round"/>
      <g transform="translate(20 19)" fill="none" stroke="#f9fafb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="7" width="12" height="10" rx="2"/>
        <path d="M5 7V5a3 3 0 0 1 6 0"/>
      </g>
    </svg>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  return el;
}

function positionOverlay(el, clientX, clientY) {
  el.style.left = (clientX + 28) + 'px';
  el.style.top  = (clientY + 28) + 'px';
}

function updateProgress(el, progress) {
  const C = 2 * Math.PI * 20;
  const ring = el.querySelector('.uh-progress');
  if (ring) ring.setAttribute('stroke-dashoffset', String(C * (1 - progress)));
}

function performUnlock(target) {
  if (!st.nodes || !st.edges || !st.network) return;
  pushSnapshot();
  if (target.type === 'node') {
    st.nodes.update({ id: target.id, locked: false, fixed: false, draggable: true });
    const bn = st.network.body.nodes[target.id];
    if (bn) bn.refreshNeeded = true;
  } else if (target.isFreeArrow) {
    [target.fromId, target.toId].forEach((nodeId) => {
      st.nodes.update({ id: nodeId, locked: false, fixed: false, draggable: true });
      const bn = st.network.body.nodes[nodeId];
      if (bn) bn.refreshNeeded = true;
    });
  } else {
    st.edges.update({ id: target.id, edgeLocked: false });
  }
  st.network.redraw();
  markDirty();
}

function cancelHold() {
  if (!_hold) return;
  clearTimeout(_hold.timeoutId);
  if (_hold.rafId) cancelAnimationFrame(_hold.rafId);
  if (_hold.overlay && _hold.overlay.parentNode) _hold.overlay.remove();
  document.removeEventListener('mouseup',   onUp,   true);
  document.removeEventListener('mousemove', onMove, true);
  _hold = null;
}

function tick() {
  if (!_hold) return;
  const elapsed  = Date.now() - _hold.startTime;
  const progress = Math.min(elapsed / UNLOCK_HOLD_MS, 1);
  updateProgress(_hold.overlay, progress);
  _hold.rafId = requestAnimationFrame(tick);
}

function onMove(e) {
  if (!_hold) return;
  positionOverlay(_hold.overlay, e.clientX, e.clientY);
  const dx = e.clientX - _hold.startPos.x;
  const dy = e.clientY - _hold.startPos.y;
  if (Math.hypot(dx, dy) > UNLOCK_MOVE_TOLERANCE) cancelHold();
}

function onUp() {
  cancelHold();
}

// Attaches the capture-phase mousedown handler that intercepts clicks on
// locked targets and starts the long-press unlock hold.
export function installUnlockHold(container) {
  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const target = hitTestLocked(container, e.clientX, e.clientY);
    if (!target) return;

    // Block vis-network, panels, and all other handlers.
    e.stopImmediatePropagation();
    e.preventDefault();

    cancelHold();
    const overlay = createOverlay();
    positionOverlay(overlay, e.clientX, e.clientY);
    _hold = {
      target,
      startTime: Date.now(),
      startPos: { x: e.clientX, y: e.clientY },
      overlay,
      rafId: null,
      timeoutId: setTimeout(() => {
        performUnlock(target);
        cancelHold();
      }, UNLOCK_HOLD_MS),
    };
    tick();
    document.addEventListener('mouseup',   onUp,   true);
    document.addEventListener('mousemove', onMove, true);
  }, { capture: true });
}
