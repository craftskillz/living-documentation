type ToastState = "success" | "error" | "loading";

interface PersistedToast {
  id: string;
  message: string;
  state: ToastState;
  expiresAt: number | null;
  href?: string;
  linkLabel?: string;
}

interface PersistentToastOptions {
  id?: string;
  href?: string;
  linkLabel?: string;
}

const TOAST_STORAGE_KEY = "living-documentation:persistent-toast";
const DEFAULT_TOAST_MS = 2600;
const LOADING_TOAST_MAX_MS = 15 * 60 * 1000;

const toastTimers = new Map<string, number>();

function createToastId(): string {
  return `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureToastStack(): HTMLElement {
  const existing = document.getElementById("workspaceToastStack") as HTMLElement | null;
  if (existing) return existing;

  document.getElementById("workspaceToast")?.remove();
  document.getElementById("workspaceToastIcon")?.remove();
  document.getElementById("workspaceToastMessage")?.remove();

  const stack = document.createElement("div");
  stack.id = "workspaceToastStack";
  stack.className = "workspace-toast-stack";
  stack.setAttribute("role", "status");
  stack.setAttribute("aria-live", "polite");
  document.body.append(stack);
  return stack;
}

function isToast(input: unknown): input is PersistedToast {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return false;
  }
  const value = input as Record<string, unknown>;
  return (
    typeof value.id === "string" &&
    typeof value.message === "string" &&
    ["success", "error", "loading"].includes(String(value.state)) &&
    (value.expiresAt === null || typeof value.expiresAt === "number") &&
    (value.href === undefined || typeof value.href === "string") &&
    (value.linkLabel === undefined || typeof value.linkLabel === "string")
  );
}

function readToasts(): PersistedToast[] {
  const raw = localStorage.getItem(TOAST_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter(isToast);
    }

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      const legacy = parsed as Record<string, unknown>;
      if (
        typeof legacy.message === "string" &&
        ["success", "error", "loading"].includes(String(legacy.state)) &&
        (legacy.expiresAt === null || typeof legacy.expiresAt === "number")
      ) {
        return [
          {
            id: createToastId(),
            message: legacy.message,
            state: legacy.state as ToastState,
            expiresAt: legacy.expiresAt as number | null,
          },
        ];
      }
    }
  } catch {
    return [];
  }

  return [];
}

function writeToasts(toasts: PersistedToast[]) {
  if (toasts.length) {
    localStorage.setItem(TOAST_STORAGE_KEY, JSON.stringify(toasts));
  } else {
    localStorage.removeItem(TOAST_STORAGE_KEY);
  }
}

function clearToastTimer(id: string) {
  const timerId = toastTimers.get(id);
  if (timerId) {
    clearTimeout(timerId);
    toastTimers.delete(id);
  }
}

function removePersistentToast(id: string) {
  clearToastTimer(id);
  const next = readToasts().filter((toast) => toast.id !== id);
  writeToasts(next);
  renderToasts(next);
  scheduleExpiries(next);
}

function iconForState(state: ToastState): string {
  if (state === "loading") return "⟳";
  return state === "error" ? "!" : "✓";
}

function pruneExpired(toasts: PersistedToast[]): PersistedToast[] {
  const now = Date.now();
  return toasts.filter((toast) => !toast.expiresAt || toast.expiresAt > now);
}

function renderToasts(input: PersistedToast[]) {
  const stack = ensureToastStack();
  const toasts = pruneExpired(input);

  stack.replaceChildren();
  stack.hidden = toasts.length === 0;

  for (const toast of toasts) {
    const root = document.createElement("div");
    root.className = "workspace-toast";
    root.dataset.state = toast.state;

    const icon = document.createElement("span");
    icon.className = "toast-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = iconForState(toast.state);

    const body = document.createElement("div");
    body.className = "workspace-toast-body";

    const message = document.createElement("p");
    message.className = "workspace-toast-message";
    message.textContent = toast.message;
    body.append(message);

    if (toast.href) {
      const link = document.createElement("a");
      link.className = "workspace-toast-link";
      link.href = toast.href;
      link.textContent = toast.linkLabel || "Open";
      body.append(link);
    }

    const close = document.createElement("button");
    close.className = "workspace-toast-close";
    close.type = "button";
    close.setAttribute("aria-label", "Close notification");
    close.textContent = "×";
    close.addEventListener("click", () => removePersistentToast(toast.id));

    root.append(icon, body, close);
    stack.append(root);
  }

  if (toasts.length !== input.length) {
    writeToasts(toasts);
  }
}

function scheduleExpiries(toasts: PersistedToast[]) {
  for (const id of toastTimers.keys()) {
    if (!toasts.some((toast) => toast.id === id)) {
      clearToastTimer(id);
    }
  }

  for (const toast of toasts) {
    clearToastTimer(toast.id);
    if (!toast.expiresAt) continue;

    const delay = toast.expiresAt - Date.now();
    if (delay <= 0) {
      removePersistentToast(toast.id);
      continue;
    }

    toastTimers.set(
      toast.id,
      window.setTimeout(() => removePersistentToast(toast.id), delay),
    );
  }
}

function upsertToast(toast: PersistedToast): string {
  const active = pruneExpired(readToasts());
  const index = active.findIndex((item) => item.id === toast.id);
  const next =
    index >= 0
      ? active.map((item) => (item.id === toast.id ? toast : item))
      : [...active, toast];

  writeToasts(next);
  renderToasts(next);
  scheduleExpiries(next);
  return toast.id;
}

export function initPersistentToast() {
  const toasts = pruneExpired(readToasts());
  writeToasts(toasts);
  renderToasts(toasts);
  scheduleExpiries(toasts);
}

export function showPersistentLoadingToast(
  message: string,
  idOrOptions: string | PersistentToastOptions = createToastId(),
): string {
  const options =
    typeof idOrOptions === "string" ? { id: idOrOptions } : idOrOptions;
  return upsertToast({
    id: options.id ?? createToastId(),
    message,
    state: "loading",
    expiresAt: Date.now() + LOADING_TOAST_MAX_MS,
    href: options.href,
    linkLabel: options.linkLabel,
  });
}

export function showPersistentToast(
  message: string,
  state: Exclude<ToastState, "loading"> = "success",
  durationMs = DEFAULT_TOAST_MS,
  idOrOptions: string | PersistentToastOptions = createToastId(),
): string {
  const options =
    typeof idOrOptions === "string" ? { id: idOrOptions } : idOrOptions;
  return upsertToast({
    id: options.id ?? createToastId(),
    message,
    state,
    expiresAt: Date.now() + durationMs,
    href: options.href,
    linkLabel: options.linkLabel,
  });
}
