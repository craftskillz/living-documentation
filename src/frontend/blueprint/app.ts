import { renderMarkdownHtml } from "../md-renderer.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Folder {
  name: string;
  path: string;
  hasChildren: boolean;
}

interface BlueprintResponse {
  sourceRoot: string;
  path: string;
  name: string;
  folders: Folder[];
}

interface Box {
  folder: Folder;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface BreadcrumbEntry {
  name: string;
  path: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BLUEPRINT_FOLDER = "000_BLUEPRINT";

function slugifyCategory(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "FOLDER"
  );
}

const BOX_W = 200;
const BOX_H = 110;
const GAP_X = 40;
const GAP_Y = 40;
const COLS = 4;
const MENU_ICON_SIZE = 20;
const CORNER_R = 18;
const ANIM_MS = 420;
const VIEW_PADDING = 80;

const COLOR_BOX_FILL = "#1e293b";
const COLOR_BOX_FILL_CHILD = "#172033";
const COLOR_BOX_STROKE = "rgba(255,255,255,0.12)";
const COLOR_BOX_STROKE_HOVER = "#3b82f6";
const COLOR_NAME = "#f1f5f9";
const COLOR_MUTED = "#64748b";
const COLOR_ARROW = "#3b82f6";

// ── DOM refs ──────────────────────────────────────────────────────────────────

const canvas = document.getElementById("blueprintCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const fitButton = document.getElementById("fitButton") as HTMLButtonElement;
const dragToggle = document.getElementById("dragToggle") as HTMLButtonElement;
// Blueprint ADR modal
const bpadrOverlay = document.getElementById(
  "blueprintAdrOverlay",
) as HTMLElement;
const bpadrModalTitle = document.getElementById(
  "bpadrModalTitle",
) as HTMLElement;
const bpadrEditBtn = document.getElementById(
  "bpadrEditBtn",
) as HTMLButtonElement;
const bpadrClose = document.getElementById("bpadrClose") as HTMLButtonElement;
const bpadrReadView = document.getElementById("bpadrReadView") as HTMLElement;
const bpadrRendered = document.getElementById("bpadrRendered") as HTMLElement;
const bpadrForm = document.getElementById("bpadrForm") as HTMLFormElement;
const bpadrTitle = document.getElementById("bpadrTitle") as HTMLInputElement;
const bpadrCategory = document.getElementById(
  "bpadrCategory",
) as HTMLInputElement;
const bpadrFolder = document.getElementById("bpadrFolder") as HTMLInputElement;
const bpadrContent = document.getElementById(
  "bpadrContent",
) as HTMLTextAreaElement;
const bpadrCancelEdit = document.getElementById(
  "bpadrCancelEdit",
) as HTMLButtonElement;
const bpadrFolderConfirm = document.getElementById(
  "bpadrFolderConfirm",
) as HTMLElement;
const bpadrFolderName = document.getElementById(
  "bpadrFolderName",
) as HTMLElement;
const bpadrFolderCancel = document.getElementById(
  "bpadrFolderCancel",
) as HTMLButtonElement;
const bpadrFolderCreate = document.getElementById(
  "bpadrFolderCreate",
) as HTMLButtonElement;

const fileExplorer = document.getElementById("fileExplorer") as HTMLElement;
const explorerBreadcrumb = document.getElementById(
  "explorerBreadcrumb",
) as HTMLElement;
const explorerList = document.getElementById("explorerList") as HTMLElement;
const explorerClose = document.getElementById(
  "explorerClose",
) as HTMLButtonElement;
const filePreview = document.getElementById("filePreview") as HTMLElement;
let explorerCurrentPath = "";
const breadcrumbEl = document.getElementById("breadcrumb") as HTMLElement;
const emptyState = document.getElementById("emptyState") as HTMLElement;

// ── State ─────────────────────────────────────────────────────────────────────

let cameraX = 0;
let cameraY = 0;
let zoom = 1;
let boxes: Box[] = [];
let hoverIndex = -1;
let dragMode = false;
let draggingIndex = -1;
const selectedIndices = new Set<number>();
let dragStartPositions: Map<number, { x: number; y: number }> = new Map();
let dragStartWorld = { x: 0, y: 0 };
// Rubber band selection
let isSelecting = false;
let selectStartWorld = { x: 0, y: 0 };
let selectCurrentWorld = { x: 0, y: 0 };
let activeExplorerPath: string | null = null;
let currentCanvasPath = "";
let dragOffsetX = 0;
let dragOffsetY = 0;
let isDragging = false;
let isPanning = false;
let didPan = false;
let panStartX = 0;
let panStartY = 0;
let panStartCX = 0;
let panStartCY = 0;
let breadcrumb: BreadcrumbEntry[] = [];
let animFrame: number | null = null;
type PositionEntry = { x: number; y: number; expanded?: boolean };
let positions: Record<string, PositionEntry> = {};
let saveTimer: number | null = null;

// Animation state
let animStartX = 0;
let animStartY = 0;
let animStartZ = 0;
let animTargetX = 0;
let animTargetY = 0;
let animTargetZ = 0;
let animStartTime = 0;
let isAnimating = false;

// ── Layout ────────────────────────────────────────────────────────────────────

function layoutFolders(folders: Folder[]): Box[] {
  let gridCol = 0;
  let gridRow = 0;
  return folders.map((folder) => {
    // Use saved position if available, otherwise next grid slot
    const saved = positions[folder.path];
    const x = saved ? saved.x : gridCol * (BOX_W + GAP_X);
    const y = saved ? saved.y : gridRow * (BOX_H + GAP_Y);
    if (!saved) {
      gridCol++;
      if (gridCol >= COLS) {
        gridCol = 0;
        gridRow++;
      }
    }
    return { folder, x, y, w: BOX_W, h: BOX_H };
  });
}

function boundsOfBoxes(b: Box[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  if (!b.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const box of b) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.w);
    maxY = Math.max(maxY, box.y + box.h);
  }
  return { minX, minY, maxX, maxY };
}

// ── Camera helpers ────────────────────────────────────────────────────────────

function getParentPath(p: string): string {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(0, i) : "";
}

function centerOnBox(box: Box) {
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  // Center the box in the left half (file explorer takes the right half)
  const availW = fileExplorer.hidden ? W : W / 2;
  const targetX = availW / 2 - (box.x + box.w / 2) * zoom;
  const targetY = H / 2 - (box.y + box.h / 2) * zoom;
  startAnim(targetX, targetY, zoom);
}

function fitToBoxes(animate: boolean) {
  if (!boxes.length) return;
  const { minX, minY, maxX, maxY } = boundsOfBoxes(boxes);
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  const fitZoom = Math.min(
    (W - VIEW_PADDING * 2) / Math.max(1, maxX - minX),
    (H - VIEW_PADDING * 2) / Math.max(1, maxY - minY),
    1.4,
  );
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const targetX = W / 2 - cx * fitZoom;
  const targetY = H / 2 - cy * fitZoom;
  if (animate) {
    startAnim(targetX, targetY, fitZoom);
  } else {
    cameraX = targetX;
    cameraY = targetY;
    zoom = fitZoom;
  }
}

function zoomIntoBox(box: Box) {
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  const targetZoom = Math.min(
    (W - VIEW_PADDING * 2) / box.w,
    (H - VIEW_PADDING * 2) / box.h,
    1.6,
  );
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const targetX = W / 2 - cx * targetZoom;
  const targetY = H / 2 - cy * targetZoom;
  startAnim(targetX, targetY, targetZoom);
}

// ── Animation ─────────────────────────────────────────────────────────────────

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function startAnim(tx: number, ty: number, tz: number) {
  animStartX = cameraX;
  animStartY = cameraY;
  animStartZ = zoom;
  animTargetX = tx;
  animTargetY = ty;
  animTargetZ = tz;
  animStartTime = performance.now();
  isAnimating = true;
  scheduleRender();
}

function tickAnim(now: number) {
  const t = Math.min(1, (now - animStartTime) / ANIM_MS);
  const e = easeInOut(t);
  cameraX = animStartX + (animTargetX - animStartX) * e;
  cameraY = animStartY + (animTargetY - animStartY) * e;
  zoom = animStartZ + (animTargetZ - animStartZ) * e;
  if (t >= 1) isAnimating = false;
}

// ── Render ────────────────────────────────────────────────────────────────────

function scheduleRender() {
  if (animFrame !== null) return;
  animFrame = requestAnimationFrame(render);
}

function render(now: number) {
  animFrame = null;
  if (isAnimating) {
    tickAnim(now);
    scheduleRender();
  }

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
    canvas.width = W * dpr;
    canvas.height = H * dpr;
  }

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(dpr, dpr);

