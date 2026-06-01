/**
 * Shared Markdown HTML renderer.
 *
 * StranglerFig: this module is the new canonical renderer.
 * - Blueprint imports it directly (ES module).
 * - documents.js (legacy) should eventually import it too.
 *
 * Usage:
 *   import { renderMarkdownHtml } from '../md-renderer.js';
 *   renderMarkdownHtml(doc.html, containerElement);
 */

declare global {
  interface Window {
    hljs?: { highlightElement(block: Element): void };
    mermaid?: { run(opts: { nodes: NodeListOf<Element> }): void };
  }
}

export function renderMarkdownHtml(html: string, el: HTMLElement): void {
  el.innerHTML = html;

  // Heading anchors
  el.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    if (!h.id) {
      h.id = h.textContent!
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    }
  });

  // Mermaid diagrams — replace before highlight.js
  el.querySelectorAll('pre code.language-mermaid').forEach((block) => {
    const source = block.textContent ?? '';
    const wrapper = document.createElement('div');
    wrapper.className = 'mermaid';
    wrapper.textContent = source;
    block.closest('pre')!.replaceWith(wrapper);
  });
  if (window.mermaid) {
    const nodes = el.querySelectorAll('.mermaid');
    if (nodes.length) window.mermaid.run({ nodes });
  }

  // Syntax highlighting
  if (window.hljs) {
    el.querySelectorAll('pre code').forEach((block) => {
      window.hljs!.highlightElement(block);
    });
  }

  // Scrollable tables
  el.querySelectorAll('table').forEach((t) => {
    if (t.parentElement?.classList.contains('overflow-x-auto')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'overflow-x-auto';
    t.parentNode!.insertBefore(wrapper, t);
    wrapper.appendChild(t);
  });
}
