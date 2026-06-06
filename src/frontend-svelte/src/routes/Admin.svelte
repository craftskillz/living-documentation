<script lang="ts">
  import { onMount } from "svelte";
  import ConfigSection from "../lib/ConfigSection.svelte";
  import FileBrowser from "../lib/FileBrowser.svelte";
  import DiagramPalettes from "../lib/DiagramPalettes.svelte";
  import Topbar from "../lib/Topbar.svelte";
  import { t, loadI18n } from "../lib/i18n.svelte";

  let { navigate }: { navigate: (to: string) => void } = $props();

  // ── Config state ─────────────────────────────────────────────────────────────

  let docsFolder = $state("");
  let port = $state("");
  let title = $state("");
  let theme = $state("system");
  let language = $state("en");
  let filenamePattern = $state("");
  let sourceRoot = $state("");
  let exclusiveFolderExpansion = $state(false);
  let exclusiveCategoryExpansion = $state(false);
  let codeBlockMaxHeight = $state(400);
  let markdownSoftBreaks = $state(false);
  let imageRoundedCorners = $state(false);
  let imageCentered = $state(false);
  let imageBorder = $state(false);
  let codeBlockLightTheme = $state(false);
  let blockedFileExtensions = $state("");
  let extraFiles = $state<string[]>([]);
  let nodePalette = $state<string[]>([]);
  let edgePalette = $state<string[]>([]);

  let saveMsg = $state<{ text: string; type: "ok" | "error" } | null>(null);
  let saveMsgTimer: number | null = null;

  let fileBrowser = $state<FileBrowser>(null!);

  // ── Pattern preview ───────────────────────────────────────────────────────────

  const EXAMPLES = [
    "2024_01_15_09_30_[DevOps]_deploy_pipeline.md",
    "2023_11_03_14_45_[Frontend]_react_hooks_guide.md",
    "2025_06_20_08_00_meeting_notes.md",
    "readme.md",
  ];

  function dateStrToISO(s: string) {
    const p = s.split("_");
    return p.length === 5 ? `${p[0]}-${p[1]}-${p[2]}T${p[3]}:${p[4]}` : `${p[0]}-${p[1]}-${p[2]}`;
  }

  function buildPatterns(patternStr: string) {
    if (!patternStr) patternStr = "YYYY_MM_DD_HH_mm_[Category]_title";
    const hasDate = /YYYY.*MM.*DD/.test(patternStr);
    const hasTime = hasDate && /HH.*mm/.test(patternStr);
    const hasCategory = /\[Category\]/i.test(patternStr);
    const dateGroup = hasTime ? "(\\d{4}_\\d{2}_\\d{2}(?:_\\d{2}_\\d{2})?)" : "(\\d{4}_\\d{2}_\\d{2})";
    const catGroup = "\\[([^\\]]+)\\]";
    const catBeforeDate = hasDate && hasCategory && patternStr.search(/\[Category\]/i) < patternStr.search(/YYYY/i);
    let full: RegExp | null = null, dateOnly: RegExp | null = null;
    if (hasDate && hasCategory) {
      const ordered = catBeforeDate ? `${catGroup}_${dateGroup}` : `${dateGroup}_${catGroup}`;
      full = new RegExp("^" + ordered + "_(.+)\\.md$", "i");
      dateOnly = new RegExp("^" + dateGroup + "_(.+)\\.md$", "i");
    } else if (hasDate) {
      dateOnly = new RegExp("^" + dateGroup + "_(.+)\\.md$", "i");
    } else if (hasCategory) {
      full = new RegExp("^" + catGroup + "_(.+)\\.md$", "i");
    }
    return { full, dateOnly, hasDate, hasCategory, catBeforeDate };
  }

  function titleCase(s: string) {
    return s.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }

  function parsePreview(filename: string, patterns: ReturnType<typeof buildPatterns>) {
    if (patterns.full) {
      const m = filename.match(patterns.full);
      if (m) {
        if (patterns.hasDate && patterns.hasCategory) {
          const dateStr = patterns.catBeforeDate ? m[2] : m[1];
          const category = patterns.catBeforeDate ? m[1] : m[2];
          return { date: dateStrToISO(dateStr), category, title: titleCase(m[3]), match: true };
        } else if (patterns.hasCategory) {
          return { date: null, category: m[1], title: titleCase(m[2]), match: true };
        }
      }
    }
    if (patterns.dateOnly) {
      const m = filename.match(patterns.dateOnly);
      if (m) return { date: dateStrToISO(m[1]), category: "General", title: titleCase(m[2]), match: true };
    }
    return { date: null, category: "General", title: filename.replace(".md", ""), match: false };
  }

  let patternPreviews = $derived(
    EXAMPLES.map(f => ({ filename: f, ...parsePreview(f, buildPatterns(filenamePattern)) }))
  );

  // ── Path helpers ─────────────────────────────────────────────────────────────

  function isAbsolutePath(p: string) {
    return /^([/\\]|[a-zA-Z]:[\\/]|~)/.test(p);
  }

  function pathRelative(from: string, to: string): string {
    if (!from) return to;
    const norm = (s: string) => s.replace(/\\/g, "/");
    const fromParts = norm(from).split("/").filter(Boolean);
    const toParts = norm(to).split("/").filter(Boolean);
    let common = 0;
    while (common < fromParts.length && common < toParts.length && fromParts[common] === toParts[common]) common++;
    const ups = fromParts.length - common;
    const downs = toParts.slice(common).join("/");
    let rel = "../".repeat(ups) + downs;
    if (rel.endsWith("/")) rel = rel.slice(0, -1);
    return rel === "" ? "." : rel;
  }

  // ── Load / Save ───────────────────────────────────────────────────────────────

  async function loadConfig() {
    try {
      const cfg = await fetch("/api/config").then(r => r.json());
      docsFolder = cfg.docsFolder || "";
      port = cfg.port || "";
      title = cfg.title || "";
      theme = cfg.theme || "system";
      language = cfg.language || "en";
      await loadI18n(language);
      filenamePattern = cfg.filenamePattern || "";
      sourceRoot = cfg.docsFolder && cfg.sourceRoot ? pathRelative(cfg.docsFolder, cfg.sourceRoot) : "";
      exclusiveFolderExpansion = !!cfg.exclusiveFolderExpansion;
      exclusiveCategoryExpansion = !!cfg.exclusiveCategoryExpansion;
      codeBlockMaxHeight = typeof cfg.codeBlockMaxHeight === "number" ? cfg.codeBlockMaxHeight : 400;
      markdownSoftBreaks = !!cfg.markdownSoftBreaks;
      imageRoundedCorners = !!cfg.imageRoundedCorners;
      imageCentered = !!cfg.imageCentered;
      imageBorder = !!cfg.imageBorder;
      codeBlockLightTheme = !!cfg.codeBlockLightTheme;
      blockedFileExtensions = (cfg.blockedFileExtensions || []).join(" ");
      extraFiles = cfg.extraFiles || [];
      const NODE_KEYS = ["c-white","c-gray","c-slate","c-blue","c-sky","c-cyan","c-teal","c-green","c-lime","c-amber","c-orange","c-red","c-rose","c-pink","c-purple"];
      const NODE_BG: Record<string,string> = {"c-white":"#ffffff","c-gray":"#f5f5f4","c-slate":"#f1f5f9","c-blue":"#dbeafe","c-sky":"#e0f2fe","c-cyan":"#cffafe","c-teal":"#ccfbf1","c-green":"#dcfce7","c-lime":"#ecfccb","c-amber":"#fef9c3","c-orange":"#ffedd5","c-red":"#fee2e2","c-rose":"#ffe4e6","c-pink":"#fce7f3","c-purple":"#ede9fe"};
      nodePalette = Array.isArray(cfg.diagramNodePalette) && cfg.diagramNodePalette.length
        ? NODE_KEYS.map((k, i) => cfg.diagramNodePalette[i] || NODE_BG[k])
        : NODE_KEYS.map(k => NODE_BG[k]);
      edgePalette = Array.isArray(cfg.diagramEdgePalette) && cfg.diagramEdgePalette.length
        ? [...cfg.diagramEdgePalette]
        : ["#ffffff","#a8a29e","#374151","#3b82f6","#14b8a6","#22c55e","#f97316","#ef4444","#a855f7"];
      fileBrowser.loadBrowse(cfg.docsFolder || "/");
    } catch {
      showMsg("Failed to load configuration.", "error");
    }
  }

  async function saveConfig(e: SubmitEvent) {
    e.preventDefault();
    const pattern = filenamePattern.trim();
    if (pattern) {
      const catCount = (pattern.match(/\[Category\]/gi) || []).length;
      if (catCount === 0) { showMsg("Pattern must include [Category].", "error"); return; }
      if (catCount > 1) { showMsg("Pattern must include [Category] only once.", "error"); return; }
    }
    if (sourceRoot !== "" && isAbsolutePath(sourceRoot)) {
      showMsg("Source root must be a relative path.", "error"); return;
    }
    const blocked = blockedFileExtensions.split(/[\s,]+/).map(e => e.trim().replace(/^\.+/, "").toLowerCase()).filter(e => /^[a-z0-9]+$/.test(e));
    const payload = {
      title, theme, language, filenamePattern: pattern,
      exclusiveFolderExpansion, exclusiveCategoryExpansion,
      codeBlockMaxHeight: Math.max(0, Math.min(5000, codeBlockMaxHeight || 0)),
      markdownSoftBreaks, imageRoundedCorners, imageCentered, imageBorder, codeBlockLightTheme,
      diagramNodePalette: [...nodePalette],
      diagramEdgePalette: [...edgePalette],
      sourceRoot: sourceRoot === "" ? null : sourceRoot,
      blockedFileExtensions: blocked,
    };
    try {
      const res = await fetch("/api/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      showMsg("Settings saved.", "ok");
    } catch (err: unknown) {
      showMsg("Save failed: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  }

  function showMsg(text: string, type: "ok" | "error") {
    saveMsg = { text, type };
    if (saveMsgTimer) clearTimeout(saveMsgTimer);
    if (type === "ok") saveMsgTimer = window.setTimeout(() => { saveMsg = null; }, 3000);
  }

  onMount(() => { loadConfig(); });
</script>

<div class="app-shell">
  <Topbar title={t("admin.title")} subtitle={t("admin.config.title")} />

  <div class="admin-scroll">
    <form class="admin-form" onsubmit={saveConfig} novalidate>

      <!-- Sticky save bar -->
      <div class="save-bar">
        <div class="save-bar-inner">
          <div>
            <h2 class="save-bar-title">{t("admin.config.title")}</h2>
            <p class="save-bar-desc">{t("admin.config.description")}</p>
          </div>
          <div class="save-bar-actions">
            {#if saveMsg}
              <span class="save-msg save-msg--{saveMsg.type}">{saveMsg.text}</span>
            {/if}
            <button type="submit" class="btn-primary">{t("admin.config.save_btn")}</button>
          </div>
        </div>
      </div>

      <div class="admin-sections">

        <!-- General -->
        <ConfigSection icon="🌐" title={t("admin.section.general.title")} description={t("admin.section.general.desc")}>
          <div class="field-row">
            <div class="info-item">
              <dt class="info-label">{t("admin.server_info.docs_folder")}</dt>
              <dd class="info-value">{docsFolder || "—"}</dd>
            </div>
            <div class="info-item">
              <dt class="info-label">{t("admin.server_info.port")}</dt>
              <dd class="info-value">{port || "—"}</dd>
            </div>
          </div>
          <div class="field-group">
            <label class="field-label" for="field-title">{t("admin.appearance.site_title_label")}</label>
            <input id="field-title" type="text" class="field-input" bind:value={title} placeholder={t("admin.appearance.site_title_placeholder")} />
            <p class="field-hint">{t("admin.appearance.site_title_hint")}</p>
          </div>
          <div class="field-group">
            <label class="field-label" for="field-theme">{t("admin.appearance.theme_label")}</label>
            <select id="field-theme" class="field-input" bind:value={theme}>
              <option value="system">{t("admin.appearance.theme_system")}</option>
              <option value="light">{t("admin.appearance.theme_light")}</option>
              <option value="dark">{t("admin.appearance.theme_dark")}</option>
            </select>
            <p class="field-hint">{t("admin.appearance.theme_hint")}</p>
          </div>
          <div class="field-group">
            <label class="field-label" for="field-language">{t("admin.appearance.language_label")}</label>
            <select id="field-language" class="field-input" bind:value={language} onchange={() => loadI18n(language)}>
              <option value="en">{t("admin.appearance.language_en")}</option>
              <option value="fr">{t("admin.appearance.language_fr")}</option>
            </select>
            <p class="field-hint">{t("admin.appearance.language_hint")}</p>
          </div>
        </ConfigSection>

        <!-- Filename convention -->
        <ConfigSection icon="📝" title={t("admin.section.filename.title")} description={t("admin.section.filename.desc")}>
          <div class="field-group">
            <label class="field-label" for="field-pattern">{t("admin.pattern.label")}</label>
            <input id="field-pattern" type="text" class="field-input" bind:value={filenamePattern} placeholder={t("admin.pattern.placeholder")} />
            <p class="field-hint">{t("admin.pattern.hint")} <code>{(filenamePattern || "YYYY_MM_DD_HH_mm_[Category]_title") + ".md"}</code></p>
          </div>
          <div class="pattern-preview">
            <h4 class="pattern-preview-title">{t("admin.pattern.preview_title")}</h4>
            <p class="field-hint">{t("admin.pattern.preview_desc")}</p>
            <div class="pattern-rows">
              {#each patternPreviews as p}
                <div class="pattern-row">
                  <p class="pattern-filename">{p.filename}</p>
                  <div class="pattern-cols">
                    <div>
                      <span class="pattern-col-label">{t("admin.pattern.col_date")}</span>
                      <span class={p.date ? "pattern-value--date" : "pattern-value--none"}>{p.date || t("admin.pattern.col_none")}</span>
                    </div>
                    <div>
                      <span class="pattern-col-label">{t("admin.pattern.col_category")}</span>
                      <span class="pattern-value--cat">{p.category}</span>
                    </div>
                    <div>
                      <span class="pattern-col-label">{t("admin.pattern.col_title")}</span>
                      <span class="pattern-value--title">{p.title}</span>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </ConfigSection>

        <!-- Source & extra files -->
        <ConfigSection icon="📂" title={t("admin.section.source.title")} description={t("admin.section.source.desc")}>
          <div class="field-group">
            <label class="field-label" for="field-source-root">{t("admin.server_info.source_root")}</label>
            <input id="field-source-root" type="text" class="field-input field-input--mono" bind:value={sourceRoot} placeholder=".." />
            <p class="field-hint">{t("admin.server_info.source_root_hint")}</p>
          </div>
          <FileBrowser bind:this={fileBrowser} {docsFolder} {extraFiles} onchange={(files) => (extraFiles = files)} />
        </ConfigSection>

        <!-- Sidebar behaviour -->
        <ConfigSection icon="🗂️" title={t("admin.section.sidebar.title")} description={t("admin.section.sidebar.desc")}>
          <div class="field-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={exclusiveFolderExpansion} />
              <span>{t("admin.appearance.exclusive_folder_label")}</span>
            </label>
            <p class="field-hint checkbox-hint">{t("admin.appearance.exclusive_folder_hint")}</p>
          </div>
          <div class="field-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={exclusiveCategoryExpansion} />
              <span>{t("admin.appearance.exclusive_category_label")}</span>
            </label>
            <p class="field-hint checkbox-hint">{t("admin.appearance.exclusive_category_hint")}</p>
          </div>
        </ConfigSection>

        <!-- Markdown rendering -->
        <ConfigSection icon="✍️" title={t("admin.section.markdown.title")} description={t("admin.section.markdown.desc")}>
          <div class="field-group">
            <label class="field-label" for="field-code-max-height">{t("admin.appearance.code_max_height_label")}</label>
            <input id="field-code-max-height" type="number" class="field-input" bind:value={codeBlockMaxHeight} min="0" max="5000" step="10" placeholder="400" />
            <p class="field-hint">{t("admin.appearance.code_max_height_hint")}</p>
          </div>
          <div class="field-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={markdownSoftBreaks} />
              <span>{t("admin.appearance.soft_breaks_label")}</span>
            </label>
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <p class="field-hint checkbox-hint">{@html t("admin.appearance.soft_breaks_hint")}</p>
          </div>
          <div class="field-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={imageRoundedCorners} />
              <span>{t("admin.appearance.image_rounded_label")}</span>
            </label>
            <p class="field-hint checkbox-hint">{t("admin.appearance.image_rounded_hint")}</p>
          </div>
          <div class="field-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={imageCentered} />
              <span>{t("admin.appearance.image_centered_label")}</span>
            </label>
            <p class="field-hint checkbox-hint">{t("admin.appearance.image_centered_hint")}</p>
          </div>
          <div class="field-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={imageBorder} />
              <span>{t("admin.appearance.image_border_label")}</span>
            </label>
            <p class="field-hint checkbox-hint">{t("admin.appearance.image_border_hint")}</p>
          </div>
          <div class="field-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={codeBlockLightTheme} />
              <span>{t("admin.appearance.code_light_theme_label")}</span>
            </label>
            <p class="field-hint checkbox-hint">{t("admin.appearance.code_light_theme_hint")}</p>
          </div>
        </ConfigSection>

        <!-- File attachments -->
        <ConfigSection icon="📎" title={t("admin.section.files.title")} description={t("admin.files.description")}>
          <div class="field-group">
            <label class="field-label" for="field-blocked">{t("admin.files.blocked_label")}</label>
            <textarea id="field-blocked" class="field-input field-input--mono" rows={3} bind:value={blockedFileExtensions} placeholder="exe sh bat cmd com scr ps1 msi"></textarea>
            <p class="field-hint">{t("admin.files.hint")}</p>
          </div>
        </ConfigSection>

        <!-- Diagram palettes -->
        <ConfigSection icon="🎨" title={t("admin.section.diagram.title")} description={t("admin.section.diagram.desc")}>
          <DiagramPalettes bind:nodePalette bind:edgePalette />
        </ConfigSection>

        <!-- Developer -->
        <ConfigSection icon="🛠️" title={t("admin.section.developer.title")} description={t("admin.section.developer.desc")}>
          <div class="field-group">
            <label class="checkbox-label">
              <input type="checkbox" />
              <span>{t("admin.appearance.debug_label")}</span>
            </label>
            <p class="field-hint checkbox-hint">{t("admin.appearance.debug_hint")}</p>
          </div>
        </ConfigSection>

      </div>
    </form>

    <!-- License -->
    <div class="admin-sections">
      <div class="license-card">
        <div class="license-banner">
          <span class="license-icon">📖</span>
          <div>
            <h3 class="license-title">{t("admin.license.title")}</h3>
            <p class="license-subtitle">{t("admin.license.subtitle")}</p>
          </div>
        </div>
        <div class="license-body">
          <p>{@html t("admin.license.body")}</p>
          <div class="license-links">
            <a href="https://www.linkedin.com/in/youssef-medaghri-alaoui-93b2922/" target="_blank" rel="noopener noreferrer" class="license-btn license-btn--linkedin">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.44-2.13 2.93v5.68H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.35-1.85 3.58 0 4.24 2.36 4.24 5.43v6.31ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.28V1.72C24 .77 23.2 0 22.22 0Z"/></svg>
              {t("admin.license.linkedin_btn")}
            </a>
            <a href="https://www.npmjs.com/package/living-ai-documentation" target="_blank" rel="noopener noreferrer" class="license-btn license-btn--npm">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M0 0v24h24V0H0Zm19.2 19.2H13.6V8h-3.2v11.2H4.8V4.8h14.4v14.4Z"/></svg>
              {t("admin.license.npm_btn")}
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
