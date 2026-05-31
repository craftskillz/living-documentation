// ── Diagram Defaults Modal ─────────────────────────────────────────────────────
// Manages project-level creation defaults stored in .living-doc.json under
// the `diagramDefaults` key. Provides fallback values for node-panel and
// edge-panel when no last-used localStorage style exists.

import { t } from './t.js';
import { NODE_COLORS, DEFAULT_NODE_PALETTE } from './constants.js';
import { openColorPickerPopup, closeAllColorPickerPopups } from './color-picker.js';

const SHAPE_KEYS = ['box', 'ellipse', 'circle', 'database', 'actor', 'post-it', 'text-free'];

const SHAPE_SYSTEM_DEFAULTS = {
  box:        { width: 100, height: 40,  colorKey: 'c-gray',  fontSize: 13 },
  ellipse:    { width: 110, height: 50,  colorKey: 'c-gray',  fontSize: 13 },
  circle:     { width: 55,  height: 55,  colorKey: 'c-gray',  fontSize: 13 },
  database:   { width: 50,  height: 70,  colorKey: 'c-gray',  fontSize: 13 },
  actor:      { width: 30,  height: 52,  colorKey: 'c-gray',  fontSize: 13 },
  'post-it':  { width: 120, height: 100, colorKey: 'c-amber', fontSize: 13 },
  'text-free':{ width: 80,  height: 30,  colorKey: 'c-gray',  fontSize: 13 },
};

const ARROW_SYSTEM_DEFAULTS = { fontSize: 11, arrowDir: 'to', dashes: false };

let _cache = null; // null = not yet loaded from config

export function initDiagramDefaults(cfg) {
  _cache = cfg.diagramDefaults || null;
}

export function getDiagramDefaults() {
  return _cache;
}

// Returns the effective defaults for a shape, merging project defaults over system defaults.
export function getShapeDefaults(shapeType) {
  const system = SHAPE_SYSTEM_DEFAULTS[shapeType] || SHAPE_SYSTEM_DEFAULTS.box;
  const project = _cache?.shapes?.[shapeType] || {};
  return { ...system, ...project };
}

// Returns the effective defaults for arrows.
export function getArrowDefaults() {
  const project = _cache?.arrows || {};
  return { ...ARROW_SYSTEM_DEFAULTS, ...project };
}

// ── Modal ─────────────────────────────────────────────────────────────────────

const NODE_COLOR_ENTRIES = DEFAULT_NODE_PALETTE.map((key) => {
  const c = NODE_COLORS[key];
  return { value: key, bg: c.bg, border: c.border, label: key.replace('c-', '') };
});

function buildColorSwatch(selectedKey, shape) {
  const c = NODE_COLORS[selectedKey] || NODE_COLORS['c-gray'];
  return `
    <button type="button" class="ld-color-swatch-trigger" data-shape="${shape}"
      style="width:2rem;height:1.4rem;border-radius:0.25rem;border:2px solid ${c.border};background:${c.bg};cursor:pointer;flex-shrink:0;"
      title="${selectedKey.replace('c-', '')}">
    </button>`;
}

