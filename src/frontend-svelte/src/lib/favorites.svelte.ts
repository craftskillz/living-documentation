// Shared reactive Favorites store. The list lives in the project config
// (.living-doc.json) so it is portable and committable. It is synced from the
// /api/config GET each page already makes (via the config observer, wired in
// main.ts) and persisted back with an optimistic PUT.
export interface FavoriteDoc {
  id: string;
  title: string;
}

class FavoritesState {
  items = $state<FavoriteDoc[]>([]);

  has(id: string): boolean {
    return this.items.some((f) => f.id === id);
  }

  // Config-observer listener — reconcile the list with the server config.
  syncFromConfig(cfg: { favorites?: unknown }): void {
    const raw = Array.isArray(cfg?.favorites) ? cfg.favorites : [];
    this.items = raw
      .filter(
        (f): f is FavoriteDoc =>
          !!f && typeof f === "object" && typeof (f as FavoriteDoc).id === "string",
      )
      .map((f) => ({ id: f.id, title: typeof f.title === "string" ? f.title : "" }));
  }

  toggle(doc: FavoriteDoc): void {
    const next = this.has(doc.id)
      ? this.items.filter((f) => f.id !== doc.id)
      : [...this.items, { id: doc.id, title: doc.title }];
    void this.persist(next);
  }

  remove(id: string): void {
    if (!this.has(id)) return;
    void this.persist(this.items.filter((f) => f.id !== id));
  }

  // Move `fromId` to the position of `toId` (list order = priority, top first).
  reorder(fromId: string, toId: string): void {
    const from = this.items.findIndex((f) => f.id === fromId);
    const to = this.items.findIndex((f) => f.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...this.items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void this.persist(next);
  }

  // Optimistic write: update the UI immediately, roll back if the PUT fails.
  private async persist(next: FavoriteDoc[]): Promise<void> {
    const previous = this.items;
    this.items = next;
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorites: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      this.items = previous;
    }
  }
}

export const favorites = new FavoritesState();
