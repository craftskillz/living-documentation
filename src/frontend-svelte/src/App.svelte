<script lang="ts">
  import { onMount } from "svelte";
  import "../src/styles/app.css";
  import Admin from "./routes/Admin.svelte";
  import Blueprint from "./routes/Blueprint.svelte";
  import Workspace from "./routes/Workspace.svelte";
  import Files from "./routes/Files.svelte";
  import AiContext from "./routes/AiContext.svelte";
  import Home from "./routes/Home.svelte";
  import Diagram from "./routes/Diagram.svelte";
  import ShapeEditor from "./routes/ShapeEditor.svelte";
  import SurvivalKit from "./routes/SurvivalKit.svelte";
  import { initPersistentToast } from "./lib/persistentToast";

  // Normalize the pathname so trailing slashes (e.g. "/diagram/") still match the
  // exact route keys below. Express tolerates the trailing slash and serves
  // index.html, but our string router would otherwise fall through.
  function normalizePath(p: string): string {
    return p.length > 1 ? p.replace(/\/+$/, "") : p;
  }

  const appRoutes = new Set([
    "/",
    "/admin",
    "/workspace",
    "/blueprint",
    "/diagram",
    "/shape-editor",
    "/context",
    "/files",
    "/survival-kit",
  ]);

  let path = $state(normalizePath(window.location.pathname));

  function routeTo(to: string) {
    const url = new URL(to, window.location.href);
    const normalized = normalizePath(url.pathname);
    const nextLocation = `${normalized}${url.search}${url.hash}`;

    if (nextLocation === `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      initPersistentToast();
      return;
    }

    history.pushState(null, "", nextLocation);
    path = normalized;
    initPersistentToast();

    // Notify the active page that the location changed. Pages like Home only
    // react to the `?doc=` query on mount and on popstate; without this dispatch,
    // navigating to `/?doc=...` (e.g. the agent toast "open document" link) would
    // update the address bar but never load the document until a manual F5.
    // Mirrors the pushState + popstate pattern already used by the Topbar nav.
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function handleInternalLinkClick(event: MouseEvent) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target instanceof Element
      ? event.target.closest("a[href]")
      : null;
    if (!(target instanceof HTMLAnchorElement)) return;
    if (target.target || target.hasAttribute("download")) return;

    const url = new URL(target.href, window.location.href);
    if (url.origin !== window.location.origin) return;

    const normalized = normalizePath(url.pathname);
    if (!appRoutes.has(normalized)) return;

    event.preventDefault();
    routeTo(`${normalized}${url.search}${url.hash}`);
  }

  onMount(() => {
    initPersistentToast();
    document.addEventListener("click", handleInternalLinkClick, true);
    return () => {
      document.removeEventListener("click", handleInternalLinkClick, true);
    };
  });

  window.addEventListener("popstate", () => {
    path = normalizePath(window.location.pathname);
    initPersistentToast();
  });

  $effect(() => {
    if (path === "/blueprint") {
      document.documentElement.setAttribute("data-blueprint", "");
    } else {
      document.documentElement.removeAttribute("data-blueprint");
    }
  });

  function navigate(to: string) {
    routeTo(to);
  }
</script>

{#if path === "/admin"}
  <Admin {navigate} />
{:else if path === "/blueprint"}
  <Blueprint />
{:else if path === "/workspace"}
  <Workspace />
{:else if path === "/files"}
  <Files />
{:else if path === "/context"}
  <AiContext {navigate} />
{:else if path === "/diagram"}
  <Diagram />
{:else if path === "/shape-editor"}
  <ShapeEditor />
{:else if path === "/survival-kit"}
  <SurvivalKit />
{:else if path === "/"}
  <Home />
{:else}
  <p style="padding:2rem">Route "{path}" — not yet migrated.</p>
{/if}
