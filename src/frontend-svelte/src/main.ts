import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";
import { initPersistentToast } from "./lib/persistentToast";
import { applySiteThemeFromCache, syncSiteThemeFromConfig } from "./lib/siteTheme";
import { installConfigObserver, onConfig } from "./lib/configObserver";
import { favorites } from "./lib/favorites.svelte";
import { cachedLang, loadI18n } from "./lib/i18n.svelte";

// Apply the visual skin from cache before mounting (no request, no flash).
applySiteThemeFromCache();

// One fetch hook watches the /api/config GET each page already makes and keeps
// client state (skin, favorites) in sync without any extra request.
onConfig((cfg) => syncSiteThemeFromConfig(cfg));
onConfig((cfg) => favorites.syncFromConfig(cfg));
installConfigObserver();

initPersistentToast();

// Preload the cached-language dictionary before mounting so always-visible
// chrome (e.g. the topbar Favorites menu) never flashes raw i18n keys. Pages
// still reload i18n from the live config language on mount.
void loadI18n(cachedLang()).finally(() => {
  mount(App, { target: document.getElementById("app")! });
});