function renderModal() {
  const existing = document.getElementById('diagramDefaultsModal');
  if (existing) existing.remove();

  const effective = {
    arrows: getArrowDefaults(),
    shapes: Object.fromEntries(SHAPE_KEYS.map((k) => [k, getShapeDefaults(k)])),
  };

  const shapeLabels = {
    box: t('diagram.defaults.shape.box'),
    ellipse: t('diagram.defaults.shape.ellipse'),
    circle: t('diagram.defaults.shape.circle'),
    database: t('diagram.defaults.shape.database'),
    actor: t('diagram.defaults.shape.actor'),
    'post-it': t('diagram.defaults.shape.postit'),
    'text-free': t('diagram.defaults.shape.text_free'),
  };

  const arrowDirOptions = ['none', 'from', 'to', 'both'].map((d) => {
    const labels = { none: '—', from: '←', to: '→', both: '←→' };
    const sel = d === effective.arrows.arrowDir ? 'selected' : '';
    return `<option value="${d}" ${sel}>${labels[d]}</option>`;
  }).join('');

  const inputStyle = 'width:3.5rem;font-size:0.75rem;border:1px solid #d1d5db;border-radius:0.375rem;padding:0.2rem 0.4rem;background:inherit;color:inherit;text-align:center;';

  const shapeRows = SHAPE_KEYS.map((key) => {
    const sd = effective.shapes[key];
    return `
    <tr data-shape="${key}" style="border-top:1px solid var(--ld-modal-sep,#f3f4f6);">
      <td style="padding:0.45rem 0.5rem 0.45rem 0;font-size:0.8rem;font-weight:500;white-space:nowrap;">${shapeLabels[key]}</td>
      <td style="padding:0.45rem 0.25rem;text-align:center;">
        <input type="number" class="ld-defaults-input ld-defaults-width" data-shape="${key}" min="10" max="800" value="${sd.width}" style="${inputStyle}" />
      </td>
      <td style="padding:0.45rem 0.25rem;text-align:center;">
        <input type="number" class="ld-defaults-input ld-defaults-height" data-shape="${key}" min="10" max="800" value="${sd.height}" style="${inputStyle}" />
      </td>
      <td style="padding:0.45rem 0.25rem;text-align:center;">
        <input type="number" class="ld-defaults-input ld-defaults-font" data-shape="${key}" min="6" max="72" value="${sd.fontSize}" style="${inputStyle}" />
      </td>
      <td style="padding:0.45rem 0.25rem;text-align:center;">
        ${buildColorSwatch(sd.colorKey, key)}
        <input type="hidden" class="ld-defaults-color-key" data-shape="${key}" value="${sd.colorKey}" />
      </td>
    </tr>`;
  }).join('');

  const modal = document.createElement('div');
  modal.id = 'diagramDefaultsModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div class="ld-defaults-panel" style="
      background:var(--ld-modal-bg,white);
      border-radius:0.75rem;
      box-shadow:0 8px 32px rgba(0,0,0,0.22);
      width:min(560px,95vw);
      max-height:85vh;
      display:flex;flex-direction:column;
      overflow:hidden;
      color:var(--ld-modal-color,#111827);
    ">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.875rem 1rem;border-bottom:1px solid var(--ld-modal-sep,#e5e7eb);flex-shrink:0;">
        <span style="font-size:0.875rem;font-weight:600;">${t('diagram.defaults.title')}</span>
        <button id="btnDefaultsClose" style="background:none;border:none;cursor:pointer;font-size:1rem;color:currentColor;padding:0.25rem;">✕</button>
      </div>

      <!-- Body -->
      <div style="overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:1.25rem;">

        <!-- Arrows section -->
        <section>
          <div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:0.5rem;">${t('diagram.defaults.section.arrows')}</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;">
            <div style="display:flex;align-items:center;gap:0.375rem;">
              <label style="font-size:0.75rem;">${t('diagram.defaults.field.direction')}</label>
              <select id="defaultArrowDir" style="font-size:0.75rem;border:1px solid #d1d5db;border-radius:0.375rem;padding:0.2rem 0.4rem;background:inherit;color:inherit;">
                ${arrowDirOptions}
              </select>
            </div>
            <div style="display:flex;align-items:center;gap:0.375rem;">
              <label style="font-size:0.75rem;">${t('diagram.defaults.field.style')}</label>
              <select id="defaultArrowDashes" style="font-size:0.75rem;border:1px solid #d1d5db;border-radius:0.375rem;padding:0.2rem 0.4rem;background:inherit;color:inherit;">
                <option value="false" ${!effective.arrows.dashes ? 'selected' : ''}>${t('diagram.defaults.style.solid')}</option>
                <option value="true"  ${effective.arrows.dashes  ? 'selected' : ''}>${t('diagram.defaults.style.dashed')}</option>
              </select>
            </div>
            <div style="display:flex;align-items:center;gap:0.375rem;">
              <label style="font-size:0.75rem;">${t('diagram.defaults.field.font_size')}</label>
              <input id="defaultArrowFontSize" type="number" min="6" max="72" value="${effective.arrows.fontSize}"
                style="width:3.5rem;font-size:0.75rem;border:1px solid #d1d5db;border-radius:0.375rem;padding:0.2rem 0.4rem;background:inherit;color:inherit;" />
            </div>
          </div>
        </section>

        <!-- Shapes section -->
        <section>
          <div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:0.5rem;">${t('diagram.defaults.section.shapes')}</div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="font-size:0.7rem;font-weight:500;color:#9ca3af;text-align:left;padding:0 0.5rem 0.4rem 0;"></th>
                <th style="font-size:0.7rem;font-weight:500;color:#9ca3af;text-align:center;padding:0 0.25rem 0.4rem;">${t('diagram.defaults.field.width')}</th>
                <th style="font-size:0.7rem;font-weight:500;color:#9ca3af;text-align:center;padding:0 0.25rem 0.4rem;">${t('diagram.defaults.field.height')}</th>
                <th style="font-size:0.7rem;font-weight:500;color:#9ca3af;text-align:center;padding:0 0.25rem 0.4rem;">${t('diagram.defaults.field.font_size')}</th>
                <th style="font-size:0.7rem;font-weight:500;color:#9ca3af;text-align:center;padding:0 0.25rem 0.4rem;">${t('diagram.defaults.field.color')}</th>
              </tr>
            </thead>
            <tbody>
              ${shapeRows}
            </tbody>
          </table>
        </section>
      </div>

      <!-- Footer -->
      <div style="display:flex;justify-content:flex-end;gap:0.5rem;padding:0.75rem 1rem;border-top:1px solid var(--ld-modal-sep,#e5e7eb);flex-shrink:0;">
        <button id="btnDefaultsReset" style="font-size:0.75rem;padding:0.375rem 0.75rem;border:1px solid #d1d5db;border-radius:0.5rem;background:none;cursor:pointer;color:currentColor;">${t('common.reset')}</button>
        <button id="btnDefaultsSave" style="font-size:0.75rem;padding:0.375rem 0.875rem;border-radius:0.5rem;background:#3b82f6;color:white;border:none;cursor:pointer;font-weight:600;">${t('common.save')}</button>
      </div>
    </div>
  `;

  // Adapt to dark mode
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    const panel = modal.querySelector('.ld-defaults-panel');
    panel.style.setProperty('--ld-modal-bg', '#1f2937');
    panel.style.setProperty('--ld-modal-color', '#f3f4f6');
    panel.style.setProperty('--ld-modal-sep', '#374151');
    panel.style.background = '#1f2937';
    panel.style.color = '#f3f4f6';
    modal.querySelectorAll('input,select').forEach((el) => {
      el.style.background = '#111827';
      el.style.color = '#f3f4f6';
      el.style.borderColor = '#4b5563';
    });
  }

  document.body.appendChild(modal);

  // Wire color swatch triggers
  modal.querySelectorAll('.ld-color-swatch-trigger').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const shape = trigger.dataset.shape;
      const currentKey = modal.querySelector(`.ld-defaults-color-key[data-shape="${shape}"]`).value;
      openColorPickerPopup(trigger, NODE_COLOR_ENTRIES, currentKey, (entry) => {
        const c = NODE_COLORS[entry.value];
        modal.querySelector(`.ld-defaults-color-key[data-shape="${shape}"]`).value = entry.value;
        trigger.style.background = c.bg;
        trigger.style.borderColor = c.border;
        trigger.title = entry.label;
      });
    });
  });

  // Close
  const closeModal = () => { closeAllColorPickerPopups(); modal.remove(); };
  modal.querySelector('#btnDefaultsClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // Reset to system defaults
  modal.querySelector('#btnDefaultsReset').addEventListener('click', async () => {
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagramDefaults: null }),
      });
      _cache = null;
      modal.remove();
    } catch (err) {
      console.error('Failed to reset diagram defaults', err);
    }
  });

  // Save
  modal.querySelector('#btnDefaultsSave').addEventListener('click', async () => {
    const arrows = {
      fontSize: parseInt(modal.querySelector('#defaultArrowFontSize').value, 10) || 11,
      arrowDir: modal.querySelector('#defaultArrowDir').value,
      dashes: modal.querySelector('#defaultArrowDashes').value === 'true',
    };
    const shapes = {};
    SHAPE_KEYS.forEach((key) => {
      shapes[key] = {
        width:    parseInt(modal.querySelector(`.ld-defaults-width[data-shape="${key}"]`).value, 10)   || SHAPE_SYSTEM_DEFAULTS[key].width,
        height:   parseInt(modal.querySelector(`.ld-defaults-height[data-shape="${key}"]`).value, 10)  || SHAPE_SYSTEM_DEFAULTS[key].height,
        fontSize: parseInt(modal.querySelector(`.ld-defaults-font[data-shape="${key}"]`).value, 10)    || SHAPE_SYSTEM_DEFAULTS[key].fontSize,
        colorKey: modal.querySelector(`.ld-defaults-color-key[data-shape="${key}"]`).value             || SHAPE_SYSTEM_DEFAULTS[key].colorKey,
      };
    });
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagramDefaults: { arrows, shapes } }),
      });
      if (!res.ok) throw new Error(await res.text());
      _cache = { arrows, shapes };
      modal.remove();
    } catch (err) {
      console.error('Failed to save diagram defaults', err);
    }
  });
}

export function openDefaultsModal() {
  renderModal();
}
