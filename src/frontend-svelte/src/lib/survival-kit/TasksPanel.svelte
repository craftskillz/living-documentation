<script lang="ts">
  import { t } from "../i18n.svelte";
  import { skStore, persist } from "./store.svelte";
  import type { Priority } from "./types";

  let newText = $state("");
  let newPriority = $state<Priority>("normal");
  let filter = $state<"all" | "todo" | "done" | Priority>("all");

  const FILTERS: { key: typeof filter; label: () => string }[] = [
    { key: "all", label: () => t("survival.tasks_filter_all") },
    { key: "todo", label: () => t("survival.tasks_filter_todo") },
    { key: "done", label: () => t("survival.tasks_filter_done") },
    { key: "urgent", label: () => t("survival.tasks_filter_urgent") },
    { key: "normal", label: () => t("survival.tasks_filter_normal") },
    { key: "later", label: () => t("survival.tasks_filter_later") },
  ];

  function priorityLabel(p: Priority): string {
    return t(`survival.tasks_priority_${p}`);
  }

  let filtered = $derived(
    skStore.tasks.filter((task) => {
      if (filter === "todo") return !task.done;
      if (filter === "done") return task.done;
      if (filter === "urgent" || filter === "normal" || filter === "later")
        return task.priority === filter;
      return true;
    }),
  );

  function addTask() {
    const text = newText.trim();
    if (!text) return;
    skStore.tasks.unshift({ id: Date.now(), text, priority: newPriority, done: false });
    newText = "";
    persist();
  }

  function toggle(id: number) {
    const task = skStore.tasks.find((x) => x.id === id);
    if (task) task.done = !task.done;
    persist();
  }

  function remove(id: number) {
    skStore.tasks = skStore.tasks.filter((x) => x.id !== id);
    persist();
  }
</script>

<div class="sk-panel-head">
  <h2 class="sk-panel-title">{t("survival.tasks_title")}<span class="sk-accent">.</span></h2>
  <p class="sk-panel-sub">{t("survival.tasks_subtitle")}</p>
</div>

<div class="sk-add-bar">
  <input
    type="text"
    bind:value={newText}
    placeholder={t("survival.tasks_input_placeholder")}
    onkeydown={(e) => e.key === "Enter" && addTask()}
  />
  <select bind:value={newPriority}>
    <option value="normal">{t("survival.tasks_priority_normal")}</option>
    <option value="urgent">{t("survival.tasks_priority_urgent")}</option>
    <option value="later">{t("survival.tasks_priority_later")}</option>
  </select>
  <button type="button" class="sk-add-btn" onclick={addTask}>+</button>
</div>

<div class="sk-filters">
  {#each FILTERS as f}
    <button
      type="button"
      class:active={filter === f.key}
      onclick={() => (filter = f.key)}>{f.label()}</button
    >
  {/each}
</div>

<div class="sk-tasks">
  {#if filtered.length === 0}
    <p class="sk-empty">{t("survival.tasks_empty")}</p>
  {:else}
    {#each filtered as task (task.id)}
      <div class="sk-task sk-task--{task.priority}" class:done={task.done}>
        <button
          type="button"
          class="sk-check"
          class:checked={task.done}
          aria-label="toggle"
          onclick={() => toggle(task.id)}
        ></button>
        <span class="sk-task-text">{task.text}</span>
        <span class="sk-task-tag">{priorityLabel(task.priority)}</span>
        <button
          type="button"
          class="sk-task-del"
          title={t("survival.tasks_delete_title")}
          onclick={() => remove(task.id)}>✕</button
        >
      </div>
    {/each}
  {/if}
</div>

<style>
  .sk-add-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .sk-add-bar input {
    flex: 1;
    min-width: 0;
    padding: 8px 10px;
    font-size: 13px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel-soft);
    color: var(--ink);
    font-family: inherit;
  }
  .sk-add-bar select {
    padding: 8px 8px;
    font-size: 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel-soft);
    color: var(--ink);
    font-family: inherit;
  }
  .sk-add-bar input:focus,
  .sk-add-bar select:focus {
    outline: none;
    border-color: var(--accent);
  }
  .sk-add-btn {
    width: 36px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #fff;
    border-radius: 8px;
    font-size: 18px;
    cursor: pointer;
    line-height: 1;
  }
  .sk-add-btn:hover {
    background: var(--accent-strong);
  }

  .sk-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
  }
  .sk-filters button {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-family: inherit;
  }
  .sk-filters button.active {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent-strong);
  }

  .sk-tasks {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sk-task {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-left: 3px solid var(--sk-color);
    border-radius: 10px;
    background: var(--panel);
  }
  .sk-task--urgent {
    --sk-color: #ef4444;
  }
  .sk-task--normal {
    --sk-color: var(--accent);
  }
  .sk-task--later {
    --sk-color: #a855f7;
  }
  .sk-check {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    border: 2px solid var(--line-strong);
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    position: relative;
  }
  .sk-check.checked {
    background: var(--green);
    border-color: var(--green);
  }
  .sk-check.checked::after {
    content: "✓";
    position: absolute;
    inset: 0;
    color: #fff;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sk-task-text {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: var(--ink);
    word-break: break-word;
  }
  .sk-task.done .sk-task-text {
    text-decoration: line-through;
    color: var(--muted);
  }
  .sk-task-tag {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--sk-color);
    flex-shrink: 0;
  }
  .sk-task-del {
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-size: 12px;
    flex-shrink: 0;
    padding: 2px 4px;
  }
  .sk-task-del:hover {
    color: var(--red);
  }

  .sk-empty {
    font-size: 13px;
    color: var(--muted);
    font-style: italic;
    text-align: center;
    padding: 24px 0;
  }
</style>