  // Background grid
  drawGrid(W, H);

  ctx.translate(cameraX, cameraY);
  ctx.scale(zoom, zoom);

  for (let i = 0; i < boxes.length; i++) {
    drawBox(
      boxes[i],
      i === hoverIndex,
      i === draggingIndex,
      selectedIndices.has(i),
    );
  }

  // Rubber band selection rect
  if (isSelecting) {
    const rx = Math.min(selectStartWorld.x, selectCurrentWorld.x);
    const ry = Math.min(selectStartWorld.y, selectCurrentWorld.y);
    const rw = Math.abs(selectCurrentWorld.x - selectStartWorld.x);
    const rh = Math.abs(selectCurrentWorld.y - selectStartWorld.y);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1.5 / zoom;
    ctx.fillStyle = "rgba(59,130,246,0.08)";
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 6 / zoom);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawGrid(W: number, H: number) {
  const step = 40 * zoom;
  const ox = ((cameraX % step) + step) % step;
  const oy = ((cameraY % step) + step) % step;
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = ox; x < W; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
  }
  for (let y = oy; y < H; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();
}

function roundRect(x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawBox(
  box: Box,
  hovered: boolean,
  dragging = false,
  selected = false,
) {
  const { x, y, w, h, folder } = box;
  const fill = folder.hasChildren ? COLOR_BOX_FILL : COLOR_BOX_FILL_CHILD;
  const isExplorerOpen = activeExplorerPath === folder.path;
  const stroke = dragging
    ? "#f59e0b"
    : selected
      ? "#fbbf24"
      : isExplorerOpen
        ? "#60a5fa"
        : hovered
          ? COLOR_BOX_STROKE_HOVER
          : COLOR_BOX_STROKE;
  const lw = hovered || dragging || selected || isExplorerOpen ? 2 : 1;

  // Shadow
  ctx.save();
  ctx.shadowColor = dragging ? "rgba(245,158,11,0.4)" : "rgba(0,0,0,0.4)";
  ctx.shadowBlur = dragging ? 36 : hovered ? 24 : 12;
  roundRect(x, y, w, h, CORNER_R);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();

  // Border
  roundRect(x, y, w, h, CORNER_R);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw / zoom;
  ctx.stroke();

  // ☰ icon top-left
  const menuActive = isExplorerOpen;
  ctx.fillStyle = menuActive
    ? "#60a5fa"
    : hovered
      ? "#94a3b8"
      : "rgba(255,255,255,0.3)";
  ctx.font = `${MENU_ICON_SIZE * 0.7}px sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("☰", x + 10, y + 10);

  // D icon top-left (after ☰)
  ctx.fillStyle = hovered ? "#a78bfa" : "rgba(167,139,250,0.4)";
  ctx.font = `bold ${MENU_ICON_SIZE * 0.65}px Inter, ui-sans-serif, sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("D", x + 10 + MENU_ICON_SIZE + 4, y + 11);

  // Folder icon + name (centered vertically)
  const iconSize = 18;
  const iconX = x + 18;
  const iconY = y + h / 2 - iconSize / 2 - 4;
  drawFolderIcon(iconX, iconY, iconSize, hovered);

  const fontSize = Math.max(10, Math.min(14, 120 / folder.name.length));
  ctx.fillStyle = hovered ? "#fff" : COLOR_NAME;
  ctx.font = `700 ${fontSize}px Inter, ui-sans-serif, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const maxTextW = w - 36 - iconSize - 8;
  const label = truncateText(folder.name, maxTextW, fontSize);
  ctx.fillText(label, iconX + iconSize + 8, y + h / 2);

  // Arrow (navigate into sub-folders)
  if (folder.hasChildren) {
    drawArrow(x + w - 22, y + h / 2, hovered);
  }
}

function drawFolderIcon(x: number, y: number, size: number, hovered: boolean) {
  const color = hovered ? COLOR_ARROW : COLOR_MUTED;
  ctx.fillStyle = color;
  // Folder body
  ctx.beginPath();
  ctx.roundRect(x, y + size * 0.3, size, size * 0.7, 2);
  ctx.fill();
  // Folder tab
  ctx.beginPath();
  ctx.roundRect(x, y + size * 0.2, size * 0.45, size * 0.18, 2);
  ctx.fill();
}

function drawArrow(x: number, y: number, hovered: boolean) {
  const s = 6;
  ctx.fillStyle = hovered ? COLOR_ARROW : COLOR_MUTED;
  ctx.beginPath();
  ctx.moveTo(x - s, y - s);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x - s, y + s);
  ctx.closePath();
  ctx.fill();
}

function truncateText(text: string, maxW: number, fontSize: number): string {
  ctx.font = `700 ${fontSize}px Inter, ui-sans-serif, sans-serif`;
  if (ctx.measureText(text).width <= maxW) return text;
  let truncated = text;
  while (
    truncated.length > 1 &&
    ctx.measureText(truncated + "…").width > maxW
  ) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
}

// ── Persistence ───────────────────────────────────────────────────────────────

async function loadPositions(): Promise<void> {
  try {
    positions = (await fetch("/api/blueprint/positions").then((r) =>
      r.json(),
    )) as Record<string, PositionEntry>;
  } catch {
    positions = {};
  }
}

function scheduleSavePositions(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    void fetch("/api/blueprint/positions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(positions),
    });
  }, 600);
}

// ── API ───────────────────────────────────────────────────────────────────────

async function loadPath(folderPath: string, animate: boolean, zoomBox?: Box) {
  try {
    const url = `/api/blueprint${folderPath ? `?path=${encodeURIComponent(folderPath)}` : ""}`;
    const data = (await fetch(url).then((r) => r.json())) as BlueprintResponse;

    // Update breadcrumb
    if (!folderPath) {
      breadcrumb = [{ name: data.sourceRoot, path: "" }];
    } else {
      const segments = folderPath.split("/");
      let built = "";
      breadcrumb = [{ name: data.sourceRoot, path: "" }];
      for (const seg of segments) {
        built = built ? `${built}/${seg}` : seg;
        breadcrumb.push({ name: seg, path: built });
      }
    }
    renderBreadcrumb();

    currentCanvasPath = folderPath;
    boxes = layoutFolders(data.folders);
    emptyState.hidden = boxes.length > 0;

    if (zoomBox && animate) {
      // Zoom into the clicked box first, then snap to new content
      zoomIntoBox(zoomBox);
      setTimeout(() => {
        fitToBoxes(true);
      }, ANIM_MS * 0.6);
    } else {
      fitToBoxes(animate);
    }

    scheduleRender();
  } catch (e) {
    console.error("Blueprint load error", e);
  }
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

function renderBreadcrumb() {
  breadcrumbEl.innerHTML = "";
  breadcrumb.forEach((entry, i) => {
    const isLast = i === breadcrumb.length - 1;
    if (i > 0) {
      const sep = document.createElement("span");
      sep.className = "breadcrumb-sep";
      sep.textContent = "/";
      breadcrumbEl.appendChild(sep);
    }
    const item = document.createElement("span");
    item.className = `breadcrumb-item${isLast ? " current" : ""}`;
    item.textContent = entry.name;
    if (!isLast) {
      item.addEventListener("click", () => {
        closeFileExplorer();
        loadPath(entry.path, true);
      });
    }
    breadcrumbEl.appendChild(item);
  });
}

// ── Hit test ──────────────────────────────────────────────────────────────────

function worldFromScreen(sx: number, sy: number): { x: number; y: number } {
  return {
    x: (sx - cameraX) / zoom,
    y: (sy - cameraY) / zoom,
  };
}

function boxAt(wx: number, wy: number): number {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) return i;
  }
  return -1;
}

function isOnMenuIcon(box: Box, wx: number, wy: number): boolean {
  return (
    wx >= box.x + 6 &&
    wx <= box.x + 6 + MENU_ICON_SIZE &&
    wy >= box.y + 6 &&
    wy <= box.y + 6 + MENU_ICON_SIZE
  );
}

function isOnDocIcon(box: Box, wx: number, wy: number): boolean {
  const iconX = box.x + 10 + MENU_ICON_SIZE + 4;
  return (
    wx >= iconX &&
    wx <= iconX + MENU_ICON_SIZE &&
    wy >= box.y + 6 &&
    wy <= box.y + 6 + MENU_ICON_SIZE
  );
}

// ── Blueprint ADR modal ───────────────────────────────────────────────────────

let currentAdrId: string | null = null;
let currentAdrBox: Box | null = null;

function showBpadrView(mode: "read" | "form" | "folder-confirm") {
  bpadrReadView.hidden = mode !== "read";
  bpadrForm.hidden = mode !== "form";
  bpadrFolderConfirm.hidden = mode !== "folder-confirm";
  bpadrEditBtn.hidden = mode !== "read";
}

async function openBlueprintAdr(box: Box): Promise<void> {
  currentAdrBox = box;
  currentAdrId = null;
  const category = slugifyCategory(box.folder.name);

  bpadrModalTitle.textContent = `Création d'un nouveau Blueprint — ${box.folder.name}`;
  bpadrCategory.value = category;
  bpadrFolder.value = BLUEPRINT_FOLDER;
  bpadrOverlay.hidden = false;

  // 1. Check folder exists
  const folderRes = (await fetch("/api/blueprint/blueprint-folder").then((r) =>
    r.json(),
  )) as { exists: boolean; folder: string };
  if (!folderRes.exists) {
    bpadrFolderName.textContent = BLUEPRINT_FOLDER;
    showBpadrView("folder-confirm");
    return;
  }

  await loadOrCreateAdr(box, category);
}

async function loadOrCreateAdr(box: Box, category: string): Promise<void> {
  // 2. Search for existing ADR
  const adrRes = (await fetch(
    `/api/blueprint/blueprint-adr?category=${encodeURIComponent(category)}`,
  ).then((r) => r.json())) as {
    found: boolean;
    doc?: { id: string; title: string };
  };

  if (adrRes.found && adrRes.doc) {
    currentAdrId = adrRes.doc.id;
    // Load full doc with rendered HTML
    const doc = (await fetch(
      `/api/documents/${encodeURIComponent(adrRes.doc.id)}`,
    ).then((r) => r.json())) as {
      title: string;
      html: string;
      content: string;
    };
    bpadrTitle.value = doc.title;
    bpadrContent.value = doc.content;
    bpadrModalTitle.textContent = doc.title;
    renderMarkdownHtml(doc.html, bpadrRendered);
    showBpadrView("read");
  } else {
    // New ADR
    bpadrTitle.value = box.folder.name;
    bpadrContent.value = "";
    showBpadrView("form");
  }
}

function closeBpadrModal() {
  bpadrOverlay.hidden = true;
  currentAdrId = null;
  currentAdrBox = null;
}

// Event listeners for modal
bpadrClose.addEventListener("click", closeBpadrModal);
bpadrOverlay.addEventListener("click", (e) => {
  if (e.target === bpadrOverlay) closeBpadrModal();
});

bpadrEditBtn.addEventListener("click", () => showBpadrView("form"));

bpadrCancelEdit.addEventListener("click", () => {
  if (currentAdrId) showBpadrView("read");
  else closeBpadrModal();
});

bpadrFolderCancel.addEventListener("click", closeBpadrModal);

bpadrFolderCreate.addEventListener("click", async () => {
  await fetch("/api/blueprint/blueprint-folder", { method: "POST" });
  if (currentAdrBox) {
    const category = slugifyCategory(currentAdrBox.folder.name);
    await loadOrCreateAdr(currentAdrBox, category);
  }
});

bpadrForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    title: bpadrTitle.value.trim() || currentAdrBox?.folder.name || "Untitled",
    category: bpadrCategory.value,
    folder: bpadrFolder.value,
    content: bpadrContent.value,
  };

