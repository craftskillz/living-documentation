// Global-search in-document highlighting + match list. Ported from search.js
// (highlightMatches / scrollToMatch). Wraps matches in <mark id="match-N">.

export interface SearchMatch {
  id: string;
  snippet: string;
}

// Strip diacritics for accent-insensitive matching (1:1 char mapping on NFC text)
const deAccent = (s: string) => s.normalize("NFC").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function highlightMatches(el: HTMLElement, q: string): SearchMatch[] {
  const normQ = deAccent(q);
  if (!normQ) return [];

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  let idx = 0;
  nodes.forEach(node => {
    // Normalize to NFC so each accented char is 1 code point → 1:1 position mapping
    const text = (node.textContent || "").normalize("NFC");
    const normText = deAccent(text);
    if (!normText.includes(normQ)) return;

    // Build HTML by slicing original text at match positions from normalized text
    let html = "";
    let pos = 0;
    while (pos <= normText.length) {
      const matchIdx = normText.indexOf(normQ, pos);
      if (matchIdx === -1) { html += text.slice(pos); break; }
      html += text.slice(pos, matchIdx);
      html += `<mark id="match-${idx++}">${text.slice(matchIdx, matchIdx + normQ.length)}</mark>`;
      pos = matchIdx + normQ.length;
    }

    const span = document.createElement("span");
    span.innerHTML = html;
    node.parentNode?.replaceChild(span, node);
  });

  const matches: SearchMatch[] = [];
  el.querySelectorAll("mark[id^='match-']").forEach(mark => {
    const block = (mark.closest("p, li, td, h1, h2, h3, h4, h5, h6, pre") || mark.parentElement) as Element;
    const full = (block.textContent || "").trim();
    const normFull = deAccent(full);
    const pos = normFull.indexOf(normQ);
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
