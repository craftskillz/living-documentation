import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";
import { initPersistentToast } from "./lib/persistentToast";
import { applySiteThemeFromCache, syncSiteThemeFromConfig } from "./lib/siteTheme";
import { installConfigObserver, onConfig } from "./lib/configObserver";
import { favorites } from "./lib/favorites.svelte";

// Apply the visual skin from cache before mounting (no request, no flash).
applySiteThemeFromCache();

// One fetch hook watches the /api/config GET each page already makes and keeps
// client state (skin, favorites) in sync without any extra request.
onConfig((cfg) => syncSiteThemeFromConfig(cfg));
onConfig((cfg) => favorites.syncFromConfig(cfg));
installConfigObserver();

initPersistentToast();
mount(App, { target: document.getElementById("app")! });
