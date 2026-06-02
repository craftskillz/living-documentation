<script lang="ts">
  import { t } from "./i18n.svelte";

  interface Rule {
    path: string;
    title: string;
    severity: string;
    description: string;
    tags?: string[];
    appliesTo?: string[];
  }

  let {
    rules = [],
    rulesFolder = "",
    onAdd,
  }: {
    rules: Rule[];
    rulesFolder: string;
    onAdd: (rule: object) => Promise<void>;
  } = $props();

  let ruleTitle = $state("");
  let ruleSeverity = $state("guideline");
  let ruleDescription = $state("");
  let ruleTags = $state("");
  let ruleAppliesTo = $state("");
  let ruleBody = $state("");
  let saving = $state(false);

  function documentHref(docPath: string) {
    const docId = encodeURIComponent(String(docPath || "").replace(/\.md$/i, ""));
    return "/?doc=" + encodeURIComponent(docId);
  }

  function severityLabel(value: string) {
    const key = `context.rule_severity_${value}`;
    const label = t(key);
    return label === key ? value : label;
  }

  function splitList(value: string) {
    return value.split(",").map(s => s.trim()).filter(Boolean);
  }

  async function handleAdd() {
    if (!ruleTitle.trim()) return;
    saving = true;
    try {
      await onAdd({
        title: ruleTitle.trim(),
        severity: ruleSeverity,
        description: ruleDescription.trim(),
        tags: splitList(ruleTags),
        appliesTo: splitList(ruleAppliesTo),
        body: ruleBody.trim(),
      });
      ruleTitle = "";
      ruleDescription = "";
      ruleTags = "";
      ruleAppliesTo = "";
      ruleBody = "";
    } finally {
      saving = false;
    }
  }
</script>

<div class="rules-layout">
  <!-- Rules list -->
  <div class="section-card">
    <div class="section-header">
      <span class="section-title">{t("context.rules_title")}</span>
      {#if rulesFolder}
        <span class="rules-folder">{rulesFolder}</span>
      {/if}
    </div>
    <div class="rule-list">
      {#if !rules.length}
        <p class="empty-msg">{t("context.no_rules")}</p>
      {:else}
        {#each rules as rule}
          <article class="rule-row">
            <div class="rule-top">
              <div class="rule-title-wrap">
                <h3 class="rule-title">
                  <a href={documentHref(rule.path)} class="rule-link">{rule.title}</a>
                </h3>
                <a href={documentHref(rule.path)} class="rule-path">{rule.path}</a>
              </div>
              <span class="severity-badge">{severityLabel(rule.severity)}</span>
            </div>
            <p class="rule-desc">{rule.description}</p>
            {#if rule.tags?.length}
              <div class="rule-tags">
                {#each rule.tags as tag}<span class="tag">{tag}</span>{/each}
              </div>
            {/if}
            {#if rule.appliesTo?.length}
              <div class="rule-applies">{rule.appliesTo.join(", ")}</div>
            {/if}
          </article>
        {/each}
      {/if}
    </div>
  </div>

  <!-- Add rule form -->
  <div class="section-card aside-card">
    <span class="section-title">{t("context.add_rule_title")}</span>

    <div class="field-group">
      <label class="field-label" for="ruleTitle">{t("context.rule_title_label")}</label>
      <input
        id="ruleTitle"
        class="field-input"
        placeholder={t("context.rule_title_placeholder")}
        bind:value={ruleTitle}
      />
    </div>

    <div class="field-group">
      <label class="field-label" for="ruleSeverity">{t("context.rule_severity_label")}</label>
      <select id="ruleSeverity" class="field-input" bind:value={ruleSeverity}>
        <option value="guideline">{t("context.rule_severity_guideline")}</option>
        <option value="warning">{t("context.rule_severity_warning")}</option>
        <option value="required">{t("context.rule_severity_required")}</option>
      </select>
    </div>

    <div class="field-group">
      <label class="field-label" for="ruleDescription">{t("context.rule_description_label")}</label>
      <input
        id="ruleDescription"
        class="field-input"
        placeholder={t("context.rule_description_placeholder")}
        bind:value={ruleDescription}
      />
    </div>

    <div class="field-group">
      <label class="field-label" for="ruleTags">{t("context.rule_tags_label")}</label>
      <input
        id="ruleTags"
        class="field-input"
        placeholder={t("context.rule_tags_placeholder")}
        bind:value={ruleTags}
      />
    </div>

    <div class="field-group">
      <label class="field-label" for="ruleAppliesTo">{t("context.rule_applies_to_label")}</label>
      <input
        id="ruleAppliesTo"
        class="field-input"
        placeholder={t("context.rule_applies_to_placeholder")}
        bind:value={ruleAppliesTo}
      />
    </div>

    <div class="field-group">
      <label class="field-label" for="ruleBody">{t("context.rule_body_label")}</label>
      <textarea
        id="ruleBody"
        rows="7"
        class="field-input"
        placeholder={t("context.rule_body_placeholder")}
        bind:value={ruleBody}
      ></textarea>
    </div>

    <button
      class="btn-primary"
      style="width:100%"
      disabled={saving || !ruleTitle.trim()}
      onclick={handleAdd}
    >
      {t("context.add_rule_button")}
    </button>
  </div>
</div>

<style>
  .rules-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 22rem;
    gap: 16px;
    align-items: start;
  }
  @media (max-width: 900px) {
    .rules-layout { grid-template-columns: 1fr; }
  }
  .section-card {
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--panel);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .aside-card { gap: 10px; }
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .section-title { font-size: 13px; font-weight: 600; color: var(--ink); }
  .rules-folder { font-family: monospace; font-size: 11px; color: var(--muted); }
  .rule-list { display: flex; flex-direction: column; gap: 8px; }
  .rule-row {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 10px 12px;
  }
  .rule-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;
  }
  .rule-title-wrap { min-width: 0; }
  .rule-title { margin: 0; font-size: 13px; font-weight: 600; }
  .rule-link { color: var(--accent); text-decoration: none; }
  .rule-link:hover { text-decoration: underline; }
  .rule-path {
    font-family: monospace;
    font-size: 11px;
    color: var(--muted);
    text-decoration: none;
    word-break: break-all;
    display: block;
  }
  .rule-path:hover { color: var(--accent); }
  .severity-badge {
    border-radius: 4px;
    background: var(--panel-soft);
    border: 1px solid var(--line);
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 600;
    color: var(--ink);
    flex-shrink: 0;
  }
  .rule-desc { font-size: 13px; color: var(--muted); margin: 0 0 6px; }
  .rule-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }
  .tag { font-size: 11px; color: var(--accent); }
  .rule-applies { font-family: monospace; font-size: 11px; color: var(--muted); word-break: break-all; }
  .empty-msg { font-size: 13px; color: var(--muted); margin: 0; }
</style>
