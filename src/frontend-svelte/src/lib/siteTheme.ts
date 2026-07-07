// Site theme = visual skin, independent of light/dark. "base" is the default
// look; "tau" is a notebook-paper skin (serif prose on a graph-paper grid),
// adapted from huggingface/tau (MIT). Applied as `data-site-theme` on <html>,
// which the tau CSS block in styles/app.css keys off.
//
// To avoid an extra /api/config round-trip on every page load (and a flash of
// the base theme), the skin is applied synchronously at boot from a localStorage
// cache — the same pattern as dark mode's `ld-dark`. Config stays the source of
// truth: a fetch hook watches the /api/config GET each page already makes and
// re-syncs the cache, so no page pays an additional request.
export type SiteTheme = "base" | "tau";

const STORAGE_KEY = "ld-site-theme";

function normalize(value: unknown): SiteTheme {
  return value === "tau" ? "tau" : "base";
}

export function applySiteTheme(siteTheme: SiteTheme): void {
  const root = document.documentElement;
  root.setAttribute("data-site-theme", siteTheme);
  // tau is light-only for now — never let it render in dark mode.
  if (siteTheme === "tau") root.classList.remove("dark");
  try {
    localStorage.setItem(STORAGE_KEY, siteTheme);
  } catch {
    // Private mode / storage disabled — the skin still applies for this session.
  }
}

export function isTauActive(): boolean {
  return document.documentElement.getAttribute("data-site-theme") === "tau";
}

// Applied synchronously before mount from the cached preference — no network
// request, so pages keep their single /api/config fetch.
export function applySiteThemeFromCache(): void {
  let cached: string | null = null;
  try {
    cached = localStorage.getItem(STORAGE_KEY);
  } catch {
    cached = null;
  }
  applySiteTheme(normalize(cached));
}

let hookInstalled = false;

// Keeps the cached skin in sync with the server config without adding a request:
// it reads the /api/config GET response that pages already fetch.
export function installSiteThemeFetchHook(): void {
  if (hookInstalled) return;
  hookInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);
    try {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
      if (method === "GET" && /\/api\/config(?:\?|$)/.test(url)) {
        response
          .clone()
          .json()
          .then((cfg: { siteTheme?: unknown }) => applySiteTheme(normalize(cfg?.siteTheme)))
          .catch(() => {});
      }
    } catch {
      // Never let theme syncing break a fetch.
    }
    return response;
  };
}
