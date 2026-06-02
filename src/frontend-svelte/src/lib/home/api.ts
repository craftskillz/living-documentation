import type { DocSummary, DocDetail } from "./types";

export async function fetchConfig(): Promise<Record<string, unknown>> {
  return fetch("/api/config").then(r => r.json());
}

export async function fetchDocuments(): Promise<DocSummary[]> {
  return fetch("/api/documents").then(r => r.json());
}

export async function fetchAllDirs(docsFolder: string): Promise<string[]> {
  return fetch("/api/browse/alldirs?path=" + encodeURIComponent(docsFolder)).then(r => r.json());
}

export async function fetchDocument(id: string): Promise<DocDetail> {
  const r = await fetch("/api/documents/" + id);
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
}

export async function fetchAnnotationCounts(): Promise<Record<string, number>> {
  try {
    const raw = await fetch("/api/annotations").then(r => r.json());
    // Store each count under both the raw id and its encoded form, since the
    // sidebar looks up by doc.id which may differ in encoding from the API keys.
    const counts: Record<string, number> = {};
    for (const [docId, n] of Object.entries(raw || {})) {
      counts[docId] = n as number;
      try { counts[encodeURIComponent(docId)] = n as number; } catch {}
    }
    return counts;
  } catch {
    return {};
  }
}

export async function fetchFileCounts(): Promise<Record<string, number>> {
  try {
    return await fetch("/api/documents/file-counts").then(r => r.json());
  } catch {
    return {};
  }
}

export async function fetchDocStatuses(): Promise<Record<string, string>> {
  try {
    return await fetch("/api/documents/statuses").then(r => r.json());
  } catch {
    return {};
  }
}

export async function searchDocuments(q: string): Promise<DocSummary[]> {
  return fetch("/api/documents/search?q=" + encodeURIComponent(q)).then(r => r.json());
}
