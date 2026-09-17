export const OPTIONAL_HEADER_MENUS = [
  { href: "/workspace", labelKey: "admin.navigation.workspace" },
  { href: "/blueprint", labelKey: "admin.navigation.blueprint" },
  { href: "/graph", labelKey: "graph.nav" },
  { href: "/survival-kit", labelKey: "admin.navigation.survival_kit" },
  { href: "/context", labelKey: "admin.navigation.ai_context" },
] as const;

export function normalizeHiddenHeaderMenus(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return OPTIONAL_HEADER_MENUS.map((menu) => menu.href).filter((href) => value.includes(href));
}
