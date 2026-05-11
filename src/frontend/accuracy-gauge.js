// ── Accuracy gauge ──────────────────────────────────────────────────────────
// Shown in the sticky document header (right-aligned, own row) when the
// current document has at least one metadata entry.

const RED = "#dc2626"; // red-600
const YELLOW = "#eab308"; // yellow-500
const GREEN = "#16a34a"; // green-600

function accuracyColor(ratio) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  if (pct > 80) return GREEN;
  if (pct >= 60) return YELLOW;
  if (pct >= 40) return "#f97316"; // orange-500
  return RED;
}

// Returns the CSS background for the gauge bar (always 100% wide).
// < 30%       → solid red
// 30–60%      → red → yellow gradient, red-dominant (yellow at 85%)
// 60–80%      → red → yellow gradient, yellow-dominant (red at 15%)
// 80–100%     → yellow → green gradient, green-dominant (yellow at 15%)
// 100%        → solid green
function accuracyBackground(ratio) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  if (pct >= 100) return GREEN;
  if (pct < 30) return RED;
  if (pct < 60) {
    return `linear-gradient(to right, ${RED} 0%, ${RED} 60%, ${YELLOW} 100%)`;
  }
  if (pct < 80) {
    return `linear-gradient(to right, ${RED} 0%, ${YELLOW} 40%, ${YELLOW} 100%)`;
  }
  return `linear-gradient(to right, ${YELLOW} 0%, ${GREEN} 40%, ${GREEN} 100%)`;
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
    bar.style.width = "100%";
    bar.style.background = accuracyBackground(report.accuracy);
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
