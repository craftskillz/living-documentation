// ── Pure utilities shared across index.html ──────────────────────────────────
// Loaded as a classic script; all symbols are global.

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Strip a leading numeric sort prefix (e.g. "1_tutorial" → "Tutorial").
// Underscores/hyphens become spaces, result is title-cased.
// The full original name is preserved in the tooltip.
function folderLabel(seg) {
  return seg
    .replace(/^\d+_/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
