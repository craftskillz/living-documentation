import { normalizeHiddenHeaderMenus } from "../../../shared/headerNavigation";
export { OPTIONAL_HEADER_MENUS, WORD_CLOUD_MENU, normalizeHiddenHeaderMenus } from "../../../shared/headerNavigation";

export const headerNavigation = $state({ hidden: [] as string[] });

export function syncHeaderNavigation(cfg: { hiddenHeaderMenus?: unknown }): void {
  headerNavigation.hidden = normalizeHiddenHeaderMenus(cfg.hiddenHeaderMenus);
}
