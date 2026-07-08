<script lang="ts">
  import AgentsMenu from "./AgentsMenu.svelte";
  import FavoritesMenu from "./FavoritesMenu.svelte";

  let { title, subtitle, nav = [], children, actions }: {
    title: string;
    subtitle: string;
    nav?: { label: string; href: string }[];
    children?: import("svelte").Snippet;
    actions?: import("svelte").Snippet;
  } = $props();

  const currentPath = window.location.pathname;

  const allNav = $derived(
    [
      ...nav,
      { label: "Workspace", href: "/workspace" },
      { label: "Blueprint", href: "/blueprint" },
      { label: "Diagram", href: "/diagram" },
      { label: "Files", href: "/files" },
      { label: "Survival Kit", href: "/survival-kit" },
      { label: "AI Context", href: "/context" },
      { label: "Admin", href: "/admin" },
      { label: "Home", href: "/" },
    ].filter((link) => link.href !== currentPath)
  );

  function handleNavClick(event: MouseEvent, href: string) {
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

    event.preventDefault();
    history.pushState(null, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
</script>

<header class="topbar">
  <div class="brand-lockup">
    <span class="brand-mark">LD</span>
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  </div>

  {#if children}
    {@render children()}
  {/if}

  <div class="topbar-right">
    <FavoritesMenu />
    {#each allNav as link}
      <a
        href={link.href}
        class="ghost-button"
        onclick={(event) => handleNavClick(event, link.href)}
      >
        {link.label}
      </a>
    {/each}
    <AgentsMenu />
    {#if actions}{@render actions()}{/if}
  </div>
</header>
