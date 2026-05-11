// ── Zoom controls ─────────────────────────────────────────────────────────────

import { st } from './state.js';

export function adjustZoom(delta) {
  if (!st.network) return;
  st.network.moveTo({ scale: Math.max(0.1, Math.min(3, st.network.getScale() + delta)), animation: false });
  updateZoomDisplay();
}

export function resetZoom() {
  if (!st.network) return;
  st.network.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
  setTimeout(updateZoomDisplay, 350);
}

export function updateZoomDisplay() {
  if (!st.network) return;
  document.getElementById('zoomLevel').textContent = Math.round(st.network.getScale() * 100) + '%';
}
