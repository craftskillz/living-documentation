// ── Accuracy gauge ──────────────────────────────────────────────────────────
// Shown in the sticky document header (right-aligned, own row) when the
// current document has at least one metadata entry.

function accuracyColor(ratio) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  if (pct > 80) return "#16a34a"; // green-600
  if (pct >= 60) return "#eab308"; // yellow-500
  if (pct >= 40) return "#f97316"; // orange-500
  return "#dc2626"; // red-600
}

function renderAccuracyGauge(report) {
  const wrap = document.getElementById("accuracy-gauge");
  if (!wrap) return;
  if (!report || report.total === 0) {
    wrap.classList.add("hidden");
    return;
  }
  wrap.classList.remove("hidden");

  const pct = Math.round(report.accuracy * 100);
  const color = accuracyColor(report.accuracy);

  const label = document.getElementById("accuracy-gauge-label");
  const bar = document.getElementById("accuracy-gauge-bar");
  const value = document.getElementById("accuracy-gauge-value");

  if (label) label.textContent = window.t("accuracy.label");
  if (bar) {
    bar.style.width = pct + "%";
    // The gradient spans the full track width, so we stretch the background
    // to (100/pct)× the bar width — this way the bar only shows the left
    // portion of the red→green gradient corresponding to its percentage.
    bar.style.backgroundSize = pct > 0 ? `${10000 / pct}% 100%` : "100% 100%";
  }
  if (value) {
    value.textContent = pct + "%";
    value.style.color = color;
  }

  wrap.title = window
    .t("accuracy.tooltip")
    .replace("{unchanged}", String(report.unchanged))
    .replace("{modified}", String(report.modified))
    .replace("{missing}", String(report.missing))
    .replace("{total}", String(report.total));
}

window.renderAccuracyGauge = renderAccuracyGauge;
