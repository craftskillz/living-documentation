let dict = $state<Record<string, string>>({});

const LANG_KEY = "ld-lang";

// Last language used, cached so the dictionary can be preloaded before the app
// mounts (avoids a flash of raw i18n keys in always-visible chrome like the
// topbar). Mirrors the dark-mode / site-theme localStorage pattern.
export function cachedLang(): string {
  try {
    return localStorage.getItem(LANG_KEY) || "en";
  } catch {
    return "en";
  }
}

export async function loadI18n(lang: string): Promise<void> {
  const resolved = lang || "en";
  try {
    localStorage.setItem(LANG_KEY, resolved);
  } catch {
    // storage disabled — preloading just falls back to "en" next boot
  }
  try {
    const res = await fetch(`/i18n/${resolved}.json`);
    if (res.ok) dict = await res.json();
  } catch {
    // keep empty dict — keys used as fallback text
  }
}

export function t(key: string, params?: Record<string, string>): string {
  let str = dict[key] !== undefined ? dict[key] : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, v);
    }
  }
  return str;
}
