// Survival Kit — reactive state backed by the server JSON blob.
//
// Independent of the rest of living-documentation: the only contract is the
// /api/survival-kit GET/PUT endpoints. State mutations call `persist()`, which
// debounces a full-state PUT so rapid edits collapse into a single write.

import type { SkState } from "./types";

export const skStore = $state<SkState>({ tasks: [], notes: [], links: [] });

let loaded = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function loadState(): Promise<void> {
  try {
    const res = await fetch("/api/survival-kit");
    if (res.ok) {
      const data = (await res.json()) as Partial<SkState>;
      skStore.tasks = Array.isArray(data.tasks) ? data.tasks : [];
      skStore.notes = Array.isArray(data.notes) ? data.notes : [];
      skStore.links = Array.isArray(data.links) ? data.links : [];
    }
  } catch {
    // keep empty state — the UI still works, just nothing persisted yet
  } finally {
    loaded = true;
  }
}

async function flush(): Promise<void> {
  try {
    await fetch("/api/survival-kit", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tasks: skStore.tasks,
        notes: skStore.notes,
        links: skStore.links,
      }),
    });
  } catch {
    // best-effort; next persist() will retry the whole blob
  }
}

/** Schedule a debounced full-state save. */
export function persist(): void {
  if (!loaded) return; // never overwrite the file before the initial load
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flush();
  }, 400);
}
