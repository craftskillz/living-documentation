<script lang="ts">
  import { onMount } from "svelte";
  import { t, loadI18n } from "../lib/i18n.svelte";
  import "../lib/diagram/diagram.css";

  onMount(() => {
    let cleanup: (() => void) | undefined;
    // The diagram engine modules wire DOM elements at import time, so import
    // them dynamically AFTER this component's markup is mounted (and after i18n
    // is loaded so the first paint of {t(...)} is localised).
    (async () => {
      let lang = "en";
      try {
        const cfg = await fetch("/api/config").then((r) => r.json());
        lang = cfg.language || "en";
      } catch {
        /* config unavailable — fall back to English */
      }
      await loadI18n(lang);
      const { initDiagram } = await import("../lib/diagram/main");
      cleanup = initDiagram();
      // Restore persisted sidebar width
      const sb = document.getElementById("sidebar");
      const saved = parseInt(localStorage.getItem(SB_KEY) || "", 10);
      if (sb && Number.isFinite(saved)) sb.style.width = saved + "px";
    })();
    return () => cleanup?.();
  });

  // ── Resizable diagram sidebar ──────────────────────────────────────────────
  const SB_KEY = "ld-diagram-sidebar-w";
  const SB_MIN = 160, SB_MAX = 480;
  let sbDragging = $state(false);

  function startSidebarResize(e: MouseEvent) {
    e.preventDefault();
    const sb = document.getElementById("sidebar");
    if (!sb) return;
    const startX = e.clientX;
    const startW = sb.getBoundingClientRect().width;
    sbDragging = true;
    sb.style.transition = "none";
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(SB_MIN, Math.min(SB_MAX, startW + ev.clientX - startX));
      sb.style.width = w + "px";
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      sbDragging = false;
      sb.style.transition = "";
      try { localStorage.setItem(SB_KEY, String(parseInt(sb.style.width, 10))); } catch {}
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }
</script>

