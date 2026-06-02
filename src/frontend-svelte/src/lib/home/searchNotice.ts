// Global-search in-document highlighting + match list. Ported from search.js
// (highlightMatches / scrollToMatch). Wraps matches in <mark id="match-N">.

export interface SearchMatch {
  id: string;
  snippet: string;
}

export function highlightMatches(el: HTMLElement, q: string): SearchMatch[] {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  let idx = 0;
  nodes.forEach(node => {
    if (!(node.textContent || "").toLowerCase().includes(q.toLowerCase())) return;
    const span = document.createElement("span");
    span.innerHTML = (node.textContent || "").replace(re, m => `<mark id="match-${idx++}">${m}</mark>`);
    node.parentNode!.replaceChild(span, node);
  });

  const matches: SearchMatch[] = [];
  el.querySelectorAll("mark[id^='match-']").forEach(mark => {
    const block = (mark.closest("p, li, td, h1, h2, h3, h4, h5, h6, pre") || mark.parentElement) as Element;
    const full = (block.textContent || "").trim();
    const pos = full.toLowerCase().indexOf(q.toLowerCase());
    const start = Math.max(0, pos - 40);
    const end = Math.min(full.length, pos + q.length + 40);
    const snippet = (start > 0 ? "…" : "") + full.slice(start, end) + (end < full.length ? "…" : "");
    matches.push({ id: mark.id, snippet });
  });
  return matches;
}

export function scrollToMatch(id: string) {
  const mark = document.getElementById(id);
  const container = document.getElementById("home-content-area");
  if (!mark || !container) return;

  let ancestor = mark.parentElement;
  while (ancestor && ancestor !== container) {
    if (ancestor.tagName === "DETAILS" && !(ancestor as HTMLDetailsElement).open) (ancestor as HTMLDetailsElement).open = true;
    ancestor = ancestor.parentElement;
  }

  document.querySelectorAll("mark.match-active").forEach(m => m.classList.remove("match-active"));
  mark.classList.add("match-active");

  const stickyHeader = document.querySelector("#home-doc-view header");
  const headerHeight = stickyHeader ? stickyHeader.getBoundingClientRect().height : 0;
  const markTop = mark.getBoundingClientRect().top;
  const containerTop = container.getBoundingClientRect().top;
  const targetOffset = headerHeight + (container.clientHeight - headerHeight) / 3;
  container.scrollTop += markTop - containerTop - targetOffset;
}
