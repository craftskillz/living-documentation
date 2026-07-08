// A single fetch hook that watches the `/api/config` GET responses every page
// already makes, and notifies listeners with the parsed config. This lets
// client features (site theme, favorites, …) stay in sync with the server
// config without adding an extra request per page.
export type ConfigListener = (cfg: Record<string, unknown>) => void;

const listeners = new Set<ConfigListener>();
let installed = false;

export function onConfig(listener: ConfigListener): void {
  listeners.add(listener);
}

export function installConfigObserver(): void {
  if (installed) return;
  installed = true;

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
          .then((cfg: Record<string, unknown>) => {
            for (const listener of listeners) {
              try {
                listener(cfg);
              } catch {
                // A misbehaving listener must not break the others or the fetch.
              }
            }
          })
          .catch(() => {});
      }
    } catch {
      // Never let config observing break a fetch.
    }
    return response;
  };
}
