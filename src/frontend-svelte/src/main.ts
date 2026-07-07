import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";
import { initPersistentToast } from "./lib/persistentToast";
import { applySiteThemeFromCache, installSiteThemeFetchHook } from "./lib/siteTheme";

// Apply the visual skin from cache before mounting (no request, no flash), then
// keep it in sync with the server config via the fetch hook.
applySiteThemeFromCache();
installSiteThemeFetchHook();
initPersistentToast();
mount(App, { target: document.getElementById("app")! });
