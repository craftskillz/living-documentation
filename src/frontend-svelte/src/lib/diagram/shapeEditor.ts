// @ts-nocheck
import {
  DEFAULT_CUSTOM_ANCHORS,
  CUSTOM_SHAPE_DEFAULT_SIZE,
} from "./custom-shapes.js";

export function initShapeEditor(): () => void {
  const els = {
    saveState: document.getElementById("saveState"),
    librarySelect: document.getElementById("librarySelect"),
    libraryName: document.getElementById("libraryName"),
    shapeList: document.getElementById("shapeList"),
    previewStage: document.getElementById("previewStage"),
    previewImage: document.getElementById("previewImage"),
    shapeName: document.getElementById("shapeName"),
    imageFile: document.getElementById("imageFile"),
    shapeWidth: document.getElementById("shapeWidth"),
    shapeHeight: document.getElementById("shapeHeight"),
    labelPlacement: document.getElementById("labelPlacement"),
    shapeShowInDiagram: document.getElementById("shapeShowInDiagram"),
    anchorList: document.getElementById("anchorList"),
    anchorCount: document.getElementById("anchorCount"),
  };

  let store = { libraries: [] };
  let activeLibraryId = null;
  let activeShapeId = null;
  let draft = null;
  let draggingAnchorId = null;

  const uid = (prefix) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const activeLibrary = () =>
    store.libraries.find((lib) => lib.id === activeLibraryId) || null;
  const activeShape = () =>
    activeLibrary()?.shapes.find((shape) => shape.id === activeShapeId) || null;
  const clamp01 = (n) => Math.max(0, Math.min(1, n));
  const normalizeLabelPlacement = (value) =>
    ["below", "above", "right", "left", "center"].includes(value)
      ? value
      : "below";
  const escapeAttr = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );

  function setStatus(text) {
    els.saveState.textContent = text;
    if (text)
      setTimeout(() => {
        if (els.saveState.textContent === text) els.saveState.textContent = "";
      }, 1800);
  }

  async function loadStore() {
    const res = await fetch("/api/shape-libraries");
    store = await res.json();
    if (!Array.isArray(store.libraries)) store.libraries = [];
    if (!store.libraries.length) {
      store.libraries.push({
        id: uid("lib"),
        name: "My shapes",
        shapes: [],
      });
    }
    activeLibraryId = store.libraries[0].id;
    activeShapeId = store.libraries[0].shapes[0]?.id || null;
    draft = activeShape() ? structuredClone(activeShape()) : newShapeDraft();
    renderAll();
  }

  async function saveStore() {
    const res = await fetch("/api/shape-libraries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(store),
    });
    store = await res.json();
    setStatus("Saved");
  }

  function newShapeDraft() {
    return {
      id: uid("shape"),
      name: "New shape",
      imageSrc: "",
      width: CUSTOM_SHAPE_DEFAULT_SIZE,
      height: CUSTOM_SHAPE_DEFAULT_SIZE,
      labelPlacement: "below",
      showInDiagram: true,
      anchors: structuredClone(DEFAULT_CUSTOM_ANCHORS),
    };
  }

  function renderAll() {
    renderLibraries();
    renderShapeList();
    renderEditor();
  }

  function renderLibraries() {
    els.librarySelect.innerHTML = "";
    store.libraries.forEach((lib) => {
      const opt = document.createElement("option");
      opt.value = lib.id;
      opt.textContent = lib.name;
      opt.selected = lib.id === activeLibraryId;
      els.librarySelect.appendChild(opt);
    });
    els.libraryName.value = activeLibrary()?.name || "";
  }

  function renderShapeList() {
    const lib = activeLibrary();
    els.shapeList.innerHTML = "";
    (lib?.shapes || []).forEach((shape) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `shape-item w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-gray-100 ${shape.id === activeShapeId ? "active" : ""}`;
      const img = document.createElement("img");
      img.src = shape.imageSrc;
      img.alt = "";
      img.className = "w-6 h-6 object-contain shrink-0";
      const label = document.createElement("span");
      label.className = "truncate";
      label.textContent = shape.name;
      btn.append(img, label);
      btn.addEventListener("click", () => {
        activeShapeId = shape.id;
        draft = structuredClone(shape);
        renderAll();
      });
      els.shapeList.appendChild(btn);
    });
    if (!lib?.shapes?.length) {
      els.shapeList.innerHTML =
        '<p class="text-xs text-gray-400 px-2 py-2">No shape yet.</p>';
    }
  }

  function renderEditor() {
    if (!draft) draft = newShapeDraft();
    els.previewStage.style.aspectRatio = `${Math.max(16, Number(draft.width) || CUSTOM_SHAPE_DEFAULT_SIZE)} / ${Math.max(16, Number(draft.height) || CUSTOM_SHAPE_DEFAULT_SIZE)}`;
    els.previewImage.src = draft.imageSrc || "";
    els.previewImage.style.display = draft.imageSrc ? "block" : "none";
    els.shapeName.value = draft.name || "";
    els.shapeWidth.value = draft.width || CUSTOM_SHAPE_DEFAULT_SIZE;
    els.shapeHeight.value = draft.height || CUSTOM_SHAPE_DEFAULT_SIZE;
    els.labelPlacement.value = normalizeLabelPlacement(draft.labelPlacement);
    els.shapeShowInDiagram.checked = draft.showInDiagram !== false;
    renderAnchors();
  }

  function renderAnchors() {
    els.previewStage
      .querySelectorAll(".anchor-dot")
      .forEach((dot) => dot.remove());
    els.anchorList.innerHTML = "";
    const anchors = draft.anchors || [];
    els.anchorCount.textContent = `${anchors.length} anchor${anchors.length > 1 ? "s" : ""}`;
    anchors.forEach((anchor, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "anchor-dot";
      dot.style.left = `${anchor.x * 100}%`;
      dot.style.top = `${anchor.y * 100}%`;
      dot.dataset.anchorId = anchor.id;
      dot.innerHTML = `<span>${anchor.id}</span>`;
      dot.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        draggingAnchorId = anchor.id;
        dot.setPointerCapture(event.pointerId);
      });
      els.previewStage.appendChild(dot);

      const row = document.createElement("div");
      row.className =
        "grid grid-cols-[4.5rem_1fr_1fr_2rem] gap-2 items-center";
      row.innerHTML = `
        <input class="field !h-7 text-xs" value="${escapeAttr(anchor.id)}">
        <input class="field !h-7 text-xs" type="number" min="0" max="100" step="1" value="${Math.round(anchor.x * 100)}">
        <input class="field !h-7 text-xs" type="number" min="0" max="100" step="1" value="${Math.round(anchor.y * 100)}">
        <button class="btn btn-danger !h-7 !px-0">×</button>
      `;
      const [idInput, xInput, yInput] = row.querySelectorAll("input");
      idInput.addEventListener("input", () => {
        anchor.id = idInput.value.trim() || `p${index + 1}`;
        renderAnchors();
      });
      xInput.addEventListener("input", () => {
        anchor.x = clamp01(Number(xInput.value) / 100);
        renderAnchors();
      });
      yInput.addEventListener("input", () => {
        anchor.y = clamp01(Number(yInput.value) / 100);
        renderAnchors();
      });
      row.querySelector("button").addEventListener("click", () => {
        draft.anchors = draft.anchors.filter((item) => item !== anchor);
        renderAnchors();
      });
      els.anchorList.appendChild(row);
    });
  }

  function setAnchorFromEvent(anchor, event) {
    const rect = els.previewStage.getBoundingClientRect();
    anchor.x = clamp01((event.clientX - rect.left) / rect.width);
    anchor.y = clamp01((event.clientY - rect.top) / rect.height);
  }

  // --- listeners (tracked for cleanup) ---
  const cleanups: Array<() => void> = [];
  const on = (target, type, handler, options?) => {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };

  on(els.previewStage, "pointermove", (event) => {
    if (!draggingAnchorId || !draft) return;
    const anchor = draft.anchors.find((item) => item.id === draggingAnchorId);
    if (!anchor) return;
    setAnchorFromEvent(anchor, event);
    renderAnchors();
  });
  on(window, "pointerup", () => {
    draggingAnchorId = null;
  });
  on(els.previewStage, "click", (event) => {
    if (event.target.closest(".anchor-dot") || draggingAnchorId || !draft)
      return;
    const anchor = {
      id: `p${(draft.anchors || []).length + 1}`,
      x: 0.5,
      y: 0.5,
    };
    setAnchorFromEvent(anchor, event);
    draft.anchors = [...(draft.anchors || []), anchor];
    renderAnchors();
  });

  on(document.getElementById("btnAddLibrary"), "click", async () => {
    const lib = { id: uid("lib"), name: "New library", shapes: [] };
    store.libraries.push(lib);
    activeLibraryId = lib.id;
    activeShapeId = null;
    draft = newShapeDraft();
    renderAll();
    await saveStore();
  });
  on(els.librarySelect, "change", () => {
    activeLibraryId = els.librarySelect.value;
    activeShapeId = activeLibrary()?.shapes[0]?.id || null;
    draft = activeShape() ? structuredClone(activeShape()) : newShapeDraft();
    renderAll();
  });
  on(els.libraryName, "change", async () => {
    const lib = activeLibrary();
    if (!lib) return;
    lib.name = els.libraryName.value.trim() || lib.name;
    renderLibraries();
    await saveStore();
  });
  on(document.getElementById("btnNewShape"), "click", () => {
    activeShapeId = null;
    draft = newShapeDraft();
    renderAll();
  });
  on(document.getElementById("btnDeleteShape"), "click", async () => {
    const lib = activeLibrary();
    if (!lib || !activeShapeId) return;
    lib.shapes = lib.shapes.filter((shape) => shape.id !== activeShapeId);
    activeShapeId = lib.shapes[0]?.id || null;
    draft = activeShape() ? structuredClone(activeShape()) : newShapeDraft();
    renderAll();
    await saveStore();
  });
  on(document.getElementById("btnDefaultAnchors"), "click", () => {
    draft.anchors = structuredClone(DEFAULT_CUSTOM_ANCHORS);
    renderAnchors();
  });
  on(document.getElementById("btnClearAnchors"), "click", () => {
    draft.anchors = [];
    renderAnchors();
  });
  on(document.getElementById("btnSaveShape"), "click", async () => {
    const lib = activeLibrary();
    if (!lib || !draft || !draft.imageSrc) return;
    draft.name = els.shapeName.value.trim() || "Untitled shape";
    draft.width = Math.max(
      16,
      Math.min(1200, Math.round(Number(els.shapeWidth.value) || CUSTOM_SHAPE_DEFAULT_SIZE)),
    );
    draft.height = Math.max(
      16,
      Math.min(1200, Math.round(Number(els.shapeHeight.value) || CUSTOM_SHAPE_DEFAULT_SIZE)),
    );
    draft.labelPlacement = normalizeLabelPlacement(els.labelPlacement.value);
    draft.showInDiagram = els.shapeShowInDiagram.checked;
    const idx = lib.shapes.findIndex((shape) => shape.id === draft.id);
    if (idx >= 0) lib.shapes[idx] = structuredClone(draft);
    else lib.shapes.push(structuredClone(draft));
    activeShapeId = draft.id;
    renderAll();
    await saveStore();
  });
  [
    "shapeName",
    "shapeWidth",
    "shapeHeight",
    "labelPlacement",
    "shapeShowInDiagram",
  ].forEach((id) => {
    on(document.getElementById(id), "input", () => {
      draft.name = els.shapeName.value;
      draft.width = Number(els.shapeWidth.value) || CUSTOM_SHAPE_DEFAULT_SIZE;
      draft.height = Number(els.shapeHeight.value) || CUSTOM_SHAPE_DEFAULT_SIZE;
      draft.labelPlacement = normalizeLabelPlacement(els.labelPlacement.value);
      draft.showInDiagram = els.shapeShowInDiagram.checked;
    });
  });
  on(els.imageFile, "change", async () => {
    const file = els.imageFile.files && els.imageFile.files[0];
    if (!file || !draft) return;
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const ext =
      (file.name.split(".").pop() || "png")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "png";
    const name = file.name.replace(/\.[^.]+$/, "").slice(0, 60);
    const res = await fetch("/api/images/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, ext, name }),
    });
    const uploaded = await res.json();
    draft.imageSrc = `/images/${uploaded.filename}`;
    if (!els.shapeName.value || els.shapeName.value === "New shape")
      draft.name = name || draft.name;
    renderEditor();
  });

  // bootstrap
  void loadStore();

  return () => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  };
}
