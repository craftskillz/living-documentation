<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n.svelte";

  interface Folder {
    name: string;
    path: string;
    hasChildren: boolean;
    hasDoc?: boolean;
  }

  interface BlueprintResponse {
    sourceRoot: string;
    path: string;
    name: string;
    folders: Folder[];
  }

  export interface Box {
    folder: Folder;
    x: number;
    y: number;
    w: number;
    h: number;
  }

  export interface BreadcrumbEntry {
    name: string;
    path: string;
  }

  type PositionEntry = { x: number; y: number; expanded?: boolean };

  interface Cluster {
    id: string;
    label: string;
    members: string[]; // folder paths
  }

  // ── Props ─────────────────────────────────────────────────────────────────────

  let {
    activeExplorerPath = null,
    onbreadcrumbchange,
    onopenexplorer,
    onclosefilerexplorer,
    onopenAdr,
  }: {
    activeExplorerPath: string | null;
    onbreadcrumbchange: (entries: BreadcrumbEntry[]) => void;
    onopenexplorer: (box: Box) => void;
    onclosefilerexplorer: () => void;
    onopenAdr: (box: Box) => void;
  } = $props();

  // ── Constants ─────────────────────────────────────────────────────────────────

  const BLUEPRINT_FOLDER = "000_BLUEPRINT";
  const BOX_W = 200;
  const BOX_H = 110;
  const GAP_X = 40;
  const GAP_Y = 40;
  const COLS = 4;
  const MENU_ICON_SIZE = 20;
  const CORNER_R = 18;
  const ANIM_MS = 420;
  const VIEW_PADDING = 80;
  const DRAG_THRESHOLD = 6;

  const COLOR_BOX_FILL = "#1e293b";
  const COLOR_BOX_FILL_CHILD = "#172033";
  const COLOR_BOX_STROKE = "rgba(255,255,255,0.12)";
  const COLOR_BOX_STROKE_HOVER = "#3b82f6";
  const COLOR_NAME = "#f1f5f9";
  const COLOR_MUTED = "#64748b";
  const COLOR_ARROW = "#3b82f6";

  // ── Canvas ref ────────────────────────────────────────────────────────────────

  let canvasEl: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let emptyStateHidden = $state(true);
  let dragModeActive = $state(false);

  // ── State ─────────────────────────────────────────────────────────────────────

  let cameraX = 0;
  let cameraY = 0;
  let zoom = 1;
  let boxes: Box[] = [];
  let hoverIndex = -1;
  let draggingIndex = -1;
  const selectedIndices = new Set<number>();
  let dragStartPositions: Map<number, { x: number; y: number }> = new Map();
  let dragStartWorld = { x: 0, y: 0 };
  let isSelecting = false;
  let selectStartWorld = { x: 0, y: 0 };
  let selectCurrentWorld = { x: 0, y: 0 };
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
  let animFrame: number | null = null;
  let positions: Record<string, PositionEntry> = {};
  let saveTimer: number | null = null;

  // ── Visual clusters ─────────────────────────────────────────────────────────
  // A cluster is a dashed boundary + label around a set of blocks. Only the
  // membership (folder paths) + label are persisted; the boundary is recomputed
  // from member positions each frame so it follows the blocks.
  let clusters = $state<Cluster[]>([]);
  let clustersSaveTimer: number | null = null;
  let selCount = $state(0); // reactive mirror of selectedIndices.size (drives the Group button)
  // Label overlays are HTML (crisp text + clickable rename/delete), positioned
  // over the canvas; recomputed in render() so they track pan/zoom/drag.
  let clusterOverlays = $state<{ id: string; label: string; x: number; y: number }[]>([]);
  let editingClusterId = $state<string | null>(null);

  const CLUSTER_PAD = 24;
  const CLUSTER_STROKE = "#a78bfa";

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

  function boundsOfBoxes(b: Box[]) {
    if (!b.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const box of b) {
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.w);
      maxY = Math.max(maxY, box.y + box.h);
    }
    return { minX, minY, maxX, maxY };
  }

  // ── Camera ────────────────────────────────────────────────────────────────────

  function getParentPath(p: string): string {
    const i = p.lastIndexOf("/");
    return i >= 0 ? p.slice(0, i) : "";
  }

  export function centerOnBox(box: Box) {
    const W = canvasEl.clientWidth;
    const H = canvasEl.clientHeight;
    const availW = activeExplorerPath === null ? W : W / 2;
    const targetX = availW / 2 - (box.x + box.w / 2) * zoom;
    const targetY = H / 2 - (box.y + box.h / 2) * zoom;
    startAnim(targetX, targetY, zoom);
  }

  function fitToBoxes(animate: boolean) {
    if (!boxes.length) return;
    const { minX, minY, maxX, maxY } = boundsOfBoxes(boxes);
    const W = canvasEl.clientWidth;
    const H = canvasEl.clientHeight;
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
    const W = canvasEl.clientWidth;
    const H = canvasEl.clientHeight;
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
    const W = canvasEl.clientWidth;
    const H = canvasEl.clientHeight;
    if (canvasEl.width !== W * dpr || canvasEl.height !== H * dpr) {
      canvasEl.width = W * dpr;
      canvasEl.height = H * dpr;
    }

    ctx.save();
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.scale(dpr, dpr);

    drawGrid(W, H);

    ctx.translate(cameraX, cameraY);
    ctx.scale(zoom, zoom);

    drawClusters();

    for (let i = 0; i < boxes.length; i++) {
      drawBox(boxes[i], i === hoverIndex, i === draggingIndex, selectedIndices.has(i));
    }

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

  // Draws each cluster's dashed boundary (behind the boxes) and collects the
  // screen-space positions for its HTML label overlay (rename + delete).
  function drawClusters() {
    const overlays: { id: string; label: string; x: number; y: number }[] = [];
    for (const cluster of clusters) {
      const members = boxes.filter((b) => cluster.members.includes(b.folder.path));
      if (members.length === 0) continue; // not in the current view
      const { minX, minY, maxX, maxY } = boundsOfBoxes(members);
      const x = minX - CLUSTER_PAD;
      const y = minY - CLUSTER_PAD;
      const w = maxX - minX + CLUSTER_PAD * 2;
      const h = maxY - minY + CLUSTER_PAD * 2;

      ctx.save();
      ctx.strokeStyle = CLUSTER_STROKE;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([8 / zoom, 6 / zoom]);
      roundRect(x, y, w, h, CORNER_R);
      ctx.stroke();
      ctx.restore();

      // Label tag rides the top-left of the boundary; rendered as HTML overlay.
      overlays.push({
        id: cluster.id,
        label: cluster.label,
        x: cameraX + x * zoom + 10 * zoom,
        // Anchor on the boundary's top line; CSS straddles the tag over it.
        y: cameraY + y * zoom,
      });
    }
    clusterOverlays = overlays;
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

  function drawBox(box: Box, hovered: boolean, dragging = false, selected = false) {
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

    ctx.save();
    ctx.shadowColor = dragging ? "rgba(245,158,11,0.4)" : "rgba(0,0,0,0.4)";
    ctx.shadowBlur = dragging ? 36 : hovered ? 24 : 12;
    roundRect(x, y, w, h, CORNER_R);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();

    roundRect(x, y, w, h, CORNER_R);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw / zoom;
    ctx.stroke();

    const menuActive = isExplorerOpen;
    ctx.fillStyle = menuActive ? "#60a5fa" : hovered ? "#94a3b8" : "rgba(255,255,255,0.3)";
    ctx.font = `${MENU_ICON_SIZE * 0.7}px sans-serif`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText("☰", x + 10, y + 10);

    // Two visual states for the "D" badge:
    //  - written  → solid emerald "D" (a document already exists for this block)
    //  - to-write → faint purple "D" with a small "+" (clicking creates it)
    // The "+" affordance plus solid-vs-faint hue keeps the states distinct even
    // without relying on colour alone.
    const docWritten = box.folder.hasDoc === true;
    const dx = x + 10 + MENU_ICON_SIZE + 4;
    const docColor = docWritten
      ? (hovered ? "#34d399" : "#10b981")
      : (hovered ? "#a78bfa" : "rgba(167,139,250,0.4)");
    ctx.fillStyle = docColor;
    ctx.font = `bold ${MENU_ICON_SIZE * 0.65}px Inter, ui-sans-serif, sans-serif`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText("D", dx, y + 11);
    if (!docWritten) {
      // small "+" flagging "no document yet — click to add"
      ctx.font = `bold ${MENU_ICON_SIZE * 0.5}px Inter, ui-sans-serif, sans-serif`;
      ctx.fillText("+", dx + MENU_ICON_SIZE * 0.6, y + 7);
    }

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

    if (folder.hasChildren) {
      drawArrow(x + w - 22, y + h / 2, hovered);
    }
  }

  function drawFolderIcon(x: number, y: number, size: number, hovered: boolean) {
    const color = hovered ? COLOR_ARROW : COLOR_MUTED;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y + size * 0.3, size, size * 0.7, 2);
    ctx.fill();
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
    while (truncated.length > 1 && ctx.measureText(truncated + "…").width > maxW) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + "…";
  }

  // ── Persistence ───────────────────────────────────────────────────────────────

  async function loadPositions(): Promise<void> {
    try {
      positions = (await fetch("/api/blueprint/positions").then((r) => r.json())) as Record<string, PositionEntry>;
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

  async function loadClusters(): Promise<void> {
    try {
      const data = (await fetch("/api/blueprint/clusters").then((r) => r.json())) as Cluster[];
      clusters = Array.isArray(data) ? data : [];
    } catch {
      clusters = [];
    }
  }

  function scheduleSaveClusters(): void {
    if (clustersSaveTimer !== null) clearTimeout(clustersSaveTimer);
    clustersSaveTimer = window.setTimeout(() => {
      clustersSaveTimer = null;
      void fetch("/api/blueprint/clusters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clusters),
      });
    }, 600);
  }

  function syncSelection(): void {
    selCount = selectedIndices.size;
  }

  // Group the current selection into a new cluster, then clear the selection.
  function groupSelection(): void {
    const members = [...selectedIndices].map((i) => boxes[i]?.folder.path).filter(Boolean) as string[];
    if (members.length === 0) return;
    const id = `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    clusters = [...clusters, { id, label: t("blueprint.cluster.default_label"), members }];
    scheduleSaveClusters();
    selectedIndices.clear();
    syncSelection();
    scheduleRender();
  }

  function renameCluster(id: string, label: string): void {
    clusters = clusters.map((c) => (c.id === id ? { ...c, label } : c));
    scheduleSaveClusters();
    scheduleRender();
  }

  function deleteCluster(id: string): void {
    clusters = clusters.filter((c) => c.id !== id);
    if (editingClusterId === id) editingClusterId = null;
    scheduleSaveClusters();
    scheduleRender();
  }

  // ── API ───────────────────────────────────────────────────────────────────────

  export async function loadPath(folderPath: string, animate: boolean, zoomBox?: Box) {
    try {
      const url = `/api/blueprint${folderPath ? `?path=${encodeURIComponent(folderPath)}` : ""}`;
      const data = (await fetch(url).then((r) => r.json())) as BlueprintResponse;

      let breadcrumb: BreadcrumbEntry[];
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
      onbreadcrumbchange(breadcrumb);

      currentCanvasPath = folderPath;
      boxes = layoutFolders(data.folders);
      emptyStateHidden = boxes.length > 0;

      if (zoomBox && animate) {
        zoomIntoBox(zoomBox);
        setTimeout(() => fitToBoxes(true), ANIM_MS * 0.6);
      } else {
        fitToBoxes(animate);
      }

      scheduleRender();
    } catch (e) {
      console.error("Blueprint load error", e);
    }
  }

  // ── Hit test ──────────────────────────────────────────────────────────────────

  function worldFromScreen(sx: number, sy: number) {
    return { x: (sx - cameraX) / zoom, y: (sy - cameraY) / zoom };
  }

  function boxAt(wx: number, wy: number): number {
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) return i;
    }
    return -1;
  }

  function isOnMenuIcon(box: Box, wx: number, wy: number): boolean {
    return wx >= box.x + 6 && wx <= box.x + 6 + MENU_ICON_SIZE && wy >= box.y + 6 && wy <= box.y + 6 + MENU_ICON_SIZE;
  }

  function isOnDocIcon(box: Box, wx: number, wy: number): boolean {
    const iconX = box.x + 10 + MENU_ICON_SIZE + 4;
    return wx >= iconX && wx <= iconX + MENU_ICON_SIZE && wy >= box.y + 6 && wy <= box.y + 6 + MENU_ICON_SIZE;
  }

  // ── Public API (called by parent) ─────────────────────────────────────────────

  export async function navigateToFolder(childPath: string): Promise<void> {
    const parentPath = getParentPath(childPath);
    if (currentCanvasPath !== parentPath) {
      await loadPath(parentPath, true);
    }
    const box = boxes.find((b) => b.folder.path === childPath);
    if (box) {
      centerOnBox(box);
      scheduleRender();
    }
  }

  // ── Canvas events ─────────────────────────────────────────────────────────────

  function onPointermove(e: PointerEvent) {
    const rect = canvasEl.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (isDragging && draggingIndex >= 0 && dragModeActive) {
      const { x: wx, y: wy } = worldFromScreen(sx, sy);
      const dx = wx - dragStartWorld.x;
      const dy = wy - dragStartWorld.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD / zoom) didPan = true;
      const toMove = selectedIndices.has(draggingIndex) && selectedIndices.size > 1
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

    if (isSelecting) {
      selectCurrentWorld = worldFromScreen(sx, sy);
      scheduleRender();
      return;
    }

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
      canvasEl.style.cursor = idx >= 0 && dragModeActive ? "grab" : idx >= 0 ? "pointer" : "default";
      scheduleRender();
    }
  }

  function onPointerdown(e: PointerEvent) {
    const rect = canvasEl.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = worldFromScreen(sx, sy);
    const idx = boxAt(wx, wy);

    panStartX = sx;
    panStartY = sy;
    didPan = false;
    canvasEl.setPointerCapture(e.pointerId);

    if (idx >= 0) {
      draggingIndex = idx;
      isDragging = true;
      dragStartWorld = { x: wx, y: wy };
      dragStartPositions = new Map(boxes.map((b, i) => [i, { x: b.x, y: b.y }]));
      dragOffsetX = wx - boxes[idx].x;
      dragOffsetY = wy - boxes[idx].y;
      if (dragModeActive) canvasEl.style.cursor = "grabbing";
    } else if (dragModeActive && e.shiftKey) {
      isSelecting = true;
      selectStartWorld = { x: wx, y: wy };
      selectCurrentWorld = { x: wx, y: wy };
      canvasEl.style.cursor = "crosshair";
    } else {
      isPanning = true;
      panStartCX = cameraX;
      panStartCY = cameraY;
    }
  }

  function onPointerup(e: PointerEvent) {
    const rect = canvasEl.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    canvasEl.releasePointerCapture(e.pointerId);

    if (isDragging) {
      isDragging = false;
      canvasEl.style.cursor = dragModeActive ? "grab" : "pointer";
      if (didPan) {
        const toMove = selectedIndices.has(draggingIndex) && selectedIndices.size > 1
          ? [...selectedIndices]
          : [draggingIndex];
        for (const idx of toMove) {
          const b = boxes[idx];
          positions[b.folder.path] = { ...(positions[b.folder.path] ?? {}), x: b.x, y: b.y };
        }
        scheduleSavePositions();
      } else {
        const box = boxes[draggingIndex];
        const { x: wx, y: wy } = worldFromScreen(sx, sy);
        if (dragModeActive && e.shiftKey) {
          if (selectedIndices.has(draggingIndex)) selectedIndices.delete(draggingIndex);
          else selectedIndices.add(draggingIndex);
          syncSelection();
          scheduleRender();
        } else if (dragModeActive) {
          selectedIndices.clear();
          selectedIndices.add(draggingIndex);
          syncSelection();
          scheduleRender();
        } else if (isOnDocIcon(box, wx, wy)) {
          onopenAdr(box);
        } else if (isOnMenuIcon(box, wx, wy)) {
          if (activeExplorerPath === box.folder.path) onclosefilerexplorer();
          else onopenexplorer(box);
        } else if (box.folder.hasChildren) {
          onclosefilerexplorer();
          loadPath(box.folder.path, true, box);
        }
      }
      draggingIndex = -1;
      return;
    }

    if (isSelecting) {
      isSelecting = false;
      canvasEl.style.cursor = "crosshair";
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
      syncSelection();
      scheduleRender();
      return;
    }

    if (isPanning) {
      isPanning = false;
      const dx = sx - panStartX;
      const dy = sy - panStartY;
      if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) {
        if (dragModeActive) {
          selectedIndices.clear();
          syncSelection();
          scheduleRender();
        }
      }
    }
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = canvasEl.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const factor = 1 - e.deltaY * 0.0018;
    const newZoom = Math.max(0.15, Math.min(4, zoom * factor));
    cameraX = sx - (sx - cameraX) * (newZoom / zoom);
    cameraY = sy - (sy - cameraY) * (newZoom / zoom);
    zoom = newZoom;
    scheduleRender();
  }

  function onFitClick() {
    fitToBoxes(true);
  }

  // Opens the file explorer for the folder we are currently inside — same as a
  // box's burger (☰) menu, but targeting `currentCanvasPath` rather than a child.
  function openCurrentExplorer() {
    const name = currentCanvasPath ? currentCanvasPath.split("/").pop()! : "";
    onopenexplorer({
      folder: { name, path: currentCanvasPath, hasChildren: true },
      x: 0, y: 0, w: 0, h: 0,
    });
  }

  function onDragToggle() {
    dragModeActive = !dragModeActive;
    if (!dragModeActive) {
      selectedIndices.clear();
      syncSelection();
      scheduleRender();
    }
    canvasEl.style.cursor = dragModeActive && hoverIndex >= 0 ? "grab" : "default";
  }

  // ── Init ──────────────────────────────────────────────────────────────────────

  onMount(() => {
    ctx = canvasEl.getContext("2d")!;
    window.addEventListener("resize", scheduleRender);
    void Promise.all([loadPositions(), loadClusters()]).then(async () => {
      await loadPath("", false);
    });
    return () => {
      window.removeEventListener("resize", scheduleRender);
    };
  });
</script>

<nav class="rail">
  <button class="tool-button" type="button" title={t("blueprint.canvas.fit_view")} onclick={onFitClick}>⌖</button>
  <button
    class="tool-button"
    class:active={dragModeActive}
    type="button"
    title={t("blueprint.canvas.drag_mode")}
    onclick={onDragToggle}
  >⠿</button>
  <button
    class="tool-button"
    type="button"
    title={t("blueprint.canvas.create_cluster")}
    disabled={selCount === 0}
    onclick={groupSelection}
  >⬚</button>
  <button
    class="tool-button"
    class:active={activeExplorerPath === currentCanvasPath}
    type="button"
    title={t("blueprint.canvas.browse_current")}
    onclick={openCurrentExplorer}
  >☰</button>
</nav>

<canvas
  bind:this={canvasEl}
  id="blueprintCanvas"
  onpointermove={onPointermove}
  onpointerdown={onPointerdown}
  onpointerup={onPointerup}
  onwheel={onWheel}
></canvas>

<!-- Cluster label tags: HTML overlay positioned over the canvas (crisp text +
     clickable rename/delete). Positions are recomputed each render. -->
<div class="cluster-overlays">
  {#each clusterOverlays as ov (ov.id)}
    <div class="cluster-tag" style="left:{ov.x}px; top:{ov.y}px;">
      {#if editingClusterId === ov.id}
        <!-- svelte-ignore a11y_autofocus -->
        <input
          class="cluster-tag-input"
          autofocus
          value={ov.label}
          onkeydown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); else if (e.key === "Escape") editingClusterId = null; }}
          onblur={(e) => { renameCluster(ov.id, (e.currentTarget as HTMLInputElement).value.trim() || ov.label); editingClusterId = null; }}
        />
      {:else}
        <button class="cluster-tag-label" type="button" title={t("blueprint.cluster.rename")} onclick={() => (editingClusterId = ov.id)}>
          {ov.label || t("blueprint.cluster.default_label")}
        </button>
      {/if}
      {#if dragModeActive}
        <button class="cluster-tag-del" type="button" title={t("blueprint.cluster.delete")} onclick={() => deleteCluster(ov.id)}>×</button>
      {/if}
    </div>
  {/each}
</div>

{#if !emptyStateHidden}
  <div class="empty-state">
    <p>No sub-folders found.</p>
  </div>
{/if}
