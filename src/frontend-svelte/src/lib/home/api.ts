import type { DocSummary, DocDetail, ExplorerNode } from "./types";
import type { MoveRequest } from "./treeDrop";

export async function fetchConfig(): Promise<Record<string, unknown>> {
  return fetch("/api/config").then((r) => r.json());
}

export async function fetchDocuments(): Promise<DocSummary[]> {
  return fetch("/api/documents").then((r) => r.json());
}

export async function fetchTree(): Promise<ExplorerNode[]> {
  return fetch("/api/tree").then((r) => r.json());
}

export async function setTreeHidden(path: string, hidden: boolean): Promise<boolean> {
  const res = await fetch("/api/tree/hidden", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, hidden }),
  });
  return res.ok;
}

export type MoveOutcome = { ok: true; path: string } | { ok: false; status: number };

export async function moveTreeEntry(request: MoveRequest): Promise<MoveOutcome> {
  const res = await fetch("/api/tree/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) return { ok: false, status: res.status };
  const { path } = (await res.json()) as { path: string };
  return { ok: true, path };
}

export type RenameOutcome = { ok: true; path: string } | { ok: false; status: number };

export async function renameTreeEntry(path: string, newName: string): Promise<RenameOutcome> {
  const res = await fetch("/api/tree/rename", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, newName }),
  });
  if (!res.ok) return { ok: false, status: res.status };
  const { path: renamed } = (await res.json()) as { path: string };
  return { ok: true, path: renamed };
}

export async function fetchAllDirs(docsFolder: string): Promise<string[]> {
  return fetch(
    `/api/browse/alldirs?path=${encodeURIComponent(docsFolder)}`,
  ).then((r) => r.json());
}

export async function fetchDocument(id: string): Promise<DocDetail> {
  const r = await fetch(`/api/documents/${id}`);
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
}

export async function fetchAnnotationCounts(): Promise<Record<string, number>> {
  try {
    const raw = await fetch("/api/annotations").then((r) => r.json());
    // Store each count under both the raw id and its encoded form, since the
    // sidebar looks up by doc.id which may differ in encoding from the API keys.
    const counts: Record<string, number> = {};
    for (const [docId, n] of Object.entries(raw || {})) {
      counts[docId] = n as number;
      try {
        counts[encodeURIComponent(docId)] = n as number;
      } catch {}
    }
    return counts;
  } catch {
    return {};
  }
}

export async function fetchFileCounts(): Promise<Record<string, number>> {
  try {
    return await fetch("/api/documents/file-counts").then((r) => r.json());
  } catch {
    return {};
  }
}

export async function fetchDocStatuses(): Promise<Record<string, string>> {
  try {
    return await fetch("/api/documents/statuses").then((r) => r.json());
  } catch {
    return {};
  }
}

export async function searchDocuments(q: string): Promise<DocSummary[]> {
  return fetch(`/api/documents/search?q=${encodeURIComponent(q)}`).then((r) =>
    r.json(),
  );
}
