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
export function renderMarkdownHtml(html, el) {
    el.innerHTML = html;
    // Heading anchors
    el.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
        if (!h.id) {
            h.id = h.textContent
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-');
        }
    });
    // Syntax highlighting
    if (window.hljs) {
        el.querySelectorAll('pre code').forEach((block) => {
            window.hljs.highlightElement(block);
        });
    }
    // Scrollable tables
    el.querySelectorAll('table').forEach((t) => {
        if (t.parentElement?.classList.contains('overflow-x-auto'))
            return;
        const wrapper = document.createElement('div');
        wrapper.className = 'overflow-x-auto';
        t.parentNode.insertBefore(wrapper, t);
        wrapper.appendChild(t);
    });
}
//# sourceMappingURL=md-renderer.js.map