// ── Shared color picker popup ─────────────────────────────────────────────────
// Opens a mini popup with rectangular swatches anchored below a trigger element.
// Used by node-panel, edge-panel and defaults-modal.

export function closeAllColorPickerPopups() {
  document.querySelectorAll('.ld-color-popup').forEach((p) => p.remove());
}

/**
 * @param {HTMLElement} trigger  — the swatch button that was clicked
 * @param {Array<{bg: string, border: string, value: string, label?: string}>} entries
 * @param {string} selectedValue — currently selected value (matched against entry.value)
 * @param {function(entry): void} onSelect — called when user picks a color
 * @param {{ columns?: number }} [opts]
 */
export function openColorPickerPopup(trigger, entries, selectedValue, onSelect, opts = {}) {
  closeAllColorPickerPopups();

  const cols = opts.columns || 5;
  const isDark = document.documentElement.classList.contains('dark');

  const popup = document.createElement('div');
  popup.className = 'ld-color-popup';
  popup.style.cssText = `
    position:fixed;
    z-index:2000;
    background:${isDark ? '#1f2937' : 'white'};
    border:1px solid ${isDark ? '#4b5563' : '#e5e7eb'};
    border-radius:0.5rem;
    padding:0.5rem;
    box-shadow:0 8px 24px rgba(0,0,0,0.2);
    display:grid;
    grid-template-columns:repeat(${cols},1.5rem);
    gap:0.3rem;
  `;

  entries.forEach((entry) => {
    const isSelected = entry.value === selectedValue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = entry.label || entry.value;
    btn.style.cssText = `
      width:1.5rem;height:1.5rem;border-radius:0.25rem;
      background:${entry.bg};border:2px solid ${entry.border};
      cursor:pointer;
      ${isSelected ? 'outline:2px solid #f97316;outline-offset:1px;' : ''}
    `;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      popup.remove();
      onSelect(entry);
    });
    popup.appendChild(btn);
  });

  // Position below trigger, shift left if near right edge
  const rect = trigger.getBoundingClientRect();
  const popupW = cols * (24 + 4.8); // approx
  const left = Math.min(rect.left, window.innerWidth - popupW - 8);
  popup.style.top  = (rect.bottom + 4) + 'px';
  popup.style.left = Math.max(4, left) + 'px';

  document.body.appendChild(popup);

  const onOutside = (e) => {
    if (!popup.contains(e.target) && e.target !== trigger) {
      popup.remove();
      document.removeEventListener('click', onOutside, true);
    }
  };
  setTimeout(() => document.addEventListener('click', onOutside, true), 0);
}
