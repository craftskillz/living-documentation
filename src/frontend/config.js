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
    exclusiveFolderExpansion = !!cfg.exclusiveFolderExpansion;
    exclusiveCategoryExpansion = !!cfg.exclusiveCategoryExpansion;
    codeBlockMaxHeight =
      typeof cfg.codeBlockMaxHeight === "number" ? cfg.codeBlockMaxHeight : 400;
    if (codeBlockMaxHeight > 0) {
      document.documentElement.style.setProperty(
        "--ld-code-max-h",
        codeBlockMaxHeight + "px",
      );
    }
  } catch {
    await window.initI18n('en');
    /* non-fatal */
  }
}
