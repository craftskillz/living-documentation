export interface MetadataItem {
  path: string;
  status: "unchanged" | "modified" | "missing";
}

export interface MetadataReport {
  total: number;
  unchanged: number;
  modified: number;
  missing: number;
  accuracy: number;
  items: MetadataItem[];
}

const RED = "#dc2626",
  YELLOW = "#eab308",
  GREEN = "#16a34a";

export function accuracyColor(ratio: number): string {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  if (pct > 80) return GREEN;
  if (pct >= 60) return YELLOW;
  if (pct >= 40) return "#f97316";
  return RED;
}

export function accuracyBackground(ratio: number): string {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  if (pct >= 100) return GREEN;
  if (pct < 30) return RED;
  if (pct < 60)
    return `linear-gradient(to right, ${RED} 0%, ${RED} 60%, ${YELLOW} 100%)`;
  if (pct < 80)
    return `linear-gradient(to right, ${RED} 0%, ${YELLOW} 40%, ${YELLOW} 100%)`;
  return `linear-gradient(to right, ${YELLOW} 0%, ${GREEN} 40%, ${GREEN} 100%)`;
}

class MetadataStore {
  report = $state<MetadataReport | null>(null);

  async load(docId: string): Promise<MetadataReport | null> {
    if (!docId) {
      this.report = null;
      return null;
    }
    try {
      const r = await fetch(`/api/metadata/${encodeURIComponent(docId)}`);
      if (!r.ok) throw new Error(r.statusText);
      this.report = await r.json();
    } catch {
      this.report = null;
    }
    return this.report;
  }

  async refresh(docId: string): Promise<void> {
    const r = await fetch(
      `/api/metadata/${encodeURIComponent(docId)}/refresh`,
      { method: "POST" },
    );
    if (!r.ok) throw new Error(r.statusText);
    this.report = await r.json();
  }

  async addPath(docId: string, path: string): Promise<void> {
    const r = await fetch(`/api/metadata/${encodeURIComponent(docId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (!r.ok) {
      const b = await r.json().catch(() => ({}));
      throw new Error(b.error || r.statusText);
    }
    this.report = await r.json();
  }

  async removePath(docId: string, path: string): Promise<void> {
    const r = await fetch(`/api/metadata/${encodeURIComponent(docId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (!r.ok) throw new Error(r.statusText);
    this.report = await r.json();
  }
}

export const metadata = new MetadataStore();
