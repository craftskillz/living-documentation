let dict = $state<Record<string, string>>({});

export async function loadI18n(lang: string): Promise<void> {
  try {
    const res = await fetch(`/i18n/${lang || "en"}.json`);
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
