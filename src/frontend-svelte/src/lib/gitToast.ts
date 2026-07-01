import { dismissPersistentToast, showPersistentToast } from "./persistentToast";

interface GitSaveResult {
  timestamp: string;
  error?: string;
  warning?: string;
}

interface GitStatus {
  mode: "unconfigured" | "disabled" | "enabled";
  ok: boolean;
  docsFolder?: string;
  message: string;
  dirtyOutsideDocsCount: number;
  lastSave: GitSaveResult | null;
}

const GIT_CONFIG_TOAST_ID = "git-integration-config";
const GIT_STATUS_TOAST_ID = "git-integration-status";
const GIT_SAVE_TOAST_ID = "git-integration-save";
const ADMIN_GIT_HREF = "/admin#git-integration";
const RECENT_SAVE_MS = 2 * 60 * 1000;

let checking = false;
let hookInstalled = false;

function isRecent(timestamp: string): boolean {
  const time = Date.parse(timestamp);
  return Number.isFinite(time) && Date.now() - time < RECENT_SAVE_MS;
}

function gitSaveIssueLabel(issue: string): string {
  const normalized = issue.toLowerCase();
  if (normalized.includes("cannot lock ref 'head'") && normalized.includes("but expected")) {
    return "un autre commit a modifié HEAD pendant l'autocommit. Réessayez l'enregistrement.";
  }
  return issue;
}

export async function checkGitIntegrationToast(): Promise<void> {
  if (checking) return;
  checking = true;
  try {
    const res = await fetch("/api/git/status", { cache: "no-store" });
    if (!res.ok) return;
    const status = (await res.json()) as GitStatus;

    if (status.mode === "unconfigured") {
      showPersistentToast(
        "Veuillez configurer l'intégration Git dans la page Admin.",
        "error",
        10 * 60 * 1000,
        { id: GIT_CONFIG_TOAST_ID, href: ADMIN_GIT_HREF, linkLabel: "Admin" },
      );
      dismissPersistentToast(GIT_STATUS_TOAST_ID);
      dismissPersistentToast(GIT_SAVE_TOAST_ID);
      return;
    }

    dismissPersistentToast(GIT_CONFIG_TOAST_ID);

    if (status.mode === "disabled") {
      dismissPersistentToast(GIT_STATUS_TOAST_ID);
      dismissPersistentToast(GIT_SAVE_TOAST_ID);
      return;
    }

    if (!status.ok) {
      showPersistentToast(
        `Intégration Git : ${status.message}`,
        "error",
        10 * 60 * 1000,
        { id: GIT_STATUS_TOAST_ID, href: ADMIN_GIT_HREF, linkLabel: "Admin" },
      );
      return;
    }

    if (status.dirtyOutsideDocsCount > 0) {
      const docsLabel = status.docsFolder?.trim() || "docsFolder";
      showPersistentToast(
        `Git : ${status.dirtyOutsideDocsCount} changement(s) hors ${docsLabel} seront ignorés par Living Documentation.`,
        "error",
        10 * 60 * 1000,
        GIT_STATUS_TOAST_ID,
      );
    } else {
      dismissPersistentToast(GIT_STATUS_TOAST_ID);
    }

    const last = status.lastSave;
    if (last && isRecent(last.timestamp) && (last.error || last.warning)) {
      const issue = gitSaveIssueLabel(last.error || last.warning || "");
      showPersistentToast(
        `Git : ${issue}`,
        "error",
        10 * 60 * 1000,
        { id: GIT_SAVE_TOAST_ID, href: ADMIN_GIT_HREF, linkLabel: "Admin" },
      );
    } else {
      dismissPersistentToast(GIT_SAVE_TOAST_ID);
    }
  } catch {
    // The app can still run if the status endpoint is unavailable during boot.
  } finally {
    checking = false;
  }
}

export function installGitToastFetchHook(): void {
  if (hookInstalled) return;
  hookInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();

    if (
      method !== "GET" &&
      !url.includes("/api/git/") &&
      (url.startsWith("/api/") || url.startsWith("/mcp") || url.startsWith(window.location.origin))
    ) {
      window.setTimeout(() => void checkGitIntegrationToast(), 80);
    }

    return response;
  };
}
