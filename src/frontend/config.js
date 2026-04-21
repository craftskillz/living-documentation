// ── Configuration loading ────────────────────────────────────────────────────

async function loadConfig() {
  try {
    const cfg = await fetch("/api/config").then((r) => r.json());
    await window.initI18n(cfg.language || 'en');
    window.applyI18n();
    if (cfg.title) document.title = cfg.title;
    document.getElementById("app-title").textContent =
      cfg.title || "Living Documentation";
    if (cfg.filenamePattern) {
      document.getElementById("welcome-pattern").textContent =
        cfg.filenamePattern + ".md";
    }
  } catch {
    await window.initI18n('en');
    /* non-fatal */
  }
}
