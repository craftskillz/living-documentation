<script lang="ts">
  import { t } from "../i18n.svelte";
  import { metadata, accuracyColor, accuracyBackground } from "./metadata.svelte";

  let { onopen }: { onopen: () => void } = $props();

  const report = $derived(metadata.report);
  const pct = $derived(report ? Math.round(report.accuracy * 100) : 0);
  const tooltip = $derived(
    report
      ? t("accuracy.tooltip")
          .replace("{unchanged}", String(report.unchanged))
          .replace("{modified}", String(report.modified))
          .replace("{missing}", String(report.missing))
          .replace("{total}", String(report.total))
      : "",
  );
</script>

{#if report && report.total > 0}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div onclick={onopen} data-testid="accuracy-gauge" title={tooltip} class="no-print mt-5 flex items-center gap-3 mr-auto w-full sm:w-80 cursor-pointer select-none">
    <span class="text-xs text-gray-500 dark:text-gray-400 shrink-0">{t("accuracy.label")}</span>
    <div class="flex-1 h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
      <div class="h-full w-full transition-all" style="background:{accuracyBackground(report.accuracy)}"></div>
    </div>
    <span data-testid="accuracy-gauge-value" class="text-xs font-semibold shrink-0 tabular-nums" style="color:{accuracyColor(report.accuracy)}">{pct}%</span>
  </div>
{/if}
