// Local in-document search widget — diacritic-insensitive, separator-tolerant,
// fuzzy (Damerau-Levenshtein) matching. Ported faithfully from local-search.js.
// Imperative by nature: it builds its own widget DOM and wraps matches in
// <mark class="ld-local-mark"> within the rendered content element.

type T = (key: string) => string;

function normalizeWithMap(src: string): { normalized: string; map: number[] } {
  let normalized = "";
  const map: number[] = [];
  let lastWasSpace = true;
  for (let i = 0; i < src.length; i++) {
    const decomposed = src[i].normalize("NFD");
    for (let k = 0; k < decomposed.length; k++) {
      const code = decomposed.charCodeAt(k);
      if (code >= 0x0300 && code <= 0x036f) continue;
      const isAlnum = (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
      if (isAlnum) {
        const lower = code >= 65 && code <= 90 ? code + 32 : code;
        normalized += String.fromCharCode(lower);
        map.push(i);
        lastWasSpace = false;
      } else if (!lastWasSpace) {
        normalized += " ";
        map.push(i);
        lastWasSpace = true;
      }
    }
  }
  map.push(src.length);
  if (normalized.endsWith(" ")) {
    normalized = normalized.slice(0, -1);
    map.splice(map.length - 2, 1);
  }
  return { normalized, map };
}

function normalize(src: string): string {
  return normalizeWithMap(src).normalized;
}

function damerauLevenshtein(a: string, b: string, max: number): number {
  if (a === b) return 0;
  const alen = a.length, blen = b.length;
  if (Math.abs(alen - blen) > max) return max + 1;
  let prev2: number[] | null = null;
  let prev = new Array(blen + 1);
  let curr = new Array(blen + 1);
  for (let j = 0; j <= blen; j++) prev[j] = j;
  for (let i = 1; i <= alen; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= blen; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
        v = Math.min(v, prev2?.[j - 2] + 1);
      }
      curr[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = curr;
    curr = new Array(blen + 1);
  }
  return prev[blen];
}

function maxDistance(tokenLen: number): number {
  if (tokenLen >= 7) return 2;
  if (tokenLen >= 4) return 1;
  return 0;
}

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function regexEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function initLocalSearch(contentEl: HTMLElement, mount: HTMLElement, t: T) {
  mount.innerHTML = "";
  mount.classList.add("hidden");

  const placeholders = contentEl.querySelectorAll("[data-ld-local-search]");
  if (!placeholders.length) return;
  placeholders.forEach(el => el.remove());

  const wordIndex = (() => {
    const set = new Set<string>();
    normalize(contentEl.textContent || "").split(" ").forEach(w => { if (w.length >= 3) set.add(w); });
    return Array.from(set);
  })();

  const placeholderTxt = t("local_search.placeholder") || "Search in this document…";
  const clearTitle = t("local_search.clear") || "Clear";

  const wrapper = document.createElement("div");
  wrapper.className = "no-print mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden";
  wrapper.innerHTML = `
    <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <span class="text-gray-400 select-none" aria-hidden="true">🔎</span>
      <input type="text" id="ld-local-search-input" autocomplete="off"
        class="flex-1 bg-transparent border-0 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-0"
        placeholder="${esc(placeholderTxt)}" />
      <button type="button" id="ld-local-search-clear"
        class="hidden text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 px-1"
        title="${esc(clearTitle)}" aria-label="${esc(clearTitle)}">✕</button>
    </div>
    <div id="ld-local-search-results" class="hidden">
      <div id="ld-local-search-title" class="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800"></div>
      <ol id="ld-local-search-list" class="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 list-none m-0 p-0"></ol>
    </div>`;
  mount.appendChild(wrapper);
  mount.classList.remove("hidden");

  const input = wrapper.querySelector("#ld-local-search-input") as HTMLInputElement;
  const clearBtn = wrapper.querySelector("#ld-local-search-clear") as HTMLButtonElement;
  const results = wrapper.querySelector("#ld-local-search-results") as HTMLElement;
  const titleEl = wrapper.querySelector("#ld-local-search-title") as HTMLElement;
  const listEl = wrapper.querySelector("#ld-local-search-list") as HTMLElement;

  let timer: number | null = null;

  function clearHighlights() {
    contentEl.querySelectorAll("mark.ld-local-mark").forEach(m => {
      const parent = m.parentNode!;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
    });
    contentEl.normalize();
  }

  function findVariants(token: string, normalizedContent: string): Set<string> {
    const variants = new Set<string>();
    if (normalizedContent.includes(token)) variants.add(token);
    const maxDist = maxDistance(token.length);
    if (maxDist === 0) return variants;
    const firstChar = token[0];
    for (const word of wordIndex) {
      if (word === token) continue;
      if (Math.abs(word.length - token.length) > maxDist) continue;
      if (token.length >= 3 && word[0] !== firstChar) continue;
      if (damerauLevenshtein(token, word, maxDist) <= maxDist) variants.add(word);
    }
    return variants;
  }

  function runSearch(q: string) {
    clearHighlights();
    if (!q) {
      results.classList.add("hidden");
      clearBtn.classList.add("hidden");
      listEl.innerHTML = "";
      return;
    }
    clearBtn.classList.remove("hidden");

    const normalizedQuery = normalize(q);
    const tokens = normalizedQuery.split(" ").filter(Boolean);
    if (!tokens.length) { results.classList.add("hidden"); return; }

    const normalizedContent = normalize(contentEl.textContent || "");
    const tokenVariants = tokens.map(t2 => findVariants(t2, normalizedContent));
    if (!tokenVariants.some(s => s.size > 0)) {
      titleEl.textContent = t("local_search.no_results") || "No matches found.";
      listEl.innerHTML = "";
      results.classList.remove("hidden");
      return;
    }

    const allVariants = new Set<string>();
    tokenVariants.forEach((vs, i) => {
      vs.forEach(v => {
        const isToken = v === tokens[i];
        allVariants.add(isToken ? v : `\\b${regexEscape(v)}\\b`);
      });
    });
    const parts = Array.from(allVariants).sort((a, b) => b.length - a.length);
    const re = new RegExp(`(${parts.map(p => (p.startsWith("\\b") ? p : regexEscape(p))).join("|")})`, "g");

    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (n.parentElement?.closest("mark")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

    let matchIdx = 0;
    const blockCoverage = new Map<Element, Set<number>>();

    textNodes.forEach(node => {
      const original = node.textContent || "";
      const { normalized: norm, map } = normalizeWithMap(original);
      if (!norm) return;
      const localMatches: { start: number; end: number; term: string }[] = [];
      let m: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((m = re.exec(norm)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        localMatches.push({ start: m.index, end: m.index + m[0].length, term: m[0] });
      }
      if (!localMatches.length) return;

      const block = (node.parentElement?.closest("p, li, td, h1, h2, h3, h4, h5, h6, pre, blockquote") || node.parentElement) as Element | null;
      let out = "", cursor = 0;
      localMatches.forEach(mm => {
        const origStart = map[mm.start], origEnd = map[mm.end];
        if (origStart < cursor) return;
        out += esc(original.slice(cursor, origStart));
        out += `<mark class="ld-local-mark" id="ld-local-match-${matchIdx++}">${esc(original.slice(origStart, origEnd))}</mark>`;
        cursor = origEnd;
        if (block) {
          if (!blockCoverage.has(block)) blockCoverage.set(block, new Set());
          const cov = blockCoverage.get(block)!;
          tokenVariants.forEach((vs, ti) => { if (vs.has(mm.term)) cov.add(ti); });
        }
      });
      out += esc(original.slice(cursor));
      const span = document.createElement("span");
      span.innerHTML = out;
      node.parentNode?.replaceChild(span, node);
    });

    const totalTokens = tokens.length;
    const andBlocks: Element[] = [];
    for (const [block, cov] of blockCoverage.entries()) {
      if (cov.size === totalTokens) andBlocks.push(block);
    }

    let marksToList: HTMLElement[];
    if (andBlocks.length > 0) {
      const andBlockSet = new Set(andBlocks);
      marksToList = Array.from(contentEl.querySelectorAll("mark.ld-local-mark")).filter(mk => {
        const parentBlock = mk.closest("p, li, td, h1, h2, h3, h4, h5, h6, pre, blockquote") || mk.parentElement;
        return andBlockSet.has(parentBlock as Element);
      }) as HTMLElement[];
    } else {
      marksToList = Array.from(contentEl.querySelectorAll("mark.ld-local-mark")) as HTMLElement[];
    }

    if (!marksToList.length) {
      titleEl.textContent = t("local_search.no_results") || "No matches found.";
      listEl.innerHTML = "";
      results.classList.remove("hidden");
      return;
    }

    titleEl.textContent = (marksToList.length === 1
      ? (t("local_search.count_singular") || "{count} match")
      : (t("local_search.count_plural") || "{count} matches")
    ).replace("{count}", String(marksToList.length));

    listEl.innerHTML = marksToList.map((mk, i) => {
      const block = mk.closest("p, li, td, h1, h2, h3, h4, h5, h6, pre, blockquote") || mk.parentElement;
      const full = (block ? block.textContent || "" : mk.textContent || "").trim();
      const fullNorm = normalize(full);
      let pos = -1;
      for (const vs of tokenVariants) for (const v of vs) {
        const p = fullNorm.indexOf(v);
        if (p >= 0 && (pos < 0 || p < pos)) pos = p;
      }
      if (pos < 0) pos = fullNorm.indexOf(normalizedQuery.split(" ")[0]);
      if (pos < 0) pos = 0;
      const start = Math.max(0, pos - 40), end = Math.min(full.length, pos + 80);
      const snippet = (start > 0 ? "…" : "") + full.slice(start, end) + (end < full.length ? "…" : "");
      return `<li><button type="button" data-target="${mk.id}" class="ld-local-item w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs"><span class="text-gray-400 font-mono mr-2">${i + 1}.</span>${esc(snippet)}</button></li>`;
    }).join("");
    results.classList.remove("hidden");

    listEl.querySelectorAll(".ld-local-item").forEach(btn => {
      btn.addEventListener("click", () => scrollToLocalMatch((btn as HTMLElement).dataset.target!));
    });
  }

  function scrollToLocalMatch(id: string) {
    const mark = document.getElementById(id);
    const container = document.getElementById("home-content-area");
    if (!mark || !container) return;
    let ancestor = mark.parentElement;
    while (ancestor && ancestor !== container) {
      if (ancestor.tagName === "DETAILS" && !(ancestor as HTMLDetailsElement).open) (ancestor as HTMLDetailsElement).open = true;
      ancestor = ancestor.parentElement;
    }
    contentEl.querySelectorAll("mark.ld-local-mark.ld-local-active").forEach(m => m.classList.remove("ld-local-active"));
    mark.classList.add("ld-local-active");
    listEl.querySelectorAll(".ld-local-item").forEach(b => {
      (b as HTMLElement).classList.toggle("ld-local-item-active", (b as HTMLElement).dataset.target === id);
    });
    const stickyHeader = document.querySelector("#home-doc-view header");
    const headerHeight = stickyHeader ? stickyHeader.getBoundingClientRect().height : 0;
    const markTop = mark.getBoundingClientRect().top;
    const containerTop = container.getBoundingClientRect().top;
    const targetOffset = headerHeight + (container.clientHeight - headerHeight) / 3;
    container.scrollTop += markTop - containerTop - targetOffset;
  }

  input.addEventListener("input", () => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => runSearch(input.value.trim()), 250);
  });
  clearBtn.addEventListener("click", () => { input.value = ""; runSearch(""); input.focus(); });
  input.addEventListener("keydown", e => {
    if (e.key === "Escape") { input.value = ""; runSearch(""); input.blur(); }
  });
}
