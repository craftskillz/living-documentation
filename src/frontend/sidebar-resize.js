// ── Sidebar horizontal resize ───────────────────────────────────────────────
// Drag a handle on the sidebar's right edge to resize it.
// Width is persisted in localStorage (`ld-sidebar-w`) across reloads.
// The toggle (toggleSidebar) keeps working because it only flips the `hidden`
// class — width stays intact on the element.

(function () {
  const STORAGE_KEY = "ld-sidebar-w";
  const MIN_W = 200;
  const MAX_W = 600;

  function applyStoredWidth() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    let w = parseInt(localStorage.getItem(STORAGE_KEY) || "", 10);
    if (!Number.isFinite(w)) return;
    w = Math.max(MIN_W, Math.min(MAX_W, w));
    sidebar.classList.remove("w-72");
    sidebar.style.width = w + "px";
  }

  function initSidebarResize() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    applyStoredWidth();

    const handle = document.createElement("div");
    handle.id = "sidebar-resize-handle";
    handle.setAttribute("aria-hidden", "true");
    handle.style.cssText = [
      "position:absolute",
      "top:0",
      "right:-2px",
      "width:6px",
      "height:100%",
      "cursor:col-resize",
      "z-index:20",
      "user-select:none",
      "background:transparent",
      "transition:background 0.15s ease",
    ].join(";");
    handle.addEventListener("mouseenter", () => {
      handle.style.background = "rgba(59,130,246,0.35)";
    });
    handle.addEventListener("mouseleave", () => {
      if (!handle.dataset.dragging) handle.style.background = "transparent";
    });

    // Sidebar needs `relative` so the absolutely-positioned handle anchors to it.
    sidebar.style.position = "relative";
    sidebar.appendChild(handle);

    let startX = 0;
    let startW = 0;

    function onMove(e) {
      const dx = e.clientX - startX;
      let w = startW + dx;
      w = Math.max(MIN_W, Math.min(MAX_W, w));
      sidebar.style.width = w + "px";
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      delete handle.dataset.dragging;
      handle.style.background = "transparent";
      const finalW = parseInt(sidebar.style.width, 10);
      if (Number.isFinite(finalW)) {
        try {
          localStorage.setItem(STORAGE_KEY, String(finalW));
        } catch {
          /* ignore */
        }
      }
    }

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      startX = e.clientX;
      startW = sidebar.getBoundingClientRect().width;
      // Drop the Tailwind width class so inline width takes over for good.
      sidebar.classList.remove("w-72");
      sidebar.style.width = startW + "px";
      handle.dataset.dragging = "1";
      handle.style.background = "rgba(59,130,246,0.55)";
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  window.initSidebarResize = initSidebarResize;
})();
