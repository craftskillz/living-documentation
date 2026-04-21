// ── Search + result highlighting ─────────────────────────────────────────────

let searchTimer = null;

function setupSearch() {
  ["header-search", "sidebar-search"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", (e) => {
      const q = e.target.value.trim();
      // Sync the other input
      ["header-search", "sidebar-search"].forEach((oid) => {
        if (oid !== id) {
          const other = document.getElementById(oid);
          if (other) other.value = q;
        }
      });
      clearTimeout(searchTimer);
      if (!q) {
        searchQuery = "";
        searchResults = null;
        renderSidebar(allDocs);
        return;
      }
      searchQuery = q;
      // Immediate client-side filter for snappy UX
      const local = allDocs.filter(
        (d) =>
          d.title.toLowerCase().includes(q.toLowerCase()) ||
          d.category.toLowerCase().includes(q.toLowerCase()),
      );
      searchResults = local;
      renderSidebar(local);
      // Then full-text search from server
      searchTimer = setTimeout(() => doSearch(q), 350);
    });
  });
}

async function doSearch(q) {
  try {
    const results = await fetch(
      "/api/documents/search?q=" + encodeURIComponent(q),
    ).then((r) => r.json());
    if (q !== searchQuery) return;
    searchResults = results;
    renderSidebar(results);
  } catch {
    /* ignore */
  }
}

function highlightMatches(el, q) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  const re = new RegExp(
    `(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  let idx = 0;
  nodes.forEach((node) => {
    if (!node.textContent.toLowerCase().includes(q.toLowerCase())) return;
    const span = document.createElement("span");
    span.innerHTML = node.textContent.replace(
      re,
      (m) => `<mark id="match-${idx++}">${m}</mark>`,
    );
    node.parentNode.replaceChild(span, node);
  });
  // Build snippet list from inserted marks
  const matches = [];
  el.querySelectorAll("mark[id^='match-']").forEach((mark) => {
    const block =
      mark.closest("p, li, td, h1, h2, h3, h4, h5, h6, pre") ||
      mark.parentElement;
    const full = block.textContent.trim();
    const pos = full.toLowerCase().indexOf(q.toLowerCase());
    const start = Math.max(0, pos - 40);
    const end = Math.min(full.length, pos + q.length + 40);
    const snippet =
      (start > 0 ? "…" : "") +
      full.slice(start, end) +
      (end < full.length ? "…" : "");
    matches.push({ id: mark.id, snippet });
  });
  return matches;
}

function buildSearchNotice(matches, q) {
  document.getElementById("search-notice-title").textContent =
    window.t(matches.length === 1 ? 'search.notice_singular' : 'search.notice_plural')
    .replace('{count}', matches.length).replace('{query}', q);
  const list = document.getElementById("search-notice-list");
  list.innerHTML = matches
    .map(
      (m, i) =>
        `<li>
      <button onclick="scrollToMatch('${m.id}')" data-match-id="${m.id}"
        class="w-full text-left px-3 py-1.5 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
        <span class="text-yellow-600 dark:text-yellow-500 font-mono text-xs mr-2">${i + 1}.</span
        ><span class="text-xs">${esc(m.snippet)}</span>
      </button>
    </li>`,
    )
    .join("");
}

function scrollToAnchor(anchorId) {
  const container = document.getElementById("content-area");
  const target = document.getElementById(anchorId);
  if (!container || !target) return;
  const stickyHeader = document.querySelector("#doc-view header");
  const headerHeight = stickyHeader
    ? stickyHeader.getBoundingClientRect().height
    : 0;
  const targetTop = target.getBoundingClientRect().top;
  const containerTop = container.getBoundingClientRect().top;
  container.scrollTop += targetTop - containerTop - headerHeight - 8;
}

function scrollToMatch(id) {
  const mark = document.getElementById(id);
  const container = document.getElementById("content-area");
  if (!mark || !container) return;

  // Open any collapsed <details> ancestors so the match is visible
  let ancestor = mark.parentElement;
  while (ancestor && ancestor !== container) {
    if (ancestor.tagName === "DETAILS" && !ancestor.open) {
      ancestor.open = true;
    }
    ancestor = ancestor.parentElement;
  }

  // Orange on the active mark, yellow on the rest
  document
    .querySelectorAll("mark.match-active")
    .forEach((m) => m.classList.remove("match-active"));
  mark.classList.add("match-active");

  // Highlight active list item
  document.querySelectorAll("#search-notice-list button").forEach((b) => {
    b.classList.toggle("bg-orange-100", b.dataset.matchId === id);
    b.classList.toggle("dark:bg-orange-900/30", b.dataset.matchId === id);
  });

  const stickyHeader = document.querySelector("#doc-view header");
  const headerHeight = stickyHeader
    ? stickyHeader.getBoundingClientRect().height
    : 0;
  const markTop = mark.getBoundingClientRect().top;
  const containerTop = container.getBoundingClientRect().top;
  const targetOffset =
    headerHeight + (container.clientHeight - headerHeight) / 3;
  container.scrollTop += markTop - containerTop - targetOffset;
}
