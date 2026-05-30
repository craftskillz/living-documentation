(function () {
  "use strict";

  const LEAF_WIDTH = 164;
  const LEAF_HEIGHT = 64;
  const ROOT_RADIUS = 132;
  const PROVIDER_RADIUS = 78;
  const MIN_POLYGON_SIDES = 6;
  const GRID_MINOR = 24;
  const GRID_MAJOR = 96;
  const PANEL_MIN_WIDTH = 360;
  const PANEL_MAX_WIDTH = 520;
  const PANEL_VIEWPORT_RATIO = 1 / 3;
  const PANEL_HEIGHT = 650;
  const PANEL_GAP = 44;
  const ROOT_CHILD_DISTANCE = 255;
  const PROVIDER_CHILD_DISTANCE = 178;
  const HIT_PADDING = 14;
  const VIEW_TRANSITION_MS = 260;
  const PANEL_EVENT_TYPES = ["pointerdown", "mousedown", "click", "dblclick", "touchstart", "wheel"];
  const ZOOM_MIN = 0.35;
  const ZOOM_MAX = 2.2;
  const ZOOM_WHEEL_FACTOR = 0.0018;
  const PAN_THRESHOLD = 4;
  const NODE_SPACING_GAP = 46;

  const canvas = document.getElementById("workspaceCanvas");
  const ctx = canvas.getContext("2d");
  const apiStatus = document.getElementById("apiStatus");
  const addButton = document.getElementById("addButton");
  const fitButton = document.getElementById("fitButton");
  const resetButton = document.getElementById("resetButton");
  const deleteNodeButton = document.getElementById("deleteNodeButton");
  const deleteConfirmOverlay = document.getElementById("deleteConfirmOverlay");
  const deleteConfirmMessage = document.getElementById("deleteConfirmMessage");
  const cancelDeleteButton = document.getElementById("cancelDeleteButton");
  const confirmDeleteButton = document.getElementById("confirmDeleteButton");
  const fallbackPanelHost = document.getElementById("fallbackPanelHost");
  const configSurface = document.getElementById("configSurface");
  const form = configSurface;

  const fields = {
    name: document.getElementById("nodeName"),
    kind: document.getElementById("nodeKind"),
    environment: document.getElementById("nodeEnvironment"),
    endpoint: document.getElementById("nodeEndpoint"),
    token: document.getElementById("nodeToken"),
    timeout: document.getElementById("nodeTimeout"),
    retryPolicy: document.getElementById("nodeRetryPolicy"),
    description: document.getElementById("nodeDescription"),
    typeBadge: document.getElementById("nodeTypeBadge"),
    healthBadge: document.getElementById("nodeHealthBadge"),
    mcpInventory: document.getElementById("mcpInventory"),
  };

  const initialEntities = [
    createEntity("root", "Living AI Documentation", "system", null),
    createEntity("devstral", "DevStral2 LLM API", "llm", "root"),
    createEntity("qwen", "Qwen2 LLM API", "llm", "root"),
    createEntity("mcp", "MCP", "mcp", "root"),
    createEntity("review-agent", "Code Review Agent", "agent", "devstral"),
    createEntity("sonar-agent", "Sonarqube Metrics Agent", "agent", "devstral"),
    createEntity("doc-agent", "Documentation Agent", "agent", "qwen"),
  ];

  const state = {
    entities: cloneEntities(initialEntities),
    selectedId: null,
    cameraX: 0,
    cameraY: 0,
    zoom: 1,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    panStartCameraX: 0,
    panStartCameraY: 0,
    didPan: false,
    viewAnimationId: null,
    dpr: window.devicePixelRatio || 1,
    apiMode: "fallback",
    lastSaveAt: null,
    pendingDeleteId: null,
  };

  const supportsHtmlInCanvas =
    Boolean(canvas.requestPaint) && typeof ctx.drawElementImage === "function";

  if (!supportsHtmlInCanvas) {
    fallbackPanelHost.appendChild(configSurface);
    apiStatus.textContent = "DOM fallback";
    apiStatus.classList.add("is-fallback");
  } else {
    state.apiMode = "html-in-canvas";
    apiStatus.textContent = "HTML-in-Canvas active";
    apiStatus.classList.add("is-live");
    canvas.onpaint = render;
  }

  const resizeObserver = new ResizeObserver(([entry]) => {
    const box = entry.devicePixelContentBoxSize && entry.devicePixelContentBoxSize[0];
    const cssWidth = entry.contentRect.width;
    const cssHeight = entry.contentRect.height;

    state.dpr = box ? box.inlineSize / cssWidth : window.devicePixelRatio || 1;
    canvas.width = box ? box.inlineSize : Math.floor(cssWidth * state.dpr);
    canvas.height = box ? box.blockSize : Math.floor(cssHeight * state.dpr);
    resetView(false, !state.cameraX && !state.cameraY);
    layoutGraph();
    scheduleRender();
  });

  resizeObserver.observe(canvas, { box: "device-pixel-content-box" });
  isolatePanelEvents();
  isolateConfirmEvents();

  addButton.addEventListener("click", () => {
    addContextualNode();
  });

  fitButton.addEventListener("click", () => {
    resetView(true, true);
    layoutGraph();
    scheduleRender();
  });

  resetButton.addEventListener("click", () => {
    state.entities = cloneEntities(initialEntities);
    state.selectedId = null;
    state.lastSaveAt = null;
    resetView(true, true);
    layoutGraph();
    syncPanelFromSelection();
    scheduleRender();
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (event.target !== canvas) {
      return;
    }

    const screenPoint = canvasPointFromEvent(event);
    const worldPoint = screenToWorld(screenPoint);
    const hitEntity = [...state.entities].reverse().find((entity) => isEntityHit(entity, worldPoint));

    if (hitEntity) {
      selectEntity(hitEntity.id);
      return;
    }

    state.isPanning = true;
    state.didPan = false;
    state.panStartX = screenPoint.x;
    state.panStartY = screenPoint.y;
    state.panStartCameraX = state.cameraX;
    state.panStartCameraY = state.cameraY;
    canvas.classList.add("is-panning");
    canvas.setPointerCapture?.(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.isPanning) {
      return;
    }

    const point = canvasPointFromEvent(event);
    const dx = point.x - state.panStartX;
    const dy = point.y - state.panStartY;
    if (Math.hypot(dx, dy) > PAN_THRESHOLD) {
      state.didPan = true;
    }

    state.cameraX = state.panStartCameraX + dx;
    state.cameraY = state.panStartCameraY + dy;
    scheduleRender();
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!state.isPanning) {
      return;
    }

    state.isPanning = false;
    canvas.classList.remove("is-panning");
    canvas.releasePointerCapture?.(event.pointerId);

    if (!state.didPan && state.selectedId) {
      selectEntity(null);
    }
  });

  canvas.addEventListener("pointercancel", (event) => {
    state.isPanning = false;
    canvas.classList.remove("is-panning");
    canvas.releasePointerCapture?.(event.pointerId);
  });

  canvas.addEventListener("wheel", (event) => {
    if (event.target !== canvas) {
      return;
    }

    event.preventDefault();
    zoomAt(canvasPointFromEvent(event), Math.exp(-event.deltaY * ZOOM_WHEEL_FACTOR));
  }, { passive: false });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    syncSelectedFromForm();
    state.lastSaveAt = new Date();
    fields.healthBadge.textContent = "Applied";
    layoutGraph();
    scheduleRender();
  });

  form.addEventListener("input", () => {
    syncSelectedFromForm();
    fields.healthBadge.textContent = "Draft";
    layoutGraph();
    scheduleRender();
  });

  deleteNodeButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const selectedId = state.selectedId;
    const selected = selectedId ? entityById(selectedId) : null;
    if (!selected || isProtectedEntity(selectedId)) {
      return;
    }

    openDeleteConfirmation(selected);
  });

  cancelDeleteButton.addEventListener("click", closeDeleteConfirmation);
  deleteConfirmOverlay.addEventListener("click", (event) => {
    if (event.target === deleteConfirmOverlay) {
      closeDeleteConfirmation();
    }
  });
  confirmDeleteButton.addEventListener("click", () => {
    if (state.pendingDeleteId) {
      performDelete(state.pendingDeleteId);
    }
    closeDeleteConfirmation();
  });

  document.getElementById("testNodeButton").addEventListener("click", () => {
    fields.healthBadge.textContent = "Tested";
    scheduleRender();
  });

  resetView(false, true);
  layoutGraph();
  syncPanelFromSelection();
  scheduleRender();

  function isolatePanelEvents() {
    for (const type of PANEL_EVENT_TYPES) {
      configSurface.addEventListener(type, stopPanelEventPropagation);
      fallbackPanelHost.addEventListener(type, stopPanelEventPropagation);
    }
  }

  function isolateConfirmEvents() {
    for (const type of PANEL_EVENT_TYPES) {
      deleteConfirmOverlay.addEventListener(type, stopPanelEventPropagation);
    }
  }

  function stopPanelEventPropagation(event) {
    event.stopPropagation();
  }

  function createEntity(id, label, kind, parentId) {
    return {
      id,
      label,
      kind,
      parentId,
      x: 0,
      y: 0,
      angle: 0,
      config: {
        environment: defaultEnvironment(kind),
        endpoint: defaultEndpoint(id, kind),
        token: "",
        timeout: kind === "agent" ? 45 : 30,
        retryPolicy: kind === "llm" ? "exponential" : "linear",
        description: defaultDescription(kind),
      },
    };
  }

  function cloneEntities(entities) {
    return entities.map((entity) => ({
      ...entity,
      config: { ...entity.config },
    }));
  }

  function defaultEnvironment(kind) {
    if (kind === "llm" || kind === "mcp") {
      return "production";
    }
    return "local";
  }

  function defaultEndpoint(id, kind) {
    if (kind === "llm") {
      return `https://api.${id}.example/v1`;
    }
    if (kind === "mcp") {
      return "http://localhost:4321/mcp";
    }
    return "";
  }

  function defaultDescription(kind) {
    const copy = {
      system: "Owns the documentation workspace, MCP access, providers, and agent topology.",
      llm: "Routes model calls and hosts the agents assigned to this provider.",
      agent: "Runs focused automation against documentation, source, or quality signals.",
      mcp: "Exposes the local Living Documentation MCP consultation panel to agents.",
    };
    return copy[kind] || copy.agent;
  }

  function addContextualNode() {
    const selected = selectedEntity();
    const parent = selected?.kind === "llm" ? selected : entityById(selected?.parentId);
    const shouldAddAgent = selected?.kind === "llm" || parent?.kind === "llm";

    if (shouldAddAgent) {
      addAgent(parent.id);
      return;
    }

    addProvider();
  }

  function addProvider() {
    const index = childrenOf("root").filter((entity) => entity.kind === "llm").length + 1;
    const id = `provider-${Date.now().toString(36)}`;
    const provider = createEntity(id, `LLM Provider ${index}`, "llm", "root");
    state.entities = [...state.entities, provider];
    state.selectedId = provider.id;
    resetView(true, false);
    layoutGraph();
    syncPanelFromSelection();
    scheduleRender();
  }

  function addAgent(parentId) {
    const index = childrenOf(parentId).filter((entity) => entity.kind === "agent").length + 1;
    const id = `agent-${Date.now().toString(36)}`;
    const agent = createEntity(id, `Agent ${index}`, "agent", parentId);
    state.entities = [...state.entities, agent];
    state.selectedId = agent.id;
    resetView(true, false);
    layoutGraph();
    syncPanelFromSelection();
    scheduleRender();
  }

  function layoutGraph() {
    const root = entityById("root");
    root.x = 0;
    root.y = 0;
    root.angle = 0;

    layoutRootChildren(root);

    for (const provider of state.entities.filter((entity) => entity.kind === "llm")) {
      layoutProviderChildren(provider);
    }
  }

  function layoutRootChildren(root) {
    const children = childrenOf(root.id);
    const layoutSlots = Math.max(1, children.length);
    const distance = distanceForChildren(children, ROOT_RADIUS, ROOT_CHILD_DISTANCE, true);

    children.forEach((child, index) => {
      const angle = -Math.PI / 2 + (index / layoutSlots) * Math.PI * 2;
      child.angle = angle;
      child.x = root.x + Math.cos(angle) * distance;
      child.y = root.y + Math.sin(angle) * distance;
    });
  }

  function layoutProviderChildren(provider) {
    const children = childrenOf(provider.id);
    if (!children.length) {
      return;
    }

    const outwardAngle = Math.atan2(provider.y, provider.x);
    const layoutSlots = Math.max(1, children.length);
    const distance = distanceForChildren(children, PROVIDER_RADIUS, PROVIDER_CHILD_DISTANCE, false);

    children.forEach((child, index) => {
      const angle = outwardAngle + (index / layoutSlots) * Math.PI * 2;
      child.angle = angle;
      child.x = provider.x + Math.cos(angle) * distance;
      child.y = provider.y + Math.sin(angle) * distance;
    });
  }

  function distanceForChildren(children, parentRadius, minimumDistance, includeSubtree) {
    if (!children.length) {
      return minimumDistance;
    }

    const largestChildRadius = Math.max(...children.map((child) => includeSubtree ? subtreeRadius(child) : collisionRadius(child)));
    const parentClearance = parentRadius + largestChildRadius + NODE_SPACING_GAP;

    if (children.length === 1) {
      return Math.max(minimumDistance, parentClearance);
    }

    const largestChildDiameter = largestChildRadius * 2 + NODE_SPACING_GAP;
    const chordDistance = largestChildDiameter / (2 * Math.sin(Math.PI / children.length));
    return Math.max(minimumDistance, parentClearance, chordDistance);
  }

  function subtreeRadius(entity) {
    if (entity.kind !== "llm") {
      return collisionRadius(entity);
    }

    const children = childrenOf(entity.id);
    if (!children.length) {
      return PROVIDER_RADIUS;
    }

    const childDistance = distanceForChildren(children, PROVIDER_RADIUS, PROVIDER_CHILD_DISTANCE, false);
    const largestChildRadius = Math.max(...children.map((child) => collisionRadius(child)));
    return childDistance + largestChildRadius;
  }

  function collisionRadius(entity) {
    if (entity.kind === "system") {
      return ROOT_RADIUS;
    }
    if (entity.kind === "llm") {
      return PROVIDER_RADIUS;
    }

    const { width, height } = leafSize(entity);
    return Math.hypot(width / 2, height / 2);
  }

  function selectEntity(id) {
    state.selectedId = id;
    resetView(true, false);
    layoutGraph();
    syncPanelFromSelection();
    scheduleRender();
  }

  function openDeleteConfirmation(entity) {
    const descendants = descendantIds(entity.id);
    const childCount = childrenOf(entity.id).length;
    const descendantCopy = descendants.length
      ? ` This node has ${childCount} direct child${childCount === 1 ? "" : "ren"} and ${descendants.length} total descendant${descendants.length === 1 ? "" : "s"}; they will also be deleted.`
      : " This node has no children.";

    state.pendingDeleteId = entity.id;
    deleteConfirmMessage.textContent = `You are about to delete "${entity.label}".${descendantCopy} This action cannot be undone in this experiment.`;
    deleteConfirmOverlay.hidden = false;
    confirmDeleteButton.focus();
  }

  function closeDeleteConfirmation() {
    state.pendingDeleteId = null;
    deleteConfirmOverlay.hidden = true;
  }

  function performDelete(selectedId) {
    const selected = entityById(selectedId);
    if (!selected || isProtectedEntity(selectedId)) {
      return;
    }

    const parentId = selected.parentId || "root";
    const idsToRemove = new Set([selectedId, ...descendantIds(selectedId)]);
    state.entities = state.entities.filter((entity) => !idsToRemove.has(entity.id));
    state.selectedId = entityById(parentId) ? parentId : null;
    resetView(true, false);
    layoutGraph();
    syncPanelFromSelection();
    scheduleRender();
  }

  function syncPanelFromSelection() {
    const selected = selectedEntity();
    const hasSelection = Boolean(selected);
    configSurface.hidden = !hasSelection;
    fallbackPanelHost.hidden = !hasSelection || supportsHtmlInCanvas;

    if (!selected) {
      addButton.title = "Add LLM provider";
      return;
    }

    fields.name.value = selected.label;
    fields.kind.value = selected.kind;
    fields.environment.value = selected.config.environment;
    fields.endpoint.value = selected.config.endpoint;
    fields.token.value = selected.config.token;
    fields.timeout.value = selected.config.timeout;
    fields.retryPolicy.value = selected.config.retryPolicy;
    fields.description.value = selected.config.description;
    fields.typeBadge.textContent = labelForBadge(selected.kind);
    fields.healthBadge.textContent = state.lastSaveAt ? "Applied" : "Ready";
    fields.kind.disabled = true;
    fields.mcpInventory.hidden = selected.kind !== "mcp";
    deleteNodeButton.disabled = isProtectedEntity(selected.id);
    addButton.title = selected.kind === "llm" || entityById(selected.parentId)?.kind === "llm"
      ? "Add agent"
      : "Add LLM provider";
  }

  function syncSelectedFromForm() {
    const selected = selectedEntity();
    if (!selected) {
      return;
    }

    selected.label = fields.name.value.trim() || "Untitled node";
    selected.kind = fields.kind.value;
    selected.config.environment = fields.environment.value;
    selected.config.endpoint = fields.endpoint.value;
    selected.config.token = fields.token.value;
    selected.config.timeout = Number(fields.timeout.value || 30);
    selected.config.retryPolicy = fields.retryPolicy.value;
    selected.config.description = fields.description.value;
    fields.typeBadge.textContent = labelForBadge(selected.kind);
  }

  function labelForBadge(kind) {
    const labels = {
      system: "System",
      llm: "LLM provider",
      agent: "Agent",
      mcp: "MCP",
    };
    return labels[kind] || "Node";
  }

  function selectedEntity() {
    return state.selectedId ? entityById(state.selectedId) : null;
  }

  function entityById(id) {
    return state.entities.find((entity) => entity.id === id);
  }

  function isProtectedEntity(id) {
    return id === "root" || id === "mcp";
  }

  function childrenOf(parentId) {
    return state.entities.filter((entity) => entity.parentId === parentId);
  }

  function descendantIds(parentId) {
    const ids = [];
    for (const child of childrenOf(parentId)) {
      ids.push(child.id, ...descendantIds(child.id));
    }
    return ids;
  }

  function scheduleRender() {
    if (supportsHtmlInCanvas) {
      canvas.requestPaint();
    } else {
      requestAnimationFrame(render);
    }
  }

  function render() {
    const cssWidth = canvas.width / state.dpr;
    const cssHeight = canvas.height / state.dpr;

    ctx.reset();
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    ctx.save();
    ctx.translate(state.cameraX, state.cameraY);
    ctx.scale(state.zoom, state.zoom);
    drawGrid(cssWidth, cssHeight);
    drawTopology();
    ctx.restore();

    if (supportsHtmlInCanvas) {
      drawConfigSurface(cssWidth, cssHeight);
    }
  }

  function drawGrid(width, height) {
    ctx.save();
    ctx.lineWidth = 1 / state.zoom;

    const topLeft = screenToWorld({ x: 0, y: 0 });
    const bottomRight = screenToWorld({ x: width, y: height });
    const startX = Math.floor(topLeft.x / GRID_MINOR) * GRID_MINOR;
    const endX = Math.ceil(bottomRight.x / GRID_MINOR) * GRID_MINOR;
    const startY = Math.floor(topLeft.y / GRID_MINOR) * GRID_MINOR;
    const endY = Math.ceil(bottomRight.y / GRID_MINOR) * GRID_MINOR;

    for (let x = startX; x <= endX; x += GRID_MINOR) {
      ctx.strokeStyle = x % GRID_MAJOR === 0 ? "#d7dce5" : "#edf0f4";
      drawLine(x, startY, x, endY);
    }

    for (let y = startY; y <= endY; y += GRID_MINOR) {
      ctx.strokeStyle = y % GRID_MAJOR === 0 ? "#d7dce5" : "#edf0f4";
      drawLine(startX, y, endX, y);
    }

    ctx.restore();
  }

  function drawTopology() {
    drawConnections();
    for (const entity of state.entities) {
      drawEntity(entity);
    }
  }

  function drawConnections() {
    ctx.save();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2 / state.zoom;

    for (const entity of state.entities) {
      const parent = entityById(entity.parentId);
      if (!parent) {
        continue;
      }

      const angle = Math.atan2(entity.y - parent.y, entity.x - parent.x);
      const from = boundaryPoint(parent, angle);
      const to = boundaryPoint(entity, angle + Math.PI);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawEntity(entity) {
    if (entity.kind === "system" || entity.kind === "llm") {
      drawPolygonEntity(entity);
      return;
    }

    drawLeafEntity(entity);
  }

  function drawPolygonEntity(entity) {
    const selected = entity.id === state.selectedId;
    const radius = entity.kind === "system" ? ROOT_RADIUS : PROVIDER_RADIUS;
    const children = childrenOf(entity.id);
    const sides = Math.max(MIN_POLYGON_SIDES, children.length);
    const points = polygonPoints(entity.x, entity.y, radius, sides);

    ctx.save();
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.closePath();
    ctx.fillStyle = selected ? "#111827" : "#ffffff";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = (selected ? 3 : 2) / state.zoom;
    ctx.shadowColor = "rgb(15 23 42 / 8%)";
    ctx.shadowBlur = entity.kind === "system" ? 20 : 14;
    ctx.shadowOffsetY = entity.kind === "system" ? 8 : 5;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.stroke();

    ctx.fillStyle = selected ? "#ffffff" : "#111827";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = entity.kind === "system"
      ? "800 21px Inter, system-ui, sans-serif"
      : "800 16px Inter, system-ui, sans-serif";
    wrapText(entity.label, entity.x, entity.y - 8, radius * 1.32, entity.kind === "system" ? 26 : 20);

    drawSelectedDot(entity, selected, radius);
    ctx.restore();
  }

  function drawLeafEntity(entity) {
    const selected = entity.id === state.selectedId;
    const width = entity.kind === "mcp" ? 116 : LEAF_WIDTH;
    const height = entity.kind === "mcp" ? 58 : LEAF_HEIGHT;

    ctx.save();
    roundedRect(entity.x - width / 2, entity.y - height / 2, width, height, 20);
    ctx.fillStyle = selected ? "#111827" : "#ffffff";
    ctx.strokeStyle = entity.kind === "mcp" ? "#276ef1" : "#0f172a";
    ctx.lineWidth = (selected ? 3 : 2) / state.zoom;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = selected ? "#ffffff" : "#111827";
    ctx.font = "760 15px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    wrapText(entity.label, entity.x, entity.y, width * 0.78, 18);

    drawSelectedDot(entity, selected, Math.max(width, height) / 2);
    ctx.restore();
  }

  function drawSelectedDot(entity, selected, radius) {
    if (!selected) {
      return;
    }

    ctx.beginPath();
    ctx.arc(entity.x + radius * 0.62, entity.y - radius * 0.66, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#34d399";
    ctx.fill();
  }

  function drawConfigSurface(width, height) {
    if (!selectedEntity()) {
      return;
    }

    const panelWidth = panelWidthForViewport(width);
    const panelHeight = Math.min(PANEL_HEIGHT, height - 48);
    const panelX = width - panelWidth - 24;
    const panelY = Math.max(24, (height - panelHeight) / 2);

    try {
      const transform = ctx.drawElementImage(configSurface, panelX, panelY, panelWidth, panelHeight);
      configSurface.style.transform = transform.toString();
    } catch (error) {
      apiStatus.textContent = "Waiting for HTML snapshot";
    }
  }

  function resetView(animate, resetZoom) {
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    const panelReserve = selectedEntity() ? panelWidthForViewport(cssWidth) + PANEL_GAP : 0;
    const availableWidth = Math.max(360, cssWidth - panelReserve);
    const targetX = panelReserve ? Math.max(300, availableWidth * 0.5) : cssWidth * 0.5;
    const targetY = cssHeight * 0.5;
    const targetZoom = resetZoom ? 1 : state.zoom;

    if (!animate || !state.cameraX || !state.cameraY) {
      cancelViewAnimation();
      state.cameraX = targetX;
      state.cameraY = targetY;
      state.zoom = targetZoom;
      return;
    }

    startViewAnimation(targetX, targetY, targetZoom);
  }

  function startViewAnimation(targetX, targetY, targetZoom) {
    cancelViewAnimation();

    const startX = state.cameraX;
    const startY = state.cameraY;
    const startZoom = state.zoom;
    const startedAt = performance.now();

    function tick(now) {
      const progress = Math.min(1, (now - startedAt) / VIEW_TRANSITION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      state.cameraX = startX + (targetX - startX) * eased;
      state.cameraY = startY + (targetY - startY) * eased;
      state.zoom = startZoom + (targetZoom - startZoom) * eased;
      layoutGraph();
      scheduleRender();

      if (progress < 1) {
        state.viewAnimationId = requestAnimationFrame(tick);
      } else {
        state.viewAnimationId = null;
      }
    }

    state.viewAnimationId = requestAnimationFrame(tick);
  }

  function cancelViewAnimation() {
    if (state.viewAnimationId) {
      cancelAnimationFrame(state.viewAnimationId);
      state.viewAnimationId = null;
    }
  }

  function zoomAt(screenPoint, scaleFactor) {
    cancelViewAnimation();

    const before = screenToWorld(screenPoint);
    state.zoom = clamp(state.zoom * scaleFactor, ZOOM_MIN, ZOOM_MAX);
    state.cameraX = screenPoint.x - before.x * state.zoom;
    state.cameraY = screenPoint.y - before.y * state.zoom;
    scheduleRender();
  }

  function screenToWorld(point) {
    return {
      x: (point.x - state.cameraX) / state.zoom,
      y: (point.y - state.cameraY) / state.zoom,
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function boundaryPoint(entity, angle) {
    if (entity.kind !== "system" && entity.kind !== "llm") {
      return rectangularBoundaryPoint(entity, angle);
    }

    const radius = entity.kind === "system" ? ROOT_RADIUS : PROVIDER_RADIUS;
    const children = childrenOf(entity.id);
    const sides = Math.max(MIN_POLYGON_SIDES, children.length);
    const intersection = polygonBoundaryPoint(entity, radius, sides, angle);
    if (intersection) {
      return intersection;
    }

    return {
      x: entity.x + Math.cos(angle) * radius,
      y: entity.y + Math.sin(angle) * radius,
    };
  }

  function polygonBoundaryPoint(entity, radius, sides, angle) {
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const points = polygonPoints(entity.x, entity.y, radius, sides);
    let nearest = null;

    for (let index = 0; index < points.length; index += 1) {
      const start = points[index];
      const end = points[(index + 1) % points.length];
      const edge = { x: end.x - start.x, y: end.y - start.y };
      const originToStart = { x: start.x - entity.x, y: start.y - entity.y };
      const denominator = cross(direction, edge);

      if (Math.abs(denominator) < 0.0001) {
        continue;
      }

      const rayDistance = cross(originToStart, edge) / denominator;
      const segmentRatio = cross(originToStart, direction) / denominator;

      if (rayDistance >= 0 && segmentRatio >= 0 && segmentRatio <= 1) {
        const point = {
          x: entity.x + direction.x * rayDistance,
          y: entity.y + direction.y * rayDistance,
        };
        if (!nearest || rayDistance < nearest.rayDistance) {
          nearest = { ...point, rayDistance };
        }
      }
    }

    return nearest ? { x: nearest.x, y: nearest.y } : null;
  }

  function cross(a, b) {
    return a.x * b.y - a.y * b.x;
  }

  function rectangularBoundaryPoint(entity, angle) {
    const size = leafSize(entity);
    const halfWidth = size.width / 2;
    const halfHeight = size.height / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const scale = Math.min(
      Math.abs(halfWidth / (cos || Number.EPSILON)),
      Math.abs(halfHeight / (sin || Number.EPSILON)),
    );

    return {
      x: entity.x + cos * scale,
      y: entity.y + sin * scale,
    };
  }

  function isEntityHit(entity, point) {
    if (entity.kind === "system" || entity.kind === "llm") {
      const radius = entity.kind === "system" ? ROOT_RADIUS : PROVIDER_RADIUS;
      return Math.hypot(point.x - entity.x, point.y - entity.y) <= radius + HIT_PADDING;
    }

    const { width, height } = leafSize(entity);
    return (
      Math.abs(point.x - entity.x) <= width / 2 + HIT_PADDING &&
      Math.abs(point.y - entity.y) <= height / 2 + HIT_PADDING
    );
  }

  function panelWidthForViewport(width) {
    return Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, Math.floor(width * PANEL_VIEWPORT_RATIO)));
  }

  function leafSize(entity) {
    return entity.kind === "mcp"
      ? { width: 116, height: 58 }
      : { width: LEAF_WIDTH, height: LEAF_HEIGHT };
  }

  function canvasPointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function polygonPoints(cx, cy, radius, sides) {
    return Array.from({ length: sides }, (_, index) => {
      const angle = -Math.PI / 2 + (index / sides) * Math.PI * 2;
      return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      };
    });
  }

  function roundedRect(x, y, width, height, radius) {
    const right = x + width;
    const bottom = y + height;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(right - radius, y);
    ctx.quadraticCurveTo(right, y, right, y + radius);
    ctx.lineTo(right, bottom - radius);
    ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
    ctx.lineTo(x + radius, bottom);
    ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);

    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((lineText, index) => {
      ctx.fillText(lineText, x, startY + index * lineHeight);
    });
  }

  function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
})();
