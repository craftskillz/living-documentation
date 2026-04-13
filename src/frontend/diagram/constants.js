// ── Constants ─────────────────────────────────────────────────────────────────
// Pure compile-time values shared across all diagram modules.

export const GRID_SIZE = 40;

export const TOOL_BTN_MAP = {
  select: 'toolSelect',
  'addNode:box':       'toolBox',
  'addNode:ellipse':   'toolEllipse',
  'addNode:database':  'toolDatabase',
  'addNode:circle':    'toolCircle',
  'addNode:actor':     'toolActor',
  'addNode:post-it':   'toolPostIt',
  'addNode:text-free': 'toolTextFree',
  'addNode:image':     'toolImage',
  addEdge: 'toolArrow',
};

export const NODE_COLORS = {
  'c-gray':   { bg: '#f5f5f4', border: '#a8a29e', font: '#292524', hbg: '#e7e5e4', hborder: '#78716c' },
  'c-blue':   { bg: '#dbeafe', border: '#3b82f6', font: '#1e40af', hbg: '#bfdbfe', hborder: '#2563eb' },
  'c-green':  { bg: '#dcfce7', border: '#22c55e', font: '#166534', hbg: '#bbf7d0', hborder: '#16a34a' },
  'c-amber':  { bg: '#fef9c3', border: '#f59e0b', font: '#78350f', hbg: '#fef08a', hborder: '#d97706' },
  'c-rose':   { bg: '#ffe4e6', border: '#f43f5e', font: '#881337', hbg: '#fecdd3', hborder: '#e11d48' },
  'c-purple': { bg: '#ede9fe', border: '#8b5cf6', font: '#4c1d95', hbg: '#ddd6fe', hborder: '#7c3aed' },
  'c-teal':   { bg: '#ccfbf1', border: '#14b8a6', font: '#134e4a', hbg: '#99f6e4', hborder: '#0d9488' },
  'c-orange': { bg: '#ffedd5', border: '#f97316', font: '#7c2d12', hbg: '#fed7aa', hborder: '#ea580c' },
  'c-cyan':   { bg: '#cffafe', border: '#06b6d4', font: '#164e63', hbg: '#a5f3fc', hborder: '#0891b2' },
  'c-indigo': { bg: '#e0e7ff', border: '#6366f1', font: '#312e81', hbg: '#c7d2fe', hborder: '#4f46e5' },
  'c-pink':   { bg: '#fce7f3', border: '#ec4899', font: '#831843', hbg: '#fbcfe8', hborder: '#db2777' },
  'c-lime':   { bg: '#ecfccb', border: '#84cc16', font: '#365314', hbg: '#d9f99d', hborder: '#65a30d' },
  'c-red':    { bg: '#fee2e2', border: '#ef4444', font: '#7f1d1d', hbg: '#fecaca', hborder: '#dc2626' },
  'c-sky':    { bg: '#e0f2fe', border: '#0ea5e9', font: '#0c4a6e', hbg: '#bae6fd', hborder: '#0284c7' },
  'c-slate':  { bg: '#f1f5f9', border: '#64748b', font: '#0f172a', hbg: '#e2e8f0', hborder: '#475569' },
};

// Default palette shown in the diagram editor (can be overridden via admin config).
export const DEFAULT_NODE_PALETTE = [
  'c-gray','c-slate','c-blue','c-sky','c-cyan','c-teal','c-green','c-lime',
  'c-amber','c-orange','c-red','c-rose','c-pink','c-purple','c-indigo',
];

export const DEFAULT_EDGE_PALETTE = [
  '#a8a29e','#374151','#3b82f6','#14b8a6','#22c55e','#f97316','#ef4444','#a855f7',
];

// Per-slot lightness ratio (border_L / bg_L) derived from the original NODE_COLORS pairs.
// Applied when a slot's bg is customised so the border preserves the same contrast as the original.
export const NODE_L_RATIOS = {
  'c-gray':   0.667, 'c-slate':  0.488, 'c-blue':   0.645, 'c-sky':    0.518,
  'c-cyan':   0.473, 'c-teal':   0.448, 'c-green':  0.489, 'c-lime':   0.496,
  'c-amber':  0.570, 'c-orange': 0.578, 'c-red':    0.640, 'c-rose':   0.636,
  'c-pink':   0.638, 'c-purple': 0.694, 'c-indigo': 0.710,
};

// Derive border/font/hover colors from a custom bg hex, using HSL so the hue is preserved.
// lRatio = border_L / bg_L; use NODE_L_RATIOS[key] for per-slot accuracy.
export function deriveNodeColors(bgHex, lRatio = 0.60) {
  const r = parseInt(bgHex.slice(1, 3), 16) / 255;
  const g = parseInt(bgHex.slice(3, 5), 16) / 255;
  const b = parseInt(bgHex.slice(5, 7), 16) / 255;

  // RGB → HSL
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0, s = 0;
  if (d > 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if      (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else                h = ((r - g) / d + 4) / 6;
  }

  function hslToHex(hh, ss, ll) {
    let rr, gg, bb;
    if (ss === 0) {
      rr = gg = bb = ll;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
      const p = 2 * ll - q;
      rr = hue2rgb(p, q, hh + 1 / 3);
      gg = hue2rgb(p, q, hh);
      bb = hue2rgb(p, q, hh - 1 / 3);
    }
    return '#' + [rr, gg, bb]
      .map((v) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0'))
      .join('');
  }

  const borderL   = l * lRatio;
  const hbgL      = l * 0.93;          // slightly darker than bg for hover
  const hborderL  = borderL * 0.89;    // slightly darker than border for hover

  return {
    bg:      bgHex,
    border:  hslToHex(h, s, borderL),
    font:    l > 0.5 ? '#292524' : '#fafaf9',
    hbg:     hslToHex(h, s, Math.min(l, hbgL)),
    hborder: hslToHex(h, s, Math.min(borderL, hborderL)),
  };
}
