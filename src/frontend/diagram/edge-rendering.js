// ── Edge rendering ────────────────────────────────────────────────────────────
// Builds vis.js edge property objects (arrows, dashes).

export function visEdgeProps(arrowDir, dashes) {
  return {
    arrows: {
      to:   { enabled: arrowDir === 'to'   || arrowDir === 'both', scaleFactor: 0.7 },
      from: { enabled: arrowDir === 'both',                        scaleFactor: 0.7 },
    },
    dashes: dashes === true,
  };
}
