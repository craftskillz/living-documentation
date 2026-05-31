import { loadWorkspaceState, saveWorkspaceState, testLlmConnection, listLlmModels, runAgentPrompt, } from "./persistence.js";
const LEAF_WIDTH = 164;
const LEAF_HEIGHT = 64;
const ROOT_RADIUS = 132;
const PROVIDER_RADIUS = 78;
const MIN_POLYGON_SIDES = 6;
const GRID_MINOR = 24;
const GRID_MAJOR = 96;
const PANEL_MIN_WIDTH = 540;
const PANEL_MAX_WIDTH = 780;
const PANEL_VIEWPORT_RATIO = 1 / 2;
const PANEL_HEIGHT = 9999;
const PANEL_GAP = 44;
const ROOT_CHILD_DISTANCE = 255;
const PROVIDER_CHILD_DISTANCE = 178;
const PROVIDER_CHILD_SPREAD_SMALL = Math.PI * 0.7;
const PROVIDER_CHILD_SPREAD_MEDIUM = Math.PI * 1.1;
const PROVIDER_CHILD_SPREAD_LARGE = Math.PI * 1.45;
const PROVIDER_CHILD_SPREAD_MAX = Math.PI * 1.75;
const HIT_PADDING = 14;
const VIEW_TRANSITION_MS = 260;
const VIEW_PADDING = 56;
const PANEL_OCCLUSION_PADDING = 32;
const PANEL_EVENT_TYPES = [
    "pointerdown",
    "mousedown",
    "click",
    "dblclick",
    "touchstart",
    "wheel",
];
const ZOOM_MIN = 0.35;
const ZOOM_MAX = 2.2;
const ZOOM_WHEEL_FACTOR = 0.0018;
const PAN_THRESHOLD = 4;
const NODE_SPACING_GAP = 46;
const ROOT_DENSE_CHILD_THRESHOLD = 4;
const ROOT_CHILD_DENSE_STEP = 44;
const ROOT_CHILD_MAX_EXTRA_DISTANCE = 360;
const ROOT_SUBTREE_BASELINE_RADIUS = 300;
const ROOT_CLUSTER_PADDING = 44;
const ROOT_CLUSTER_RELAXATION_STEP = 48;
const ROOT_CLUSTER_RELAXATION_ATTEMPTS = 7;
const ROOT_CLUSTER_MAX_DISTANCE = ROOT_CHILD_DISTANCE + ROOT_CHILD_MAX_EXTRA_DISTANCE + 260;
const SAVE_DEBOUNCE_MS = 450;
const SAVE_TOAST_MS = 2600;
const canvas = document.getElementById("workspaceCanvas");
const ctx = canvas.getContext("2d");
const apiStatus = document.getElementById("apiStatus");
const addButton = document.getElementById("addButton");
const fitButton = document.getElementById("fitButton");
const testNodeButton = document.getElementById("testNodeButton");
const loadModelsButton = document.getElementById("loadModelsButton");
const closePanelButton = document.getElementById("closePanelButton");
const deleteNodeButton = document.getElementById("deleteNodeButton");
const renameConfirmOverlay = document.getElementById("renameConfirmOverlay");
const renameConfirmMessage = document.getElementById("renameConfirmMessage");
const cancelRenameButton = document.getElementById("cancelRenameButton");
const confirmRenameButton = document.getElementById("confirmRenameButton");
const deleteConfirmOverlay = document.getElementById("deleteConfirmOverlay");
const deleteConfirmMessage = document.getElementById("deleteConfirmMessage");
const cancelDeleteButton = document.getElementById("cancelDeleteButton");
const confirmDeleteButton = document.getElementById("confirmDeleteButton");
const agentRunOverlay = document.getElementById("agentRunOverlay");
const agentRunTitle = document.getElementById("agentRunTitle");
const agentRunHint = document.getElementById("agentRunHint");
const agentRunInputField = document.getElementById("agentRunInputField");
const agentRunInput = document.getElementById("agentRunInput");
const agentRunResult = document.getElementById("agentRunResult");
const cancelAgentRunButton = document.getElementById("cancelAgentRunButton");
const executeAgentRunButton = document.getElementById("executeAgentRunButton");
const fallbackPanelHost = document.getElementById("fallbackPanelHost");
const configSurface = document.getElementById("configSurface");
const form = configSurface;
const workspaceToast = document.getElementById("workspaceToast");
const workspaceToastIcon = document.getElementById("workspaceToastIcon");
const workspaceToastMessage = document.getElementById("workspaceToastMessage");
let toastTimerId = null;
let savedAgentLabel = null;
let savedAgentFolder = null;
let agentRunTargetId = null;
const fields = {
    name: document.getElementById("nodeName"),
    kind: document.getElementById("nodeKind"),
    endpoint: document.getElementById("nodeEndpoint"),
    token: document.getElementById("nodeToken"),
    model: document.getElementById("nodeModel"),
    workspaceField: document.getElementById("agentWorkspaceField"),
    workspaceFolder: document.getElementById("nodeWorkspaceFolder"),
    timeout: document.getElementById("nodeTimeout"),
    description: document.getElementById("nodeDescription"),
    typeBadge: document.getElementById("nodeTypeBadge"),
    llmFields: document.getElementById("llmFields"),
    mcpInventory: document.getElementById("mcpInventory"),
    agentSection: document.getElementById("agentSection"),
    systemPrompt: document.getElementById("nodeSystemPrompt"),
    requiresUserInput: document.getElementById("nodeRequiresUserInput"),
    userInputDescriptionField: document.getElementById("agentUserInputDescriptionField"),
    userInputDescription: document.getElementById("nodeUserInputDescription"),
    expectedOutputMarker: document.getElementById("nodeExpectedOutputMarker"),
};
const initialEntities = [
    createEntity("root", "Living AI Documentation", "system", null),
    createEntity("mcp", "MCP", "mcp", "root"),
    //createEntity("devstral", "DevStral2 LLM API", "llm", "root"),
    //createEntity("qwen", "Qwen2 LLM API", "llm", "root"),
    //createEntity("review-agent", "Code Review Agent", "agent", "devstral"),
    //createEntity("sonar-agent", "Sonarqube Metrics Agent", "agent", "devstral"),
    //createEntity("doc-agent", "Documentation Agent", "agent", "qwen"),
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
    panelShiftX: 0,
    saveTimerId: null,
    isHydrated: false,
};
const supportsHtmlInCanvas = Boolean(canvas.requestPaint) && typeof ctx.drawElementImage === "function";
if (!supportsHtmlInCanvas) {
    fallbackPanelHost.appendChild(configSurface);
    apiStatus.textContent = "DOM fallback";
    apiStatus.classList.add("is-fallback");
}
else {
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
    layoutGraph();
    resetView(false, !state.cameraX && !state.cameraY);
    scheduleRender();
});
resizeObserver.observe(canvas, { box: "device-pixel-content-box" });
isolatePanelEvents();
isolateConfirmEvents();
addButton.addEventListener("click", () => {
    addContextualNode();
});
fitButton.addEventListener("click", () => {
    layoutGraph();
    resetView(true, true);
    scheduleWorkspaceSave();
    scheduleRender();
});
canvas.addEventListener("pointerdown", (event) => {
    if (event.target !== canvas) {
        return;
    }
    const screenPoint = canvasPointFromEvent(event);
    const worldPoint = screenToWorld(screenPoint);
    const hitEntity = [...state.entities]
        .reverse()
        .find((entity) => isEntityHit(entity, worldPoint));
    if (hitEntity) {
        if (hitEntity.id !== "root")
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
    else if (state.didPan) {
        scheduleWorkspaceSave();
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
    scheduleWorkspaceSave();
}, { passive: false });
form.addEventListener("submit", (event) => {
    event.preventDefault();
    syncSelectedFromForm();
    state.lastSaveAt = new Date();
    layoutGraph();
    void saveWorkspaceNow(true);
    scheduleRender();
});
form.addEventListener("input", (event) => {
    syncSelectedFromForm();
    layoutGraph();
    // Don't auto-save while editing the name of an agent — wait for blur + popup
    const isAgentNameEdit = event.target === fields.name && selectedEntity()?.kind === "agent";
    if (!isAgentNameEdit) {
        scheduleWorkspaceSave();
    }
    scheduleRender();
});
closePanelButton.addEventListener("click", () => {
    selectEntity(null);
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
testNodeButton.addEventListener("click", () => {
    const selected = selectedEntity();
    if (selected?.kind === "agent") {
        openAgentRunDialog();
        return;
    }
    void testSelectedLlmConnection();
});
loadModelsButton.addEventListener("click", () => {
    void loadModelsForSelect();
});
fields.name.addEventListener("blur", () => {
    const selected = selectedEntity();
    if (!selected || selected.kind !== "agent")
        return;
    const newName = fields.name.value.trim();
    if (!newName ||
        !savedAgentLabel ||
        !savedAgentFolder ||
        newName === savedAgentLabel)
        return;
    const newFolder = workspaceFolderForProvider(newName);
    if (newFolder === savedAgentFolder)
        return; // slug identique, pas de renommage nécessaire
    renameConfirmMessage.textContent = `Renommer le dossier "${savedAgentFolder}" en "${newFolder}" ?`;
    renameConfirmOverlay.hidden = false;
    cancelRenameButton.focus();
});
cancelRenameButton.addEventListener("click", () => {
    renameConfirmOverlay.hidden = true;
    const selected = selectedEntity();
    if (selected && savedAgentLabel) {
        selected.label = savedAgentLabel;
        fields.name.value = savedAgentLabel;
        layoutGraph();
        scheduleRender();
    }
});
confirmRenameButton.addEventListener("click", () => {
    renameConfirmOverlay.hidden = true;
    const selected = selectedEntity();
    if (!selected || !savedAgentFolder)
        return;
    // Remettre l'ancien chemin pour que le backend sache quoi renommer
    selected.config.workspaceFolder = savedAgentFolder;
    fields.workspaceFolder.value = savedAgentFolder;
    const newName = fields.name.value.trim();
    if (newName)
        savedAgentLabel = newName;
    savedAgentFolder = workspaceFolderForProvider(newName);
    scheduleWorkspaceSave();
});
fields.model.addEventListener("change", () => {
    testNodeButton.disabled = !fields.model.value;
    const selected = selectedEntity();
    if (selected) {
        selected.config.model = fields.model.value;
    }
});
cancelAgentRunButton.addEventListener("click", () => {
    closeAgentRunDialog();
});
executeAgentRunButton.addEventListener("click", () => {
    void executeAgentRunFromDialog();
});
agentRunOverlay.addEventListener("click", (event) => {
    if (event.target === agentRunOverlay) {
        closeAgentRunDialog();
    }
});
void initializeWorkspace();
function isolatePanelEvents() {
    for (const type of PANEL_EVENT_TYPES) {
        configSurface.addEventListener(type, stopPanelEventPropagation);
        fallbackPanelHost.addEventListener(type, stopPanelEventPropagation);
    }
}
function isolateConfirmEvents() {
    for (const type of PANEL_EVENT_TYPES) {
        deleteConfirmOverlay.addEventListener(type, stopPanelEventPropagation);
        renameConfirmOverlay.addEventListener(type, stopPanelEventPropagation);
        agentRunOverlay.addEventListener(type, stopPanelEventPropagation);
    }
}
function stopPanelEventPropagation(event) {
    event.stopPropagation();
}
async function initializeWorkspace() {
    const persisted = await loadWorkspaceState();
    if (persisted?.entities?.length) {
        state.entities = hydrateEntities(persisted.entities);
        state.cameraX = finiteNumber(persisted.camera?.x, state.cameraX);
        state.cameraY = finiteNumber(persisted.camera?.y, state.cameraY);
        state.zoom = clamp(finiteNumber(persisted.camera?.zoom, state.zoom), ZOOM_MIN, ZOOM_MAX);
        state.lastSaveAt = persisted.updatedAt
            ? new Date(persisted.updatedAt)
            : null;
    }
    state.isHydrated = true;
    layoutGraph();
    if (!persisted?.entities?.length) {
        resetView(false, true);
    }
    syncPanelFromSelection();
    scheduleRender();
}
function hydrateEntities(entities) {
    const hydrated = entities
        .map(hydrateEntity)
        .filter((entity) => Boolean(entity));
    const hasRoot = hydrated.some((entity) => entity.id === "root");
    const hasMcp = hydrated.some((entity) => entity.id === "mcp");
    const withRequiredNodes = [
        ...(hasRoot
            ? []
            : [createEntity("root", "Living AI Documentation", "system", null)]),
        ...hydrated,
        ...(hasMcp ? [] : [createEntity("mcp", "MCP", "mcp", "root")]),
    ];
    const ids = new Set(withRequiredNodes.map((entity) => entity.id));
    return withRequiredNodes.map((entity) => {
        const normalizedKind = entity.id === "root"
            ? "system"
            : entity.id === "mcp"
                ? "mcp"
                : entity.kind;
        const normalizedParentId = entity.id === "root"
            ? null
            : entity.id === "mcp"
                ? "root"
                : entity.parentId && ids.has(entity.parentId)
                    ? entity.parentId
                    : null;
        return {
            ...entity,
            kind: normalizedKind,
            parentId: normalizedParentId,
            config: {
                ...createEntity(entity.id, entity.label, normalizedKind, normalizedParentId).config,
                ...entity.config,
            },
        };
    });
}
function hydrateEntity(input) {
    if (!isRecord(input)) {
        return null;
    }
    const id = stringValue(input.id);
    const label = stringValue(input.label);
    const kind = nodeKindValue(input.kind);
    if (!id || !label || !kind) {
        return null;
    }
    const parentId = input.parentId === null ? null : stringValue(input.parentId);
    const config = isRecord(input.config) ? input.config : {};
    return {
        id,
        label,
        kind,
        parentId,
        x: finiteNumber(input.x, 0),
        y: finiteNumber(input.y, 0),
        angle: finiteNumber(input.angle, 0),
        config: {
            endpoint: stringValue(config.endpoint) || defaultEndpoint(id, kind),
            token: stringValue(config.token),
            model: stringValue(config.model),
            timeout: finiteNumber(config.timeout, 180),
            description: stringValue(config.description) || defaultDescription(kind),
            workspaceFolder: stringValue(config.workspaceFolder) ||
                (kind === "agent" ? workspaceFolderForProvider(label) : ""),
            systemPrompt: stringValue(config.systemPrompt),
            requiresUserInput: config.requiresUserInput === true,
            userInputDescription: stringValue(config.userInputDescription),
            expectedOutputMarker: stringValue(config.expectedOutputMarker),
        },
    };
}
function scheduleWorkspaceSave() {
    if (!state.isHydrated) {
        return;
    }
    if (state.saveTimerId) {
        clearTimeout(state.saveTimerId);
    }
    state.saveTimerId = window.setTimeout(() => {
        state.saveTimerId = null;
        void saveWorkspaceNow(false);
    }, SAVE_DEBOUNCE_MS);
}
async function saveWorkspaceNow(notify = false) {
    if (!state.isHydrated) {
        return;
    }
    if (state.saveTimerId) {
        clearTimeout(state.saveTimerId);
        state.saveTimerId = null;
    }
    const saved = await saveWorkspaceState(serializeWorkspace());
    if (saved) {
        state.entities = hydrateEntities(saved.entities);
        state.lastSaveAt = new Date(saved.updatedAt);
        if (selectedEntity()) {
            syncPanelFromSelection();
        }
        if (notify) {
            showSaveToast("Workspace saved");
        }
    }
    else if (notify) {
        showSaveToast("Save failed");
    }
}
function showLoadingToast(message) {
    if (toastTimerId) {
        clearTimeout(toastTimerId);
        toastTimerId = null;
    }
    workspaceToast.dataset.state = "loading";
    workspaceToastIcon.textContent = "↻";
    workspaceToastMessage.textContent = message;
    workspaceToast.hidden = false;
}
function showSaveToast(message, state = "success") {
    if (toastTimerId) {
        clearTimeout(toastTimerId);
    }
    workspaceToast.dataset.state = state;
    workspaceToastIcon.textContent = state === "error" ? "✕" : "✓";
    workspaceToastMessage.textContent = message;
    workspaceToast.hidden = false;
    toastTimerId = window.setTimeout(() => {
        workspaceToast.hidden = true;
        toastTimerId = null;
    }, SAVE_TOAST_MS);
}
function serializeWorkspace() {
    return {
        version: 1,
        updatedAt: new Date().toISOString(),
        entities: state.entities.map((entity) => ({
            id: entity.id,
            label: entity.label,
            kind: entity.kind,
            parentId: entity.parentId,
            x: entity.x,
            y: entity.y,
            angle: entity.angle,
            config: { ...entity.config },
        })),
        camera: {
            x: state.cameraX,
            y: state.cameraY,
            zoom: state.zoom,
        },
    };
}
function isRecord(input) {
    return typeof input === "object" && input !== null && !Array.isArray(input);
}
function stringValue(input) {
    return typeof input === "string" ? input : "";
}
function nodeKindValue(input) {
    return input === "system" ||
        input === "llm" ||
        input === "agent" ||
        input === "mcp"
        ? input
        : null;
}
function finiteNumber(input, fallback) {
    return typeof input === "number" && Number.isFinite(input) ? input : fallback;
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
            endpoint: defaultEndpoint(id, kind),
            token: "",
            model: "",
            timeout: 180,
            description: defaultDescription(kind),
            workspaceFolder: kind === "agent" ? workspaceFolderForProvider(label) : "",
            systemPrompt: "",
            requiresUserInput: false,
            userInputDescription: "",
            expectedOutputMarker: "",
        },
    };
}
function cloneEntities(entities) {
    return entities.map((entity) => ({
        ...entity,
        config: { ...entity.config },
    }));
}
function defaultEndpoint(id, kind) {
    if (kind === "llm") {
        return "http://localhost:11434";
    }
    if (kind === "mcp") {
        return "http://localhost:4321/mcp";
    }
    return "";
}
function workspaceFolderForProvider(label) {
    return `AI/WORKSPACE/${slugify(label)}`;
}
function slugify(value) {
    const slug = value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    return slug || "llm_provider";
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
    const hadSelection = Boolean(state.selectedId);
    const index = childrenOf("root").filter((entity) => entity.kind === "llm").length + 1;
    const id = `provider-${Date.now().toString(36)}`;
    const provider = createEntity(id, `LLM Provider ${index}`, "llm", "root");
    state.entities = [...state.entities, provider];
    state.selectedId = provider.id;
    layoutGraph();
    syncCameraForPanelChange(hadSelection, true, true);
    syncPanelFromSelection();
    scheduleWorkspaceSave();
    scheduleRender();
}
function addAgent(parentId) {
    const hadSelection = Boolean(state.selectedId);
    const index = childrenOf(parentId).filter((entity) => entity.kind === "agent").length + 1;
    const id = `agent-${Date.now().toString(36)}`;
    const agent = createEntity(id, `Agent ${index}`, "agent", parentId);
    state.entities = [...state.entities, agent];
    state.selectedId = agent.id;
    layoutGraph();
    syncCameraForPanelChange(hadSelection, true, true);
    syncPanelFromSelection();
    scheduleWorkspaceSave();
    scheduleRender();
}
function layoutGraph() {
    const root = entityById("root");
    root.x = 0;
    root.y = 0;
    root.angle = 0;
    layoutRootChildren(root);
}
function layoutRootChildren(root) {
    const children = childrenOf(root.id);
    const baseDistance = distanceForChildren(children, ROOT_RADIUS, ROOT_CHILD_DISTANCE, {
        spread: Math.PI * 2,
        includeSubtree: false,
    });
    const distances = new Map(children.map((child) => [
        child.id,
        distanceForRootChild(child, baseDistance),
    ]));
    for (let attempt = 0; attempt <= ROOT_CLUSTER_RELAXATION_ATTEMPTS; attempt += 1) {
        positionRootChildren(root, children, distances);
        layoutAllProviderChildren();
        if (!relaxRootClusterDistances(children, distances)) {
            return;
        }
    }
    positionRootChildren(root, children, distances);
    layoutAllProviderChildren();
}
function positionRootChildren(root, children, distances) {
    const layoutSlots = Math.max(1, children.length);
    children.forEach((child, index) => {
        const angle = -Math.PI / 2 + (index / layoutSlots) * Math.PI * 2;
        const distance = distances.get(child.id) || ROOT_CHILD_DISTANCE;
        child.angle = angle;
        child.x = root.x + Math.cos(angle) * distance;
        child.y = root.y + Math.sin(angle) * distance;
    });
}
function layoutAllProviderChildren() {
    for (const provider of state.entities.filter((entity) => entity.kind === "llm")) {
        layoutProviderChildren(provider);
    }
}
function relaxRootClusterDistances(children, distances) {
    let changed = false;
    for (let firstIndex = 0; firstIndex < children.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < children.length; secondIndex += 1) {
            const first = children[firstIndex];
            const second = children[secondIndex];
            if (!paddedBoundsOverlap(clusterBounds(first), clusterBounds(second), ROOT_CLUSTER_PADDING)) {
                continue;
            }
            distances.set(first.id, Math.min(ROOT_CLUSTER_MAX_DISTANCE, distances.get(first.id) + ROOT_CLUSTER_RELAXATION_STEP));
            distances.set(second.id, Math.min(ROOT_CLUSTER_MAX_DISTANCE, distances.get(second.id) + ROOT_CLUSTER_RELAXATION_STEP));
            changed = true;
        }
    }
    return changed;
}
function distanceForRootChild(child, baseDistance) {
    if (child.kind !== "llm") {
        return baseDistance;
    }
    const childCount = childrenOf(child.id).length;
    if (childCount <= ROOT_DENSE_CHILD_THRESHOLD) {
        return baseDistance;
    }
    const countPressure = (childCount - ROOT_DENSE_CHILD_THRESHOLD) * ROOT_CHILD_DENSE_STEP;
    const radiusPressure = Math.max(0, subtreeRadius(child) - ROOT_SUBTREE_BASELINE_RADIUS) * 0.65;
    const extraDistance = Math.min(ROOT_CHILD_MAX_EXTRA_DISTANCE, Math.max(countPressure, radiusPressure));
    return baseDistance + extraDistance;
}
function layoutProviderChildren(provider) {
    const children = childrenOf(provider.id);
    if (!children.length) {
        return;
    }
    const outwardAngle = Math.atan2(provider.y, provider.x);
    const spread = spreadForProviderChildren(children.length);
    const distance = distanceForChildren(children, PROVIDER_RADIUS, PROVIDER_CHILD_DISTANCE, {
        spread,
        includeSubtree: false,
    });
    children.forEach((child, index) => {
        const angle = angleInSpread(outwardAngle, spread, index, children.length);
        child.angle = angle;
        child.x = provider.x + Math.cos(angle) * distance;
        child.y = provider.y + Math.sin(angle) * distance;
    });
}
function distanceForChildren(children, parentRadius, minimumDistance, options = {}) {
    if (!children.length) {
        return minimumDistance;
    }
    const includeSubtree = Boolean(options.includeSubtree);
    const spread = options.spread || Math.PI * 2;
    const largestChildRadius = Math.max(...children.map((child) => includeSubtree ? subtreeRadius(child) : collisionRadius(child)));
    const parentClearance = parentRadius + largestChildRadius + NODE_SPACING_GAP;
    if (children.length === 1) {
        return Math.max(minimumDistance, parentClearance);
    }
    const largestChildDiameter = largestChildRadius * 2 + NODE_SPACING_GAP;
    const fullCircle = spread >= Math.PI * 2 - 0.001;
    const angleStep = fullCircle
        ? (Math.PI * 2) / children.length
        : spread / (children.length - 1);
    const chordDistance = largestChildDiameter / (2 * Math.sin(angleStep / 2));
    return Math.max(minimumDistance, parentClearance, chordDistance);
}
function spreadForProviderChildren(count) {
    if (count <= 1) {
        return 0;
    }
    if (count <= 2) {
        return PROVIDER_CHILD_SPREAD_SMALL;
    }
    if (count <= 4) {
        return PROVIDER_CHILD_SPREAD_MEDIUM;
    }
    if (count <= 7) {
        return PROVIDER_CHILD_SPREAD_LARGE;
    }
    return PROVIDER_CHILD_SPREAD_MAX;
}
function angleInSpread(centerAngle, spread, index, count) {
    if (count <= 1 || spread === 0) {
        return centerAngle;
    }
    return centerAngle - spread / 2 + (index / (count - 1)) * spread;
}
function subtreeRadius(entity) {
    if (entity.kind !== "llm") {
        return collisionRadius(entity);
    }
    const children = childrenOf(entity.id);
    if (!children.length) {
        return PROVIDER_RADIUS;
    }
    const childDistance = distanceForChildren(children, PROVIDER_RADIUS, PROVIDER_CHILD_DISTANCE, {
        spread: spreadForProviderChildren(children.length),
        includeSubtree: false,
    });
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
    const hadSelection = Boolean(state.selectedId);
    state.selectedId = id;
    const entity = id ? entityById(id) : null;
    savedAgentLabel = entity?.kind === "agent" ? entity.label : null;
    savedAgentFolder =
        entity?.kind === "agent"
            ? entity.config.workspaceFolder ||
                workspaceFolderForProvider(entity.label)
            : null;
    layoutGraph();
    syncCameraForPanelChange(hadSelection, Boolean(id), true);
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
    const hadSelection = Boolean(state.selectedId);
    const idsToRemove = new Set([selectedId, ...descendantIds(selectedId)]);
    state.entities = state.entities.filter((entity) => !idsToRemove.has(entity.id));
    state.selectedId = entityById(parentId) ? parentId : null;
    layoutGraph();
    syncCameraForPanelChange(hadSelection, Boolean(state.selectedId), true);
    syncPanelFromSelection();
    scheduleWorkspaceSave();
    scheduleRender();
}
function syncPanelFromSelection() {
    const selected = selectedEntity();
    const hasSelection = Boolean(selected);
    configSurface.hidden = !hasSelection;
    fallbackPanelHost.hidden = !hasSelection || supportsHtmlInCanvas;
    if (!selected) {
        addButton.title = "Add LLM provider";
        testNodeButton.textContent = "Test";
        testNodeButton.hidden = true;
        testNodeButton.disabled = true;
        return;
    }
    fields.name.value = selected.label;
    fields.kind.value = selected.kind;
    fields.endpoint.value = selected.config.endpoint;
    fields.token.value = selected.config.token;
    restoreModelSelect(selected.config.model);
    fields.workspaceFolder.value = selected.config.workspaceFolder;
    fields.workspaceField.hidden = selected.kind !== "agent";
    fields.timeout.value = String(selected.config.timeout);
    fields.description.value = selected.config.description;
    fields.typeBadge.textContent = labelForBadge(selected.kind);
    fields.kind.disabled = true;
    fields.llmFields.hidden =
        selected.kind === "mcp" || selected.kind === "agent";
    fields.mcpInventory.hidden = selected.kind !== "mcp";
    fields.agentSection.hidden = selected.kind !== "agent";
    fields.systemPrompt.value = selected.config.systemPrompt;
    fields.requiresUserInput.checked = selected.config.requiresUserInput;
    syncUserInputDescriptionVisibility();
    fields.userInputDescription.value = selected.config.userInputDescription;
    fields.expectedOutputMarker.value = selected.config.expectedOutputMarker;
    deleteNodeButton.hidden = isProtectedEntity(selected.id);
    testNodeButton.textContent = "Test";
    testNodeButton.hidden = selected.kind !== "llm" && selected.kind !== "agent";
    testNodeButton.disabled =
        selected.kind === "llm"
            ? !selected.config.model
            : selected.kind !== "agent";
    addButton.title =
        selected.kind === "llm" || entityById(selected.parentId)?.kind === "llm"
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
    selected.config.endpoint = fields.endpoint.value;
    selected.config.token = fields.token.value;
    selected.config.model = fields.model.value;
    selected.config.timeout = Number(fields.timeout.value || 30);
    selected.config.description = fields.description.value;
    selected.config.systemPrompt = fields.systemPrompt.value;
    selected.config.requiresUserInput = fields.requiresUserInput.checked;
    selected.config.userInputDescription = fields.userInputDescription.value;
    selected.config.expectedOutputMarker = fields.expectedOutputMarker.value;
    syncUserInputDescriptionVisibility();
    fields.typeBadge.textContent = labelForBadge(selected.kind);
    // Propagate model + timeout to child agents
    if (selected.kind === "llm") {
        for (const entity of state.entities) {
            if (entity.parentId === selected.id && entity.kind === "agent") {
                entity.config.model = selected.config.model;
                entity.config.timeout = selected.config.timeout;
            }
        }
    }
}
function syncUserInputDescriptionVisibility() {
    const shouldShow = selectedEntity()?.kind === "agent" && fields.requiresUserInput.checked;
    fields.userInputDescriptionField.hidden = !shouldShow;
    fields.userInputDescription.required = shouldShow;
}
function restoreModelSelect(savedModel) {
    const existing = Array.from(fields.model.options).map((o) => o.value);
    if (savedModel && !existing.includes(savedModel)) {
        fields.model.innerHTML = "";
        const opt = document.createElement("option");
        opt.value = savedModel;
        opt.textContent = savedModel;
        fields.model.appendChild(opt);
    }
    fields.model.value = savedModel || (existing[0] ?? "");
}
function openAgentRunDialog() {
    const selected = selectedEntity();
    if (!selected || selected.kind !== "agent")
        return;
    syncSelectedFromForm();
    const llm = entityById(selected.parentId ?? "");
    if (!llm || llm.kind !== "llm") {
        showSaveToast("No parent LLM found for this agent.", "error");
        return;
    }
    if (!llm.config.model) {
        showSaveToast("Parent LLM has no model selected.", "error");
        return;
    }
    if (!selected.config.systemPrompt.trim()) {
        showSaveToast("Write a system prompt first.", "error");
        return;
    }
    if (selected.config.requiresUserInput &&
        !selected.config.userInputDescription.trim()) {
        showSaveToast("Describe the required user input first.", "error");
        return;
    }
    agentRunTargetId = selected.id;
    agentRunTitle.textContent = `Test ${selected.label}`;
    agentRunHint.textContent = selected.config.requiresUserInput
        ? selected.config.userInputDescription
        : "Run this agent with its configured system prompt.";
    agentRunInputField.hidden = !selected.config.requiresUserInput;
    agentRunInput.required = selected.config.requiresUserInput;
    agentRunInput.value = "";
    agentRunResult.hidden = true;
    agentRunResult.textContent = "";
    executeAgentRunButton.disabled = false;
    executeAgentRunButton.textContent = "Run";
    agentRunOverlay.hidden = false;
    if (selected.config.requiresUserInput) {
        window.setTimeout(() => agentRunInput.focus(), 0);
    }
    else {
        window.setTimeout(() => executeAgentRunButton.focus(), 0);
    }
}
function closeAgentRunDialog() {
    agentRunOverlay.hidden = true;
    agentRunTargetId = null;
}
async function executeAgentRunFromDialog() {
    if (agentRunInput.required && !agentRunInput.value.trim()) {
        agentRunInput.reportValidity();
        return;
    }
    const selected = agentRunTargetId ? entityById(agentRunTargetId) : null;
    if (!selected || selected.kind !== "agent") {
        showAgentRunResult("error", "The selected agent is no longer available.");
        return;
    }
    const llm = entityById(selected.parentId ?? "");
    if (!llm || llm.kind !== "llm") {
        showAgentRunResult("error", "No parent LLM found for this agent.");
        return;
    }
    executeAgentRunButton.disabled = true;
    executeAgentRunButton.textContent = "Running…";
    showAgentRunResult("loading", "Running agent…");
    const mcpEntity = state.entities.find((e) => e.kind === "mcp");
    const result = await runAgentPrompt({
        endpoint: llm.config.endpoint,
        token: llm.config.token,
        model: llm.config.model,
        systemPrompt: selected.config.systemPrompt,
        userInput: agentRunInput.value.trim() || undefined,
        timeout: llm.config.timeout,
        mcpEndpoint: mcpEntity?.config.endpoint || undefined,
        expectedOutputMarker: selected.config.expectedOutputMarker || undefined,
    });
    executeAgentRunButton.disabled = false;
    executeAgentRunButton.textContent = "Run";
    if (result.ok && result.content) {
        showAgentRunResult("success", result.content);
        showSaveToast("Agent responded.", "success");
    }
    else {
        showAgentRunResult("error", result.error ?? "Agent failed.");
        showSaveToast(result.error ?? "Agent failed.", "error");
    }
}
function showAgentRunResult(state, message) {
    agentRunResult.hidden = false;
    agentRunResult.dataset.state = state;
    agentRunResult.textContent = message;
}
async function loadModelsForSelect() {
    const selected = selectedEntity();
    if (!selected || selected.kind !== "llm")
        return;
    syncSelectedFromForm();
    const endpoint = selected.config.endpoint;
    if (!endpoint) {
        showSaveToast("Set an endpoint first.");
        return;
    }
    loadModelsButton.classList.add("loading");
    loadModelsButton.disabled = true;
    fields.model.disabled = true;
    const result = await listLlmModels({
        endpoint,
        token: selected.config.token,
    });
    loadModelsButton.classList.remove("loading");
    loadModelsButton.disabled = false;
    fields.model.disabled = false;
    if (!result.ok || !result.models?.length) {
        showSaveToast(result.error ?? "No models found.");
        return;
    }
    const previousValue = fields.model.value;
    fields.model.innerHTML = "";
    for (const id of result.models) {
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = id;
        fields.model.appendChild(opt);
    }
    fields.model.value = result.models.includes(previousValue)
        ? previousValue
        : result.models[0];
    selected.config.model = fields.model.value;
    testNodeButton.disabled = !fields.model.value;
    showSaveToast(`${result.models.length} model${result.models.length === 1 ? "" : "s"} loaded.`);
    scheduleRender();
}
async function testSelectedLlmConnection() {
    const selected = selectedEntity();
    if (!selected || selected.kind !== "llm") {
        return;
    }
    syncSelectedFromForm();
    testNodeButton.disabled = true;
    showLoadingToast(`Testing ${selected.config.model}…`);
    scheduleRender();
    const result = await testLlmConnection({
        endpoint: selected.config.endpoint,
        token: selected.config.token,
        model: selected.config.model,
        timeout: selected.config.timeout,
    });
    testNodeButton.disabled = false;
    if (result.ok) {
        showSaveToast(result.detail ?? "Connection OK", "success");
    }
    else {
        showSaveToast(result.error || `Connection failed (${result.status || "no status"})`, "error");
    }
    scheduleRender();
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
    }
    else {
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
        }
        else {
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
    ctx.font =
        entity.kind === "system"
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
    const panelHeight = Math.min(PANEL_HEIGHT, height - 118);
    const panelX = width - panelWidth - 24;
    const panelY = Math.max(24, (height - panelHeight) / 2);
    try {
        const transform = ctx.drawElementImage(configSurface, panelX, panelY, panelWidth, panelHeight);
        configSurface.style.transform = transform.toString();
    }
    catch (error) {
        apiStatus.textContent = "Waiting for HTML snapshot";
    }
}
function resetView(animate, resetZoom) {
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    const panelReserve = selectedEntity()
        ? panelWidthForViewport(cssWidth) + PANEL_GAP
        : 0;
    const availableWidth = Math.max(360, cssWidth - panelReserve);
    const bounds = graphBounds();
    const fitZoom = zoomToFitBounds(bounds, availableWidth, cssHeight);
    const targetZoom = resetZoom ? fitZoom : Math.min(state.zoom, fitZoom);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const targetX = availableWidth * 0.5 - centerX * targetZoom;
    const targetY = cssHeight * 0.5 - centerY * targetZoom;
    if (!animate || !state.cameraX || !state.cameraY) {
        cancelViewAnimation();
        state.cameraX = targetX;
        state.cameraY = targetY;
        state.zoom = targetZoom;
        state.panelShiftX = panelReserve;
        return;
    }
    state.panelShiftX = panelReserve;
    startViewAnimation(targetX, targetY, targetZoom);
}
function syncCameraForPanelChange(hadSelection, hasSelection, animate) {
    if (hasSelection) {
        if (!hadSelection) {
            // Panel was closed → center selected node in the left area
            const selected = selectedEntity();
            if (selected) {
                const panelReserve = panelWidthForViewport(canvas.clientWidth) + PANEL_GAP;
                const availableWidth = canvas.clientWidth - panelReserve;
                const targetX = availableWidth / 2 - selected.x * state.zoom;
                const appliedDelta = targetX - state.cameraX;
                // Store negative delta so deselect reverses the shift
                state.panelShiftX = -appliedDelta;
                startViewAnimation(targetX, state.cameraY, state.zoom);
            }
        }
        else {
            // Panel already open → avoid occlusion only if needed
            const deltaX = selectedPanelAvoidanceDelta();
            state.panelShiftX += Math.max(0, -deltaX);
            translateCamera(deltaX, animate);
        }
        return;
    }
    if (!hadSelection) {
        return;
    }
    const deltaX = state.panelShiftX;
    state.panelShiftX = 0;
    translateCamera(deltaX, animate);
}
function selectedPanelAvoidanceDelta() {
    const selected = selectedEntity();
    if (!selected) {
        return 0;
    }
    const panelLeft = canvas.clientWidth - panelWidthForViewport(canvas.clientWidth) - 24;
    const safeRight = panelLeft - PANEL_OCCLUSION_PADDING;
    const selectedBounds = screenBoundsForEntity(selected);
    if (selectedBounds.right <= safeRight) {
        return 0;
    }
    return safeRight - selectedBounds.right;
}
function screenBoundsForEntity(entity) {
    const bounds = entityBounds(entity);
    return {
        left: bounds.left * state.zoom + state.cameraX,
        top: bounds.top * state.zoom + state.cameraY,
        right: bounds.right * state.zoom + state.cameraX,
        bottom: bounds.bottom * state.zoom + state.cameraY,
    };
}
function translateCamera(deltaX, animate) {
    cancelViewAnimation();
    if (!deltaX) {
        return;
    }
    const targetX = state.cameraX + deltaX;
    if (!animate) {
        state.cameraX = targetX;
        return;
    }
    startViewAnimation(targetX, state.cameraY, state.zoom);
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
        }
        else {
            state.viewAnimationId = null;
        }
    }
    state.viewAnimationId = requestAnimationFrame(tick);
}
function graphBounds() {
    return state.entities.reduce((bounds, entity) => {
        const radius = collisionRadius(entity);
        return {
            minX: Math.min(bounds.minX, entity.x - radius),
            minY: Math.min(bounds.minY, entity.y - radius),
            maxX: Math.max(bounds.maxX, entity.x + radius),
            maxY: Math.max(bounds.maxY, entity.y + radius),
        };
    }, {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
    });
}
function zoomToFitBounds(bounds, availableWidth, availableHeight) {
    const graphWidth = bounds.maxX - bounds.minX;
    const graphHeight = bounds.maxY - bounds.minY;
    if (!Number.isFinite(graphWidth) ||
        !Number.isFinite(graphHeight) ||
        graphWidth <= 0 ||
        graphHeight <= 0) {
        return 1;
    }
    const fitWidth = Math.max(1, availableWidth - VIEW_PADDING * 2);
    const fitHeight = Math.max(1, availableHeight - VIEW_PADDING * 2);
    return clamp(Math.min(1, fitWidth / graphWidth, fitHeight / graphHeight), ZOOM_MIN, 1);
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
    const scale = Math.min(Math.abs(halfWidth / (cos || Number.EPSILON)), Math.abs(halfHeight / (sin || Number.EPSILON)));
    return {
        x: entity.x + cos * scale,
        y: entity.y + sin * scale,
    };
}
function isEntityHit(entity, point) {
    if (entity.kind === "system" || entity.kind === "llm") {
        const radius = entity.kind === "system" ? ROOT_RADIUS : PROVIDER_RADIUS;
        return (Math.hypot(point.x - entity.x, point.y - entity.y) <= radius + HIT_PADDING);
    }
    const { width, height } = leafSize(entity);
    return (Math.abs(point.x - entity.x) <= width / 2 + HIT_PADDING &&
        Math.abs(point.y - entity.y) <= height / 2 + HIT_PADDING);
}
function panelWidthForViewport(width) {
    return Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, Math.floor(width * PANEL_VIEWPORT_RATIO)));
}
function leafSize(entity) {
    return entity.kind === "mcp"
        ? { width: 116, height: 58 }
        : { width: LEAF_WIDTH, height: LEAF_HEIGHT };
}
function clusterBounds(rootEntity) {
    return [rootEntity, ...descendantIds(rootEntity.id).map(entityById)]
        .filter(Boolean)
        .map(entityBounds)
        .reduce(mergeBounds);
}
function entityBounds(entity) {
    if (entity.kind === "system" || entity.kind === "llm") {
        const radius = entity.kind === "system" ? ROOT_RADIUS : PROVIDER_RADIUS;
        return {
            left: entity.x - radius,
            top: entity.y - radius,
            right: entity.x + radius,
            bottom: entity.y + radius,
        };
    }
    const { width, height } = leafSize(entity);
    return {
        left: entity.x - width / 2,
        top: entity.y - height / 2,
        right: entity.x + width / 2,
        bottom: entity.y + height / 2,
    };
}
function mergeBounds(first, second) {
    return {
        left: Math.min(first.left, second.left),
        top: Math.min(first.top, second.top),
        right: Math.max(first.right, second.right),
        bottom: Math.max(first.bottom, second.bottom),
    };
}
function paddedBoundsOverlap(first, second, padding) {
    return !(first.right + padding < second.left ||
        first.left - padding > second.right ||
        first.bottom + padding < second.top ||
        first.top - padding > second.bottom);
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
        }
        else {
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
//# sourceMappingURL=app.js.map