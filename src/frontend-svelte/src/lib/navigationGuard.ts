let guard: (() => Promise<boolean>) | undefined;
let pending: Promise<boolean> | undefined;

export function setNavigationGuard(next: () => Promise<boolean>): () => void {
  guard = next;
  return () => { if (guard === next) guard = undefined; };
}

export async function canLeavePage(): Promise<boolean> {
  if (!guard) return true;
  if (!pending) pending = guard().finally(() => { pending = undefined; });
  return pending;
}
