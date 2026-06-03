import { st } from './state.js';

export const CUSTOM_SHAPE_TYPE = 'custom-shape';
export const CUSTOM_SHAPE_TOOL_PREFIX = 'custom-shape:';
export const CUSTOM_SHAPE_DEFAULT_SIZE = 65;

export const DEFAULT_CUSTOM_ANCHORS = [
  { id: 'N',  x: 0.5, y: 0   },
  { id: 'NE', x: 1,   y: 0   },
  { id: 'E',  x: 1,   y: 0.5 },
  { id: 'SE', x: 1,   y: 1   },
  { id: 'S',  x: 0.5, y: 1   },
  { id: 'SW', x: 0,   y: 1   },
  { id: 'W',  x: 0,   y: 0.5 },
  { id: 'NW', x: 0,   y: 0   },
];

export function isCustomShapeTool(shape) {
  return typeof shape === 'string' && shape.startsWith(CUSTOM_SHAPE_TOOL_PREFIX);
}

export function customShapeIdFromTool(shape) {
  return isCustomShapeTool(shape) ? shape.slice(CUSTOM_SHAPE_TOOL_PREFIX.length) : null;
}

export function getCustomShapeDefinition(id) {
  if (!id) return null;
  return st.customShapeDefs && st.customShapeDefs.get(id) || null;
}

export function getCustomShapeDefaultSize(id) {
  const def = getCustomShapeDefinition(id);
  return [
    (def && def.width) || CUSTOM_SHAPE_DEFAULT_SIZE,
    (def && def.height) || CUSTOM_SHAPE_DEFAULT_SIZE,
  ];
}

export function getCustomShapeAnchors(id) {
  const def = getCustomShapeDefinition(id);
  return def && Array.isArray(def.anchors) && def.anchors.length
    ? def.anchors
    : DEFAULT_CUSTOM_ANCHORS;
}

export function getCustomShapeLabelPlacement(id) {
  const def = getCustomShapeDefinition(id);
  return def && ['center', 'below', 'above', 'right', 'left'].includes(def.labelPlacement)
    ? def.labelPlacement
    : 'below';
}

export async function loadCustomShapeLibraries() {
  try {
    const res = await fetch('/api/shape-libraries');
    if (!res.ok) throw new Error('shape libraries unavailable');
    const store = await res.json();
    const libraries = Array.isArray(store.libraries) ? store.libraries : [];
    st.customShapeLibraries = libraries;
    st.customShapeDefs = new Map();
    libraries.forEach((library) => {
      (library.shapes || []).forEach((shape) => st.customShapeDefs.set(shape.id, shape));
    });
  } catch {
    st.customShapeLibraries = [];
    st.customShapeDefs = new Map();
  }
}

export function renderCustomShapeBar() {
  const bar = document.getElementById('customShapeBar');
  const body = document.getElementById('customShapeBarBody');
  if (!bar || !body) return;

  body.innerHTML = '';
  const libraries = st.customShapeLibraries || [];
  const shapes = libraries.flatMap((library) =>
    (library.shapes || [])
      .filter((shape) => shape.showInDiagram !== false)
      .map((shape) => ({ ...shape, libraryName: library.name })),
  );
  bar.classList.toggle('hidden', shapes.length === 0);

  shapes.forEach((shape) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'custom-shape-btn';
    btn.title = `${shape.libraryName || ''}${shape.libraryName ? ' · ' : ''}${shape.name}`;
    btn.dataset.customShapeId = shape.id;

    const img = document.createElement('img');
    img.src = shape.imageSrc;
    img.alt = '';
    img.draggable = false;
    btn.appendChild(img);

    btn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('diagram:setTool', {
        detail: { tool: 'addNode', shape: `${CUSTOM_SHAPE_TOOL_PREFIX}${shape.id}` },
      }));
    });
    body.appendChild(btn);
  });
}
