<script lang="ts">
  import { onMount } from 'svelte';
  import { marked } from 'marked';
  import { t } from '../i18n.svelte';
  let { content }: { content: string } = $props();
  let dark = $state(false);
  onMount(() => {
    const sync = () => { dark = document.documentElement.classList.contains('dark'); };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  });
  const html = $derived(marked.parse(content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, ''), { async: false }));
  const previewDocument = $derived(`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;"><style>html{color-scheme:${dark ? 'dark' : 'light'}}body{font:15px/1.7 system-ui;margin:24px;overflow-wrap:anywhere}h1{font-size:1.7em}h2{font-size:1.3em}pre{overflow:auto;padding:16px;background:light-dark(#f1f5f9,#1e293b);border-radius:8px}code{font-family:monospace}table{border-collapse:collapse;width:100%}th,td{border:1px solid #8886;padding:8px;text-align:left}blockquote{border-left:3px solid #8886;padding-left:16px;margin-left:0}img{max-width:100%}a{color:light-dark(#2563eb,#93c5fd)}</style></head><body>${html}</body></html>`);
</script>
{#key previewDocument}
<iframe title={t('templates.preview')} sandbox="" srcdoc={previewDocument}></iframe>
{/key}
<style>iframe { width: 100%; min-height: 350px; height: 100%; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); }</style>
