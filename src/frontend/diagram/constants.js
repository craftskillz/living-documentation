// ── Constants ─────────────────────────────────────────────────────────────────
// Pure compile-time values shared across all diagram modules.

export const GRID_SIZE = 40;

export const TOOL_BTN_MAP = {
  select: 'toolSelect',
  'addNode:box': 'toolBox',
  'addNode:ellipse': 'toolEllipse',
  'addNode:database': 'toolDatabase',
  'addNode:circle': 'toolCircle',
  'addNode:actor': 'toolActor',
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
