// Click on a non-Markdown file of the explorer: text, images and videos show in
// the central area; any other binary goes to the application the OS associates.
import { t } from "../i18n.svelte";
import { showPersistentToast } from "../persistentToast";
import * as api from "./api";
import { home } from "./state.svelte";
import type { ExplorerNode } from "./types";

const ERROR_TOAST_MS = 6000;
const KNOWN_ERRORS = new Set(["not_local", "executable", "not_found", "open_failed"]);

// Only the latest action counts: a slow answer never overrides a later click.
let latestRequest = 0;

function showError(error: unknown, name: string) {
  const code = error instanceof api.OtherFileError && KNOWN_ERRORS.has(error.message) ? error.message : "load_failed";
  showPersistentToast(t(`other_files.error.${code}`, { name }), "error", ERROR_TOAST_MS);
}

export async function openExplorerFile(node: ExplorerNode): Promise<void> {
  const request = ++latestRequest;
  try {
    const preview = await api.fetchOtherFilePreview(node.path);
    if (request !== latestRequest) return;
    if (preview.type === "binary") await api.openOtherFile(node.path);
    else home.openedFile = { path: node.path, name: node.name, preview };
  } catch (error) {
    if (request === latestRequest) showError(error, node.name);
  }
}

export function closeExplorerFile(): void {
  latestRequest++;
  home.openedFile = null;
}

/** The entry at `path` moved or disappeared: a file shown from it no longer exists there. */
export function closeExplorerFileUnder(path: string): void {
  const shown = home.openedFile?.path;
  if (shown === path || shown?.startsWith(`${path}/`)) closeExplorerFile();
}