  if (currentAdrId) {
    // Update existing
    await fetch(`/api/documents/${encodeURIComponent(currentAdrId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    // Reload read view
    const doc = (await fetch(
      `/api/documents/${encodeURIComponent(currentAdrId)}`,
    ).then((r) => r.json())) as {
      title: string;
      html: string;
      content: string;
    };
    bpadrModalTitle.textContent = doc.title;
    bpadrContent.value = doc.content;
    renderMarkdownHtml(doc.html, bpadrRendered);
    showBpadrView("read");
  } else {
    // Create new
    const res = (await fetch("/api/documents/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json())) as { id: string; title: string };
    currentAdrId = res.id;
    const doc = (await fetch(
      `/api/documents/${encodeURIComponent(res.id)}`,
    ).then((r) => r.json())) as {
      title: string;
      html: string;
      content: string;
    };
    bpadrModalTitle.textContent = doc.title;
    bpadrContent.value = doc.content;
    renderMarkdownHtml(doc.html, bpadrRendered);
    showBpadrView("read");
  }
});

async function navigateToFolder(childPath: string): Promise<void> {
  const parentPath = getParentPath(childPath);

  // 1. Navigate canvas to parent level if needed
  if (currentCanvasPath !== parentPath) {
    await loadPath(parentPath, true);
  }

  // 2. Find the box for childPath and center on it
  const box = boxes.find((b) => b.folder.path === childPath);
  if (box) {
    centerOnBox(box);
    activeExplorerPath = childPath;
    scheduleRender();
  }

  // 3. Update the file explorer panel
  await populateExplorer(childPath);
}

async function populateExplorer(folderPath: string): Promise<void> {
  explorerCurrentPath = folderPath;
  renderExplorerBreadcrumb(folderPath);
  explorerList.innerHTML = '<div class="explorer-section-label">Loading…</div>';
  try {
    const data = (await fetch(
      `/api/blueprint/files?path=${encodeURIComponent(folderPath)}`,
    ).then((r) => r.json())) as { folders: string[]; files: string[] };
    explorerList.innerHTML = "";
    if (data.folders.length) {
      const lbl = document.createElement("div");
      lbl.className = "explorer-section-label";
      lbl.textContent = "Folders";
      explorerList.appendChild(lbl);
      for (const name of data.folders) {
        const childPath = folderPath ? `${folderPath}/${name}` : name;
        const item = document.createElement("div");
        item.className = "explorer-item is-folder";
        item.innerHTML = `<span class="explorer-item-icon">📁</span><span class="explorer-item-name">${name}</span>`;
        item.addEventListener("click", () => void navigateToFolder(childPath));
        explorerList.appendChild(item);
      }
    }
    if (data.files.length) {
      const lbl = document.createElement("div");
      lbl.className = "explorer-section-label";
      lbl.textContent = "Files";
      explorerList.appendChild(lbl);
      for (const name of data.files) {
        const filePath = folderPath ? `${folderPath}/${name}` : name;
        const item = document.createElement("div");
        item.className = "explorer-item is-file";
        item.innerHTML = `<span class="explorer-item-icon">📄</span><span class="explorer-item-name">${name}</span>`;
        item.addEventListener(
          "click",
          () => void showFilePreview(filePath, name),
        );
        explorerList.appendChild(item);
      }
    }
    if (!data.folders.length && !data.files.length) {
      explorerList.innerHTML =
        '<div class="explorer-section-label">Empty folder</div>';
    }
  } catch {
    explorerList.innerHTML =
      '<div class="explorer-section-label">Error loading files</div>';
  }
}

function renderExplorerBreadcrumb(folderPath: string): void {
  explorerBreadcrumb.innerHTML = "";
  const rootSpan = document.createElement("span");
  rootSpan.className = `explorer-breadcrumb-item${!folderPath ? " current" : ""}`;
  rootSpan.textContent = "~";
  if (folderPath)
    rootSpan.addEventListener("click", () => void navigateToFolder(""));
  explorerBreadcrumb.appendChild(rootSpan);

  if (folderPath) {
    const parts = folderPath.split("/");
    parts.forEach((part, i) => {
      const sep = document.createElement("span");
      sep.className = "explorer-breadcrumb-sep";
      sep.textContent = "/";
      explorerBreadcrumb.appendChild(sep);
      const isLast = i === parts.length - 1;
      const partPath = parts.slice(0, i + 1).join("/");
      const span = document.createElement("span");
      span.className = `explorer-breadcrumb-item${isLast ? " current" : ""}`;
      span.textContent = part;
      if (!isLast)
        span.addEventListener("click", () => void navigateToFolder(partPath));
      explorerBreadcrumb.appendChild(span);
    });
  }
}

async function showFilePreview(
  filePath: string,
  fileName: string,
): Promise<void> {
  filePreview.innerHTML = `<p class="file-preview-name">${fileName}</p><p class="file-preview-placeholder">Loading…</p>`;
  try {
    const data = (await fetch(
      `/api/blueprint/file-content?path=${encodeURIComponent(filePath)}`,
    ).then((r) => r.json())) as {
      type: "text" | "image" | "video" | "binary";
      content?: string;
      language?: string;
      truncated?: boolean;
      url?: string;
      ext?: string;
    };

    filePreview.innerHTML = `<p class="file-preview-name">${fileName}</p>`;

    if (data.type === "image") {
      const img = document.createElement("img");
      img.src = data.url!;
      img.alt = fileName;
      filePreview.appendChild(img);
    } else if (data.type === "video") {
      const video = document.createElement("video");
      video.src = data.url!;
      video.controls = true;
      filePreview.appendChild(video);
    } else if (data.type === "binary") {
      const badge = document.createElement("span");
      badge.className = "file-preview-binary";
      badge.textContent = "⊘ Binary file";
      filePreview.appendChild(badge);
    } else if (data.type === "text" && data.content !== undefined) {
      if (data.truncated) {
        const badge = document.createElement("span");
        badge.className = "file-preview-truncated";
        badge.textContent = "⚠ Truncated at 1 MB";
        filePreview.appendChild(badge);
      }
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      if (data.language && data.language !== "plaintext")
        code.className = `language-${data.language}`;
      code.textContent = data.content;
      pre.appendChild(code);
      filePreview.appendChild(pre);
      // @ts-ignore
      if (window.hljs) {
        // @ts-ignore
        window.hljs.highlightElement(code);
        // @ts-ignore
        if (window.hljs.lineNumbersBlock) window.hljs.lineNumbersBlock(code);
      }
    }
  } catch {
    filePreview.innerHTML = `<p class="file-preview-name">${fileName}</p><p class="file-preview-placeholder">Error loading file</p>`;
  }
}

async function openFileExplorer(box: Box): Promise<void> {
  activeExplorerPath = box.folder.path;
  fileExplorer.hidden = false;
  filePreview.innerHTML =
    '<p class="file-preview-placeholder">Click a file to preview it</p>';
  scheduleRender();
  await populateExplorer(box.folder.path);
}

function closeFileExplorer(): void {
  activeExplorerPath = null;
  fileExplorer.hidden = true;
  scheduleRender();
}

// ── Events ────────────────────────────────────────────────────────────────────

const DRAG_THRESHOLD = 6;

canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  // Dragging box(es) (only in drag mode)
  if (isDragging && draggingIndex >= 0 && dragMode) {
    const { x: wx, y: wy } = worldFromScreen(sx, sy);
    const dx = wx - dragStartWorld.x;
    const dy = wy - dragStartWorld.y;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD / zoom) didPan = true;
    // Move all selected boxes (or just the dragged one if not in selection)
    const toMove =
      selectedIndices.has(draggingIndex) && selectedIndices.size > 1
        ? [...selectedIndices]
        : [draggingIndex];
    for (const idx of toMove) {
      const orig = dragStartPositions.get(idx);
      if (orig) {
        boxes[idx].x = orig.x + dx;
        boxes[idx].y = orig.y + dy;
      }
    }
    scheduleRender();
    return;
  }

  // Rubber band selection
  if (isSelecting) {
    selectCurrentWorld = worldFromScreen(sx, sy);
    scheduleRender();
    return;
  }

  // Panning the camera
  if (isPanning) {
    const dx = sx - panStartX;
    const dy = sy - panStartY;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) didPan = true;
    cameraX = panStartCX + dx;
    cameraY = panStartCY + dy;
    scheduleRender();
    return;
  }

  const { x, y } = worldFromScreen(sx, sy);
  const idx = boxAt(x, y);
  if (idx !== hoverIndex) {
    hoverIndex = idx;
    canvas.style.cursor =
      idx >= 0 && dragMode ? "grab" : idx >= 0 ? "pointer" : "default";
    scheduleRender();
  }
});

canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const { x: wx, y: wy } = worldFromScreen(sx, sy);
  const idx = boxAt(wx, wy);

  panStartX = sx;
  panStartY = sy;
  didPan = false;
  canvas.setPointerCapture(e.pointerId);

  if (idx >= 0) {
    draggingIndex = idx;
    isDragging = true;
    // Store start world pos and all box start positions for multi-drag
    dragStartWorld = { x: wx, y: wy };
    dragStartPositions = new Map(boxes.map((b, i) => [i, { x: b.x, y: b.y }]));
    dragOffsetX = wx - boxes[idx].x;
    dragOffsetY = wy - boxes[idx].y;
    if (dragMode) canvas.style.cursor = "grabbing";
  } else if (dragMode && e.shiftKey) {
    // Rubber band selection on empty canvas
    isSelecting = true;
    selectStartWorld = { x: wx, y: wy };
    selectCurrentWorld = { x: wx, y: wy };
    canvas.style.cursor = "crosshair";
  } else {
    // Pan the camera
    isPanning = true;
    panStartCX = cameraX;
    panStartCY = cameraY;
  }
});

canvas.addEventListener("pointerup", (e) => {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  canvas.releasePointerCapture(e.pointerId);

  if (isDragging) {
    isDragging = false;
    canvas.style.cursor = dragMode ? "grab" : "pointer";
    if (didPan) {
      // Save new positions for all moved boxes
      const toMove =
        selectedIndices.has(draggingIndex) && selectedIndices.size > 1
          ? [...selectedIndices]
          : [draggingIndex];
      for (const idx of toMove) {
        const b = boxes[idx];
        positions[b.folder.path] = {
          ...(positions[b.folder.path] ?? {}),
          x: b.x,
          y: b.y,
        };
      }
      scheduleSavePositions();
    } else {
      // Click on box (no drag)
      const box = boxes[draggingIndex];
      const { x: wx, y: wy } = worldFromScreen(sx, sy);
      if (dragMode && e.shiftKey) {
        // Shift+click → toggle selection
        if (selectedIndices.has(draggingIndex)) {
          selectedIndices.delete(draggingIndex);
        } else {
          selectedIndices.add(draggingIndex);
        }
        scheduleRender();
      } else if (dragMode) {
        // Regular click in drag mode → select only this box
        selectedIndices.clear();
        selectedIndices.add(draggingIndex);
        scheduleRender();
      } else if (isOnDocIcon(box, wx, wy)) {
        void openBlueprintAdr(box);
      } else if (isOnMenuIcon(box, wx, wy)) {
        if (activeExplorerPath === box.folder.path) closeFileExplorer();
        else void openFileExplorer(box);
      } else if (box.folder.hasChildren) {
        closeFileExplorer();
        loadPath(box.folder.path, true, box);
      }
    }
    draggingIndex = -1;
    return;
  }

  if (isSelecting) {
    isSelecting = false;
    canvas.style.cursor = "crosshair";
    // Select boxes intersecting the rubber band rect
    const rx1 = Math.min(selectStartWorld.x, selectCurrentWorld.x);
    const ry1 = Math.min(selectStartWorld.y, selectCurrentWorld.y);
    const rx2 = Math.max(selectStartWorld.x, selectCurrentWorld.x);
    const ry2 = Math.max(selectStartWorld.y, selectCurrentWorld.y);
    if (rx2 - rx1 > 4 || ry2 - ry1 > 4) {
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        if (b.x < rx2 && b.x + b.w > rx1 && b.y < ry2 && b.y + b.h > ry1) {
          selectedIndices.add(i);
        }
      }
    }
    scheduleRender();
    return;
  }

  if (isPanning) {
    isPanning = false;
    const dx = sx - panStartX;
    const dy = sy - panStartY;
    if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) {
      // Click on empty canvas → clear selection
      if (dragMode) {
        selectedIndices.clear();
        scheduleRender();
      }
    }
  }
});

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    // Zoom the canvas
    const factor = 1 - e.deltaY * 0.0018;
    const newZoom = Math.max(0.15, Math.min(4, zoom * factor));
    cameraX = sx - (sx - cameraX) * (newZoom / zoom);
    cameraY = sy - (sy - cameraY) * (newZoom / zoom);
    zoom = newZoom;
    scheduleRender();
  },
  { passive: false },
);

fitButton.addEventListener("click", () => fitToBoxes(true));
explorerClose.addEventListener("click", () => closeFileExplorer());

dragToggle.addEventListener("click", () => {
  dragMode = !dragMode;
  dragToggle.classList.toggle("active", dragMode);
  if (!dragMode) {
    selectedIndices.clear();
    scheduleRender();
  }
  canvas.style.cursor = dragMode && hoverIndex >= 0 ? "grab" : "default";
});

window.addEventListener("resize", () => {
  scheduleRender();
});

// ── Init ──────────────────────────────────────────────────────────────────────

void loadPositions().then(async () => {
  await loadPath("", false);
});
