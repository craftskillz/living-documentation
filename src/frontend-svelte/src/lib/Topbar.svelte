<script lang="ts">
  import { headerNavigation } from "./headerNavigation.svelte";
  import { t } from "./i18n.svelte";
  import TemplatesMenu from "./templates/TemplatesMenu.svelte";
  import AgentsMenu from "./AgentsMenu.svelte";
  import FavoritesMenu from "./FavoritesMenu.svelte";

  let { title, subtitle, nav = [], children, actions }: {
    title: string;
    subtitle: string;
    nav?: { label: string; href: string }[];
    children?: import("svelte").Snippet;
    actions?: import("svelte").Snippet;
  } = $props();


  const allNav = $derived(
    [
      ...nav,
      { label: "Workspace", href: "/workspace" },
      { label: "Blueprint", href: "/blueprint" },
      { label: "Diagram", href: "/diagram" },
      { label: t("graph.nav"), href: "/graph" },
      { label: "Files", href: "/files" },
      { label: "Survival Kit", href: "/survival-kit" },
      { label: "AI Context", href: "/context" },
      { label: "Admin", href: "/admin" },
      { label: "Home", href: "/" },
    ].filter((link, index, links) => !headerNavigation.hidden.includes(link.href) && links.findIndex((item) => item.href === link.href) === index)
  );

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
      >
        {link.label}
      </a>
    {/each}
    <TemplatesMenu />
      <AgentsMenu />
    {#if actions}{@render actions()}{/if}
  </div>
</header>
