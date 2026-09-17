// Not a route: the ☁ button that opens the word-cloud modal (Home, Survival Kit).
export const WORD_CLOUD_MENU = "#word-cloud";

export const OPTIONAL_HEADER_MENUS = [
  { href: "/blueprint", labelKey: "admin.navigation.blueprint" },
  { href: "/graph", labelKey: "graph.nav" },
  { href: "/survival-kit", labelKey: "admin.navigation.survival_kit" },
  { href: "/context", labelKey: "admin.navigation.ai_context" },
  { href: WORD_CLOUD_MENU, labelKey: "admin.navigation.word_cloud" },
] as const;

export function normalizeHiddenHeaderMenus(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return OPTIONAL_HEADER_MENUS.map((menu) => menu.href).filter((href) =>
    value.includes(href),
  );
}
