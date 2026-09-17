<script lang="ts">
  import { onMount } from 'svelte';
  import Topbar from '../lib/Topbar.svelte';
  import TemplatesManager from '../lib/templates/TemplatesManager.svelte';
  import { loadI18n, t } from '../lib/i18n.svelte';
  onMount(async () => {
    try {
      const response = await fetch('/api/config');
      if (response.ok) await loadI18n((await response.json()).language || 'en');
    } catch { /* Cached language remains usable. */ }
  });
</script>
<div class="app-shell templates-shell">
  <Topbar title={t('templates.library')} subtitle="" />
  <TemplatesManager />
</div>

<style>
  .templates-shell { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
  .templates-shell :global(.topbar) { min-width: 0; min-height: 72px; padding-top: 10px; padding-bottom: 10px; }
  @media (max-width: 900px) {
    .templates-shell :global(.topbar-right) { max-width: 100%; min-width: 0; overflow-x: auto; }
    .templates-shell :global(.topbar-right > *) { flex-shrink: 0; }
  }
</style>