<div class="flex flex-col h-screen overflow-hidden bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- ── Top bar ── -->
    <header
      class="flex items-center gap-1 px-2 h-12 shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm z-10"
    >
      <button
        onclick={() => history.back()}
        class="tool-btn !w-auto px-2 text-xs font-medium text-gray-500 dark:text-gray-400"
        >{t("diagram.back_btn")}</button
      >
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>
      <button id="btnSidebar" class="tool-btn" title={t("diagram.diagrams_list_title")}>
        ☰
      </button>
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>

      <button
        id="btnCopyDiagramId"
        class="tool-btn"
        title={t("diagram.toolbar.copy_mcp_id")}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="5" y="5" width="8" height="9" rx="1.5" />
          <path d="M3 11V3a1 1 0 0 1 1-1h7" />
        </svg>
      </button>
      <button
        id="toolSelect"
        class="tool-btn tool-active"
        title={t("diagram.toolbar.select")}
      >
        <svg
          width="11"
          height="13"
          viewBox="0 0 11 13"
          fill="currentColor"
          stroke="none"
        >
          <path d="M1 1 L1 12 L4 9 L6.5 13 L8 12.2 L5.5 8.2 L10 8.2 Z" />
        </svg>
      </button>
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>

      <button
        id="toolBox"
        class="tool-btn"
        title={t("diagram.toolbar.box")}
      >
        <svg
          width="15"
          height="10"
          viewBox="0 0 15 10"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <rect x="1" y="1" width="13" height="8" rx="1" />
        </svg>
      </button>
      <button
        id="toolEllipse"
        class="tool-btn"
        title={t("diagram.toolbar.ellipse")}
      >
        <svg
          width="16"
          height="10"
          viewBox="0 0 16 10"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <ellipse cx="8" cy="5" rx="7" ry="4" />
        </svg>
      </button>
      <button
        id="toolDatabase"
        class="tool-btn"
        title={t("diagram.toolbar.database")}
      >
        <svg
          width="12"
          height="16"
          viewBox="0 0 12 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        >
          <ellipse cx="6" cy="3" rx="5" ry="2" />
          <path d="M1 3v10c0 1.1 2.2 2 5 2s5-.9 5-2V3" />
          <path d="M11 7.5c0 1.1-2.2 2-5 2s-5-.9-5-2" />
        </svg>
      </button>
      <button
        id="toolCircle"
        class="tool-btn"
        title={t("diagram.toolbar.circle")}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <circle cx="6.5" cy="6.5" r="5.5" />
        </svg>
      </button>
      <button
        id="toolActor"
        class="tool-btn"
        title={t("diagram.toolbar.actor")}
      >
        <svg
          width="12"
          height="17"
          viewBox="0 0 12 17"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        >
          <circle cx="6" cy="3" r="2.2" />
          <line x1="6" y1="5.2" x2="6" y2="10" />
          <line x1="1.5" y1="7.5" x2="10.5" y2="7.5" />
          <line x1="6" y1="10" x2="2.5" y2="15" />
          <line x1="6" y1="10" x2="9.5" y2="15" />
        </svg>
      </button>
      <button
        id="toolPostIt"
        class="tool-btn"
        title={t("diagram.toolbar.postit")}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M1 1 H9 L12 4 V12 H1 Z" />
          <path d="M9 1 V4 H12" stroke-opacity="0.5"/>
        </svg>
      </button>
      <button
        id="toolTextFree"
        class="tool-btn"
        title={t("diagram.toolbar.text_free")}
        style="font-size:11px; font-weight:600;"
      >
        T
      </button>
      <button
        id="toolImage"
        class="tool-btn"
        title={t("diagram.toolbar.image")}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="1" width="12" height="12" rx="1.5"/>
          <circle cx="4.5" cy="4.5" r="1.2"/>
          <path d="M1 9.5 L4 6.5 L6.5 9 L9 7 L13 10.5"/>
        </svg>
      </button>
      <a
        href="/shape-editor"
        class="tool-btn"
        title={t("diagram.toolbar.shape_editor")}
      >
        ✦
      </a>
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>

      <button
        id="toolArrow"
        class="tool-btn"
        title={t("diagram.toolbar.arrow")}
      >
        →
      </button>
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>

      <button
        id="btnDelete"
        class="tool-btn"
        title={t("diagram.toolbar.delete")}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 11 11"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        >
          <line x1="1" y1="1" x2="10" y2="10" />
          <line x1="10" y1="1" x2="1" y2="10" />
        </svg>
      </button>
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>

      <button
        id="btnDiagramDefaults"
        class="tool-btn"
        title={t("diagram.toolbar.defaults")}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
          <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.474l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z"/>
        </svg>
      </button>
      <button
        id="btnAlign"
        class="tool-btn"
        title={t("diagram.toolbar.align_guides")}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        >
          <line x1="0.5" y1="7.5" x2="13.5" y2="7.5" />
          <line x1="3.5" y1="0.5" x2="3.5" y2="13.5" stroke-dasharray="1.5 1.5" />
          <line x1="10.5" y1="0.5" x2="10.5" y2="13.5" stroke-dasharray="1.5 1.5" />
        </svg>
      </button>
      <button
        id="btnGrid"
        class="tool-btn"
        title={t("diagram.toolbar.grid")}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
        >
          <line x1="5" y1="1" x2="5" y2="13" />
          <line x1="9" y1="1" x2="9" y2="13" />
          <line x1="1" y1="5" x2="13" y2="5" />
          <line x1="1" y1="9" x2="13" y2="9" />
          <rect x="1" y="1" width="12" height="12" rx="1" />
        </svg>
      </button>
      <button
        id="btnEdgeStraight"
        class="tool-btn"
        title={t("diagram.toolbar.edge_style")}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <line x1="2" y1="12" x2="12" y2="2" />
          <polyline points="8,2 12,2 12,6" />
        </svg>
      </button>
      <button
        id="btnEvidenceMode"
        class="tool-btn"
        title={t("diagram.toolbar.evidence_mode")}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 1.5 H8.5 L11 4 V12.5 H4 Z" />
          <path d="M8.5 1.5 V4 H11" />
          <path d="M1.5 5.5 H6.5" />
          <path d="M1.5 8 H6.5" />
          <path d="M1.5 10.5 H5" />
        </svg>
      </button>
      <button
        id="btnResizeMode"
        class="tool-btn active-tool"
        title={t("diagram.toolbar.resize_corner")}
      >
        <!-- icon-resize-corner: dashed square + single arrow top-right → bottom-left -->
        <svg id="icon-resize-corner" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="1" width="12" height="12" stroke-dasharray="2.5 2" />
          <line x1="4" y1="4" x2="10" y2="10" />
          <polyline points="7,10 10,10 10,7" />
        </svg>
        <!-- icon-resize-center: dashed square + two double-headed diagonal arrows -->
        <svg id="icon-resize-center" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="hidden">
          <rect x="1" y="1" width="12" height="12" stroke-dasharray="2.5 2" />
          <line x1="4" y1="4" x2="10" y2="10" />
          <polyline points="4,6.5 4,4 6.5,4" />
          <polyline points="10,7.5 10,10 7.5,10" />
          <line x1="10" y1="4" x2="4" y2="10" />
          <polyline points="7.5,4 10,4 10,6.5" />
          <polyline points="4,7.5 4,10 6.5,10" />
        </svg>
      </button>
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>

      <input
        id="diagramTitle"
        type="text"
        placeholder={t("diagram.toolbar.title_placeholder")}
        class="flex-1 min-w-0 px-2 py-1 text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
      />
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>

      <button id="btnZoomOut" class="tool-btn" title={t("diagram.toolbar.zoom_out")}>
        −
      </button>
      <span
        id="zoomLevel"
        class="text-xs text-gray-500 dark:text-gray-400 w-10 text-center tabular-nums select-none"
        >100%</span
      >
      <button id="btnZoomIn" class="tool-btn" title={t("diagram.toolbar.zoom_in")}>
        +
      </button>
      <button id="btnZoomReset" class="tool-btn" title={t("diagram.toolbar.fit")}>
        ⊡
      </button>
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>

      <button id="btnDark" class="tool-btn">
        <span id="darkIcon">☽</span>
      </button>
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>

      <button
        id="btnDebug"
        class="hidden tool-btn text-xs font-mono"
        title={t("diagram.toolbar.debug")}
      >
        dbg
      </button>
      <div
        id="sepDebug"
        class="hidden w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5"
      ></div>

      <button
        id="btnExportDrawio"
        class="tool-btn"
        title={t("diagram.toolbar.export_drawio")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>

      <button
        id="btnSave"
        disabled
        class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-colors"
      >
        <span >{t("diagram.toolbar.save")}</span>
      </button>
    </header>

    <!-- ── Body ── -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <div
        id="sidebar"
        class="w-56 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col overflow-hidden"
        style="transition: width 0.2s ease"
      >
        <div
          class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0"
        >
          <span
            class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >{t("diagram.sidebar.title")}</span
          >
          <button
            id="btnNewDiagram"
            class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >{t("diagram.sidebar.new_btn")}</button>
        </div>
        <div id="diagramList" class="flex-1 overflow-y-auto py-1"></div>
      </div>

      <!-- Sidebar resize handle -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        onmousedown={startSidebarResize}
        role="separator"
        aria-orientation="vertical"
        class="w-1 shrink-0 cursor-col-resize select-none transition-colors {sbDragging ? 'bg-blue-500/60' : 'bg-transparent hover:bg-blue-500/40'}"
      ></div>

      <!-- Canvas area -->
      <div class="relative flex-1 overflow-hidden bg-gray-50 dark:bg-gray-950">
        <div id="vis-canvas" class="w-full h-full"></div>

        <div id="customShapeBar" class="hidden">
          <div id="customShapeBarBody"></div>
        </div>

        <!-- Debug overlay layer -->
        <div id="debugLayer"></div>

        <!-- Evidence markers layer -->
        <div id="evidenceLayer" class="hidden"></div>

        <!-- Stamp overlay: intercepts canvas clicks during stamp mode -->
        <div id="stampOverlay" style="position:absolute;inset:0;display:none;z-index:11;cursor:crosshair;"></div>

        <!-- Selection / resize overlay -->
        <div id="selectionOverlay">
          <div
            id="rh-tl"
            class="resize-handle"
            style="top: -5px; left: -5px; cursor: nw-resize"
          ></div>
          <div
            id="rh-tr"
            class="resize-handle"
            style="top: -5px; right: -5px; cursor: ne-resize"
          ></div>
          <div
            id="rh-bl"
            class="resize-handle"
            style="bottom: -5px; left: -5px; cursor: sw-resize"
          ></div>
          <div
            id="rh-br"
            class="resize-handle"
            style="bottom: -5px; right: -5px; cursor: se-resize"
          ></div>
          <div id="rh-rotate" title={t("diagram.selection.rotate_shape")}>↻</div>
          <div id="rh-label-rotate" title={t("diagram.selection.rotate_text")} style="left: 0; top: -28px;">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <g transform="rotate(25,5,5)">
                <line x1="2.5" y1="3" x2="7.5" y2="3"/>
                <line x1="5" y1="3" x2="5" y2="8"/>
              </g>
            </svg>
          </div>
        </div>

        <!-- Evidence panel -->
        <aside
          id="evidencePanel"
          class="hidden absolute top-0 right-0 bottom-0 w-80 max-w-[85vw] z-30 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl flex flex-col"
        >
          <div class="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2
              id="evidencePanelTitle"
              class="text-sm font-semibold text-gray-800 dark:text-gray-100"
              >{t("diagram.evidence.panel_title")}</h2>
            <button
              id="btnEvidenceClose"
              class="tool-btn !w-7 !h-7"
              title={t("diagram.evidence.close")}
            >×</button>
          </div>
          <div id="evidencePanelBody" class="flex-1 overflow-y-auto p-3 space-y-3"></div>
        </aside>

        <!-- Node panel -->
        <div id="nodePanel" class="float-panel hidden">
          <button
            id="btnNodeLock"
            class="tool-btn !w-6 !h-6 text-sm"
            title={t("diagram.node_panel.lock")}
          >🔒</button>
          <div class="panel-sep"></div>
          <div id="nodePanelControls" class="contents">
          <button id="nodeColorSwatch"
            style="width:1.5rem;height:1.5rem;border-radius:0.25rem;border:2px solid #a8a29e;background:#f5f5f4;cursor:pointer;flex-shrink:0;"
            title={t("diagram.node_panel.color")}></button>
          <div class="panel-sep"></div>
          <input
            id="nodeBgOpacity"
            type="range"
            min="0"
            max="100"
            step="5"
            value="100"
            class="w-16 h-1 accent-orange-500 cursor-pointer"
            title={t("diagram.node_panel.bg_opacity")}
          />
          <div class="panel-sep"></div>
          <button
            id="btnNodeLabelEdit"
            class="tool-btn !w-6 !h-6"
            title={t("diagram.node_panel.edit_label")}
          >
            ✎
          </button>
          <button
            id="btnNodeLink"
            class="tool-btn !w-6 !h-6"
            title={t("diagram.node_panel.edit_link")}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 7.5a3.5 3.5 0 0 0 5 0l1.5-1.5a3.5 3.5 0 0 0-5-5L5 2.5"/>
              <path d="M8 5.5a3.5 3.5 0 0 0-5 0L1.5 7a3.5 3.5 0 0 0 5 5L8 10.5"/>
            </svg>
          </button>
          <div class="panel-sep"></div>
          <button
            id="btnNodeFontDecrease"
            class="tool-btn !w-8 !h-6"
            style="font-size: 10px"
            title={t("diagram.node_panel.font_decrease")}
          >
            Aa−
          </button>
          <span
            id="nodeFontSizeValue"
            class="inline-flex items-center justify-center min-w-[2.25rem] h-6 px-1 text-[11px] font-mono text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded bg-white/80 dark:bg-gray-800/80"
            title={t("diagram.node_panel.font_size_value")}
          >13</span>
          <button
            id="btnNodeFontIncrease"
            class="tool-btn !w-8 !h-6"
            style="font-size: 10px"
            title={t("diagram.node_panel.font_increase")}
          >
            Aa+
          </button>
          <div class="panel-sep"></div>
          <!-- Horizontal align -->
          <button
            id="btnAlignLeft"
            class="tool-btn !w-6 !h-6"
            title={t("diagram.node_panel.align_left")}
          >
            <svg
              width="12"
              height="10"
              viewBox="0 0 12 10"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
            >
              <line x1="1" y1="2" x2="11" y2="2" />
              <line x1="1" y1="5" x2="7" y2="5" />
              <line x1="1" y1="8" x2="9" y2="8" />
            </svg>
          </button>
          <button
            id="btnAlignCenter"
            class="tool-btn !w-6 !h-6"
            title={t("diagram.node_panel.align_center")}
          >
            <svg
              width="12"
              height="10"
              viewBox="0 0 12 10"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
            >
              <line x1="1" y1="2" x2="11" y2="2" />
              <line x1="2.5" y1="5" x2="9.5" y2="5" />
              <line x1="1.5" y1="8" x2="10.5" y2="8" />
            </svg>
          </button>
          <button
            id="btnAlignRight"
            class="tool-btn !w-6 !h-6"
            title={t("diagram.node_panel.align_right")}
          >
            <svg
              width="12"
              height="10"
              viewBox="0 0 12 10"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
            >
              <line x1="1" y1="2" x2="11" y2="2" />
              <line x1="5" y1="5" x2="11" y2="5" />
              <line x1="3" y1="8" x2="11" y2="8" />
            </svg>
          </button>
          <div class="panel-sep"></div>
          <!-- Vertical align -->
          <button
            id="btnValignTop"
            class="tool-btn !w-6 !h-6"
            title={t("diagram.node_panel.align_top")}
          >
            <svg
              width="10"
              height="12"
              viewBox="0 0 10 12"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
            >
              <line x1="1" y1="1.5" x2="9" y2="1.5" stroke-width="2" />
              <line x1="1" y1="5" x2="8" y2="5" stroke-width="1.3" />
              <line x1="1" y1="8.5" x2="6" y2="8.5" stroke-width="1.3" />
            </svg>
          </button>
          <button
            id="btnValignMiddle"
            class="tool-btn !w-6 !h-6"
            title={t("diagram.node_panel.align_middle")}
          >
            <svg
              width="10"
              height="12"
              viewBox="0 0 10 12"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
            >
              <line x1="1" y1="2.5" x2="8" y2="2.5" stroke-width="1.3" />
              <line x1="1" y1="6" x2="9" y2="6" stroke-width="2" />
              <line x1="1" y1="9.5" x2="6" y2="9.5" stroke-width="1.3" />
            </svg>
          </button>
          <button
            id="btnValignBottom"
            class="tool-btn !w-6 !h-6"
            title={t("diagram.node_panel.align_bottom")}
          >
            <svg
              width="10"
              height="12"
              viewBox="0 0 10 12"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
            >
              <line x1="1" y1="3.5" x2="8" y2="3.5" stroke-width="1.3" />
              <line x1="1" y1="7" x2="6" y2="7" stroke-width="1.3" />
              <line x1="1" y1="10.5" x2="9" y2="10.5" stroke-width="2" />
            </svg>
          </button>
          <div class="panel-sep"></div>
          <div id="customShapeLabelPlacementControls" class="hidden">
            <button
              class="tool-btn !w-7 !h-6 font-mono text-[10px]"
              data-label-placement="above"
              title={t("diagram.node_panel.custom_label_above")}
            >T↑</button>
            <button
              class="tool-btn !w-7 !h-6 font-mono text-[10px]"
              data-label-placement="below"
              title={t("diagram.node_panel.custom_label_below")}
            >T↓</button>
            <button
              class="tool-btn !w-7 !h-6 font-mono text-[10px]"
              data-label-placement="left"
              title={t("diagram.node_panel.custom_label_left")}
            >←T</button>
            <button
              class="tool-btn !w-7 !h-6 font-mono text-[10px]"
              data-label-placement="right"
              title={t("diagram.node_panel.custom_label_right")}
            >T→</button>
            <button
              class="tool-btn !w-7 !h-6 font-mono text-[10px]"
              data-label-placement="center"
              title={t("diagram.node_panel.custom_label_center")}
            >T□</button>
            <div class="panel-sep"></div>
          </div>
          <button
            id="btnZOrderBack"
            class="tool-btn !w-7 !h-6"
            title={t("diagram.node_panel.send_back")}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="1" y="5" width="8" height="8" rx="1" />
              <rect
                x="5"
                y="1"
                width="8"
                height="8"
                rx="1"
                stroke-opacity="0.35"
              />
            </svg>
          </button>
          <button
            id="btnZOrderFront"
            class="tool-btn !w-7 !h-6"
            title={t("diagram.node_panel.bring_front")}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect
                x="1"
                y="5"
                width="8"
                height="8"
                rx="1"
                stroke-opacity="0.35"
              />
              <rect x="5" y="1" width="8" height="8" rx="1" />
            </svg>
          </button>

          <div class="panel-sep"></div>

          <!-- Stamp: copy color (goutte) -->
          <button
            id="btnStampColor"
            class="tool-btn !w-7 !h-6"
            title={t("diagram.node_panel.stamp_color")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 2 C7 2 3 6.5 3 9 a4 4 0 0 0 8 0 C11 6.5 7 2 7 2 Z" fill="currentColor" fill-opacity="0.25"/>
            </svg>
          </button>

          <!-- Stamp: copy font size -->
          <button
            id="btnStampFontSize"
            class="tool-btn !w-7 !h-6 font-mono text-xs font-bold"
            title={t("diagram.node_panel.stamp_font")}
          >Aa</button>

          <!-- Stamp: copy size -->
          <button
            id="btnStampSize"
            class="tool-btn !w-7 !h-6"
            title={t("diagram.node_panel.stamp_size")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="6" height="6" rx="0.8" fill="currentColor" fill-opacity="0.25"/>
              <path d="M10 2 L12 2 L12 4"/>
              <path d="M12 2 L9 5"/>
              <path d="M10 12 L12 12 L12 10"/>
              <path d="M12 12 L9 9"/>
            </svg>
          </button>

          <div class="panel-sep"></div>

          <!-- Rotation anti-horaire 10° -->
          <button
            id="btnRotateCCW"
            class="tool-btn !w-7 !h-6"
            title={t("diagram.node_panel.rotate_ccw")}
            style="font-size:15px; line-height:1;"
          >↺</button>

          <!-- Rotation horaire 10° -->
          <button
            id="btnRotateCW"
            class="tool-btn !w-7 !h-6"
            title={t("diagram.node_panel.rotate_cw")}
            style="font-size:15px; line-height:1;"
          >↻</button>

          <div class="panel-sep"></div>

          <!-- Copy as PNG -->
          <button
            id="btnCopyPng"
            class="tool-btn !h-6 px-1.5 font-mono text-xs font-semibold flex items-center gap-0.5"
            title={t("diagram.node_panel.copy_png")}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="7" x2="5" y2="1"/>
              <polyline points="2,4 5,1 8,4"/>
              <line x1="1" y1="9" x2="9" y2="9"/>
            </svg>
            PNG
          </button>

          <div class="panel-sep"></div>

          <!-- Group -->
          <button
            id="btnGroup"
            class="tool-btn !w-8 !h-7"
            title={t("diagram.node_panel.group")}
          >
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
              <rect x="0.7" y="1" width="20.6" height="12" rx="2" stroke-dasharray="2.5,1.5"/>
              <rect x="4" y="4.5" width="3" height="5" rx="1" fill="currentColor"/>
              <rect x="15" y="4.5" width="3" height="5" rx="1" fill="currentColor"/>
            </svg>
          </button>

          <!-- Ungroup -->
          <button
            id="btnUngroup"
            class="tool-btn !w-8 !h-7"
            title={t("diagram.node_panel.ungroup")}
          >
            <svg width="26" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
              <rect x="0.7" y="1" width="9" height="12" rx="2" stroke-dasharray="2.5,1.5"/>
              <rect x="3" y="4.5" width="3" height="5" rx="1" fill="currentColor"/>
              <rect x="16.3" y="1" width="9" height="12" rx="2" stroke-dasharray="2.5,1.5"/>
              <rect x="19" y="4.5" width="3" height="5" rx="1" fill="currentColor"/>
            </svg>
          </button>
          <div class="panel-sep"></div>

          <!-- Save as default for this shape type -->
          <button
            id="btnSaveShapeDefault"
            class="tool-btn !w-7 !h-6"
            title={t("diagram.node_panel.save_as_default")}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.474l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z"/>
            </svg>
          </button>
          </div><!-- /nodePanelControls -->
        </div>

        <!-- Link panel -->
        <div id="linkPanel" class="float-panel hidden" style="min-width:260px; flex-direction:column; align-items:stretch; gap:0.5rem; padding:0.75rem;">
          <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1" >{t("diagram.link_panel.title")}</div>

          <label class="flex items-center gap-2 text-xs cursor-pointer">
            <input type="radio" name="linkType" id="linkTypeUrl" value="url" class="accent-orange-500"/>
            <span >{t("diagram.link_panel.external")}</span>
          </label>
          <div id="linkUrlRow">
            <input id="linkUrlInput" type="url" placeholder={t("diagram.link_panel.url_placeholder")}
              class="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-400"/>
          </div>

          <label class="flex items-center gap-2 text-xs cursor-pointer">
            <input type="radio" name="linkType" id="linkTypeDiagram" value="diagram" class="accent-orange-500"/>
            <span >{t("diagram.link_panel.existing_diagram")}</span>
          </label>
          <div id="linkDiagramRow" class="hidden">
            <select id="linkDiagramSelect"
              class="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-400">
            </select>
          </div>

          <label class="flex items-center gap-2 text-xs cursor-pointer">
            <input type="radio" name="linkType" id="linkTypeNew" value="new" class="accent-orange-500"/>
            <span >{t("diagram.link_panel.new_diagram")}</span>
          </label>
          <div id="linkNewRow" class="hidden">
            <input id="linkNewName" type="text" placeholder={t("diagram.link_panel.diagram_name_placeholder")}
              class="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-400"/>
          </div>

          <div class="flex gap-1 mt-1">
            <button id="btnLinkSave"   class="flex-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded px-2 py-1" >{t("diagram.link_panel.save_btn")}</button>
            <button id="btnLinkRemove" class="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600" >{t("diagram.link_panel.remove_btn")}</button>
            <button id="btnLinkCancel" class="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
          </div>
        </div>

        <!-- Edge panel -->
        <div id="edgePanel" class="float-panel hidden">
          <button
            id="btnEdgeLock"
            class="tool-btn !w-6 !h-6 text-sm"
            title={t("diagram.edge_panel.lock")}
          >🔒</button>
          <div class="panel-sep"></div>
          <div id="edgePanelControls" class="contents">
          <button
            id="edgeBtnNone"
            class="tool-btn !w-7 !h-6 font-mono text-xs"
            title={t("diagram.edge_panel.no_arrow")}
          >
            —
          </button>
          <button
            id="edgeBtnFrom"
            class="tool-btn !w-7 !h-6 text-xs"
            title={t("diagram.edge_panel.arrow_from")}
          >
            ←
          </button>
          <button
            id="edgeBtnTo"
            class="tool-btn !w-7 !h-6 text-xs"
            title={t("diagram.edge_panel.arrow_to")}
          >
            →
          </button>
          <button
            id="edgeBtnBoth"
            class="tool-btn !w-8 !h-6 text-xs"
            title={t("diagram.edge_panel.arrow_both")}
          >
            ←→
          </button>
          <div class="panel-sep"></div>
          <button
            id="edgeBtnSolid"
            class="tool-btn !w-8 !h-6"
            title={t("diagram.edge_panel.solid")}
          >
            <svg width="22" height="4" viewBox="0 0 22 4">
              <line
                x1="1"
                y1="2"
                x2="21"
                y2="2"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <button
            id="edgeBtnDashed"
            class="tool-btn !w-8 !h-6"
            title={t("diagram.edge_panel.dashed")}
          >
            <svg width="22" height="4" viewBox="0 0 22 4">
              <line
                x1="1"
                y1="2"
                x2="21"
                y2="2"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-dasharray="4,3"
              />
            </svg>
          </button>
          <div class="panel-sep"></div>
          <button
            id="btnEdgeFontDecrease"
            class="tool-btn !w-8 !h-6"
            style="font-size: 10px"
            title={t("diagram.edge_panel.font_decrease")}
          >
            Aa−
          </button>
          <span
            id="edgeFontSizeValue"
            class="inline-flex items-center justify-center min-w-[2.25rem] h-6 px-1 text-[11px] font-mono text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded bg-white/80 dark:bg-gray-800/80"
            title={t("diagram.edge_panel.font_size_value")}
          >11</span>
          <button
            id="btnEdgeFontIncrease"
            class="tool-btn !w-8 !h-6"
            style="font-size: 10px"
            title={t("diagram.edge_panel.font_increase")}
          >
            Aa+
          </button>
          <div class="panel-sep"></div>
          <button
            id="btnEdgeLabelEdit"
            class="tool-btn !w-6 !h-6"
            title={t("diagram.edge_panel.edit_label")}
          >
            ✎
          </button>
          <button
            id="btnEdgeLabelWidthReset"
            class="tool-btn !w-6 !h-6 text-xs"
            title={t("diagram.edge_panel.reset_label_width")}
          >
            ↔
          </button>
          <div class="panel-sep"></div>
          <button
            id="btnEdgeLabelRotateCCW"
            class="tool-btn !w-7 !h-6 text-sm"
            title={t("diagram.edge_panel.rotate_label_ccw")}
          >
            ↺
          </button>
          <button
            id="btnEdgeLabelRotateCW"
            class="tool-btn !w-7 !h-6 text-sm"
            title={t("diagram.edge_panel.rotate_label_cw")}
          >
            ↻
          </button>
          <div class="panel-sep"></div>
          <button
            id="btnEdgeLabelOffsetLeft"
            class="tool-btn !w-6 !h-6 text-sm"
            title={t("diagram.edge_panel.offset_label_left")}
          >←</button>
          <button
            id="btnEdgeLabelOffsetRight"
            class="tool-btn !w-6 !h-6 text-sm"
            title={t("diagram.edge_panel.offset_label_right")}
          >→</button>
          <button
            id="btnEdgeLabelOffsetUp"
            class="tool-btn !w-6 !h-6 text-sm"
            title={t("diagram.edge_panel.offset_label_up")}
          >↑</button>
          <button
            id="btnEdgeLabelOffsetDown"
            class="tool-btn !w-6 !h-6 text-sm"
            title={t("diagram.edge_panel.offset_label_down")}
          >↓</button>
          <button
            id="btnEdgeLabelOffsetReset"
            class="tool-btn !w-6 !h-6 text-xs"
            title={t("diagram.edge_panel.offset_label_reset")}
          >⊙</button>
          <div class="panel-sep"></div>
          <button id="btnEdgeWidthDecrease" class="tool-btn !w-7 !h-6" style="font-size:10px" title={t("diagram.edge_panel.width_decrease")}>W−</button>
          <button id="btnEdgeWidthIncrease" class="tool-btn !w-7 !h-6" style="font-size:10px" title={t("diagram.edge_panel.width_increase")}>W+</button>
          <div class="panel-sep"></div>
          <button id="edgeColorSwatch"
            style="width:1.5rem;height:1.5rem;border-radius:0.25rem;border:2px solid #a8a29e;background:#a8a29e;cursor:pointer;flex-shrink:0;"
            title={t("diagram.edge_panel.color")}></button>
          <div class="panel-sep"></div>
          <button
            id="btnEdgeClearPorts"
            class="tool-btn !w-8 !h-6 text-xs"
            title={t("diagram.edge_panel.clear_ports")}
          >
            ⊗
          </button>
          <div class="panel-sep"></div>
          <button
            id="btnSaveEdgeDefault"
            class="tool-btn !w-7 !h-6"
            title={t("diagram.edge_panel.save_as_default")}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.474l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z"/>
            </svg>
          </button>
          </div><!-- /edgePanelControls -->
        </div>

        <!-- Floating label textarea -->
        <textarea
          id="labelInput"
          class="hidden"
          rows="1"
          placeholder={t("diagram.label_input.placeholder")}
        ></textarea>

        <!-- Empty state -->
        <div
          id="emptyState"
          class="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 pointer-events-none select-none"
        >
          <svg
            width="52"
            height="44"
            viewBox="0 0 52 44"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            class="mb-3 opacity-50"
          >
            <rect x="2" y="4" width="18" height="12" rx="2" />
            <rect x="32" y="28" width="18" height="12" rx="2" />
            <line x1="20" y1="10" x2="32" y2="34" stroke-dasharray="4,3" />
            <rect x="17" y="16" width="18" height="12" rx="2" />
            <line x1="26" y1="16" x2="26" y2="10" stroke-dasharray="4,3" />
          </svg>
          <p class="text-sm" >{t("diagram.empty_state")}</p>
        </div>
      </div>
    </div>

    <div id="toastContainer"></div>

    <!-- Image name modal -->
    <div id="imageNameModal" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.5);"
         class="flex items-center justify-center">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-80 flex flex-col gap-3">
        <p class="text-sm font-semibold text-gray-700 dark:text-gray-200" >{t("diagram.image_modal.title")}</p>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          Lettres, chiffres, <code class="bg-gray-100 dark:bg-gray-700 px-0.5 rounded">_</code> et
          <code class="bg-gray-100 dark:bg-gray-700 px-0.5 rounded">-</code> uniquement.
          Laisser vide pour un nom automatique.
        </p>
        <div class="flex items-center gap-1">
          <input id="imageNameInput" type="text" autocomplete="off" spellcheck="false"
                 class="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700
                        text-gray-900 dark:text-gray-100 text-sm px-2 py-1 outline-none focus:ring-2 focus:ring-blue-400"
                 placeholder={t("diagram.image_modal.placeholder")} />
          <span class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">.png</span>
        </div>
        <p id="imageNameError" class="text-xs text-red-500 hidden" >{t("diagram.image_modal.error_chars")}</p>
        <div class="flex gap-2 justify-end">
          <button id="imageNameCancel"
                  class="px-3 py-1 text-xs rounded border border-gray-300 dark:border-gray-600
                         text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >{t("diagram.image_modal.cancel_btn")}</button>
          <button id="imageNameConfirm"
                  class="px-3 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600"
                  >{t("diagram.image_modal.paste_btn")}</button>
        </div>
      </div>
    </div>

</div>
