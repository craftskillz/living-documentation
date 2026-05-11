// ── Local search widget ─────────────────────────────────────────────────────
// Invoked from documents.js::_wireDocContent after hljs highlighting.
// Scans the rendered content for <div data-ld-local-search>. If at least one
// is found, detaches them from the doc body and injects a live-filter widget
// into the doc header (mount point #local-search-mount).
//
// Search features (zero external dependency):
//  - diacritics stripped (NFD + combining removal) → "résumé" matches "resume"
//  - separators collapsed ( -_ + whitespace → single space) → "date-only" matches "date only"
//  - tokenized AND with OR fallback (no block matches all tokens → show any-token matches)
//  - Damerau-Levenshtein distance 1-2 (length-adaptive) on unique-word index for typos and plurals
//  - first-char + length pre-filters eliminate ~90% of candidates before Levenshtein
//  - position map (normalizedIdx → originalIdx) so highlights wrap the exact source substring

// ── Text normalization ─────────────────────────────────────────────────────

// Normalize a string for case-insensitive, diacritic-insensitive, separator-tolerant matching.
// Also builds a map[normIdx] → originalIdx, so a match found in the normalized text
// can be translated back to an exact slice of the source.
function _ldNormalizeWithMap(src) {
  let normalized = "";
  const map = [];
  let lastWasSpace = true;
  for (let i = 0; i < src.length; i++) {
    const decomposed = src[i].normalize("NFD");
    for (let k = 0; k < decomposed.length; k++) {
      const code = decomposed.charCodeAt(k);
      if (code >= 0x0300 && code <= 0x036f) continue;
      const isAlnum =
        (code >= 48 && code <= 57) ||
        (code >= 65 && code <= 90) ||
        (code >= 97 && code <= 122);
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

function _ldNormalize(src) {
  return _ldNormalizeWithMap(src).normalized;
}

// ── Damerau-Levenshtein with early exit ────────────────────────────────────
// Returns the distance if ≤ max, or `max + 1` as a sentinel "over max".
function _ldDamerauLevenshtein(a, b, max) {
  if (a === b) return 0;
  const alen = a.length;
  const blen = b.length;
  if (Math.abs(alen - blen) > max) return max + 1;
  let prev2 = null;
  let prev = new Array(blen + 1);
  let curr = new Array(blen + 1);
  for (let j = 0; j <= blen; j++) prev[j] = j;
  for (let i = 1; i <= alen; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= blen; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let v = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
      if (
        i > 1 &&
        j > 1 &&
        a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
        a.charCodeAt(i - 2) === b.charCodeAt(j - 1)
      ) {
        v = Math.min(v, prev2[j - 2] + 1);
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

// Adaptive distance: no typo tolerance for very short tokens.
function _ldMaxDistance(tokenLen) {
  if (tokenLen >= 7) return 2;
  if (tokenLen >= 4) return 1;
  return 0;
}

// ── Widget ─────────────────────────────────────────────────────────────────

function _ldLocalTr(key, fallback) {
  return (typeof window.t === "function" && window.t(key)) || fallback;
}

function _ldLocalEsc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function _ldRegexEscape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function initLocalSearch(contentEl) {
  const mount = document.getElementById("local-search-mount");
  if (!mount) return;
  mount.innerHTML = "";
  mount.classList.add("hidden");

  const placeholders = contentEl.querySelectorAll("[data-ld-local-search]");
  if (!placeholders.length) return;
  placeholders.forEach((el) => el.remove());

  // Build the unique-word index once per doc. Used only for Levenshtein variants.
  const wordIndex = (() => {
    const set = new Set();
    const normalized = _ldNormalize(contentEl.textContent);
    normalized.split(" ").forEach((w) => {
      if (w.length >= 3) set.add(w);
    });
    return Array.from(set);
  })();

  const placeholderTxt = _ldLocalTr(
    "local_search.placeholder",
    "Search in this document…",
  );
  const clearTitle = _ldLocalTr("local_search.clear", "Clear");

  const wrapper = document.createElement("div");
  wrapper.className =
    "no-print mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden";
  wrapper.innerHTML = `
    <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <span class="text-gray-400 select-none" aria-hidden="true">🔎</span>
      <input
        type="text"
        id="ld-local-search-input"
        autocomplete="off"
        class="flex-1 bg-transparent border-0 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-0"
        placeholder="${_ldLocalEsc(placeholderTxt)}"
      />
      <button
        type="button"
        id="ld-local-search-clear"
        class="hidden text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 px-1"
        title="${_ldLocalEsc(clearTitle)}"
        aria-label="${_ldLocalEsc(clearTitle)}"
      >✕</button>
    </div>
    <div id="ld-local-search-results" class="hidden">
      <div id="ld-local-search-title" class="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800"></div>
      <ol id="ld-local-search-list" class="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 list-none m-0 p-0"></ol>
    </div>
  `;
  mount.appendChild(wrapper);
  mount.classList.remove("hidden");

  const input = wrapper.querySelector("#ld-local-search-input");
  const clearBtn = wrapper.querySelector("#ld-local-search-clear");
  const results = wrapper.querySelector("#ld-local-search-results");
  const titleEl = wrapper.querySelector("#ld-local-search-title");
  const listEl = wrapper.querySelector("#ld-local-search-list");

  let timer = null;

  function clearHighlights() {
    contentEl.querySelectorAll("mark.ld-local-mark").forEach((m) => {
      const parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
    });
    contentEl.normalize();
  }

  // Given a query token, return the set of terms to highlight for that token.
  // - Always includes the token itself (substring match on normalized text).
  // - Adds Levenshtein variants (distance 1-2 depending on token length) found in wordIndex.
  function findVariants(token, normalizedContent) {
    const variants = new Set();
    if (normalizedContent.includes(token)) variants.add(token);
    const maxDist = _ldMaxDistance(token.length);
    if (maxDist === 0) return variants;
    const firstChar = token[0];
    for (const word of wordIndex) {
      if (word === token) continue;
      if (Math.abs(word.length - token.length) > maxDist) continue;
      if (token.length >= 3 && word[0] !== firstChar) continue;
      const d = _ldDamerauLevenshtein(token, word, maxDist);
      if (d <= maxDist) variants.add(word);
    }
    return variants;
  }

  function runSearch(q) {
    clearHighlights();
    if (!q) {
      results.classList.add("hidden");
      clearBtn.classList.add("hidden");
      listEl.innerHTML = "";
      return;
    }
    clearBtn.classList.remove("hidden");

    const normalizedQuery = _ldNormalize(q);
    const tokens = normalizedQuery.split(" ").filter(Boolean);
    if (!tokens.length) {
      results.classList.add("hidden");
      return;
    }

    // Pre-compute normalized content once (lightweight, reused for substring tests)
    const normalizedContent = _ldNormalize(contentEl.textContent);

    // For each token, gather the set of terms to highlight
    const tokenVariants = tokens.map((t) => findVariants(t, normalizedContent));

    // If no token has any variant, nothing to do
    const hasAny = tokenVariants.some((s) => s.size > 0);
    if (!hasAny) {
      titleEl.textContent = _ldLocalTr(
        "local_search.no_results",
        "No matches found.",
      );
      listEl.innerHTML = "";
      results.classList.remove("hidden");
      return;
    }

    // Build the highlight regex: union of all variants. Longer first to ensure
    // longest match wins. Word-boundary applied to Levenshtein variants only
    // (so we don't highlight "date" inside "updated" by way of the typo path).
    const allVariants = new Set();
    tokenVariants.forEach((vs, i) => {
      vs.forEach((v) => {
        const isToken = v === tokens[i];
        allVariants.add(isToken ? v : "\\b" + _ldRegexEscape(v) + "\\b");
      });
    });
    // Deduplicate by original string (without \b wrappers) so we don't double-match
    const parts = Array.from(allVariants).sort((a, b) => b.length - a.length);
    const re = new RegExp("(" + parts.map((p) =>
      p.startsWith("\\b") ? p : _ldRegexEscape(p),
    ).join("|") + ")", "g");

    // Walk text nodes; for each, normalize with a map, find regex matches on
    // normalized, remap to original slice, wrap with a <mark>.
    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (n.parentElement && n.parentElement.closest("mark")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    let matchIdx = 0;
    // block → Set<tokenIndex> of which query tokens matched inside that block
    const blockCoverage = new Map();

    textNodes.forEach((node) => {
      const original = node.textContent;
      const { normalized, map } = _ldNormalizeWithMap(original);
      if (!normalized) return;

      const localMatches = [];
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(normalized)) !== null) {
        if (m[0].length === 0) {
          re.lastIndex++;
          continue;
        }
        localMatches.push({
          start: m.index,
          end: m.index + m[0].length,
          term: m[0],
        });
      }
      if (!localMatches.length) return;

      // Remap and wrap
      const block =
        node.parentElement?.closest(
          "p, li, td, h1, h2, h3, h4, h5, h6, pre, blockquote",
        ) || node.parentElement;

      let out = "";
      let cursor = 0;
      localMatches.forEach((mm) => {
        const origStart = map[mm.start];
        const origEnd = map[mm.end];
        if (origStart < cursor) return; // overlap, skip
        out += _ldLocalEsc(original.slice(cursor, origStart));
        out += `<mark class="ld-local-mark" id="ld-local-match-${matchIdx++}">${_ldLocalEsc(original.slice(origStart, origEnd))}</mark>`;
        cursor = origEnd;

        if (block) {
          if (!blockCoverage.has(block)) blockCoverage.set(block, new Set());
          const cov = blockCoverage.get(block);
          tokenVariants.forEach((vs, ti) => {
            if (vs.has(mm.term)) cov.add(ti);
          });
        }
      });
      out += _ldLocalEsc(original.slice(cursor));

      const span = document.createElement("span");
      span.innerHTML = out;
      node.parentNode.replaceChild(span, node);
    });

    // AND mode: keep blocks that contain all tokens. OR fallback if none.
    const totalTokens = tokens.length;
    const andBlocks = [];
    for (const [block, cov] of blockCoverage.entries()) {
      if (cov.size === totalTokens) andBlocks.push(block);
    }

    let marksToList;
    if (andBlocks.length > 0) {
      const ordered = Array.from(
        contentEl.querySelectorAll("mark.ld-local-mark"),
      );
      const andBlockSet = new Set(andBlocks);
      marksToList = ordered.filter((mk) => {
        const parentBlock =
          mk.closest("p, li, td, h1, h2, h3, h4, h5, h6, pre, blockquote") ||
          mk.parentElement;
        return andBlockSet.has(parentBlock);
      });
    } else {
      marksToList = Array.from(
        contentEl.querySelectorAll("mark.ld-local-mark"),
      );
    }

    if (!marksToList.length) {
      titleEl.textContent = _ldLocalTr(
        "local_search.no_results",
        "No matches found.",
      );
      listEl.innerHTML = "";
      results.classList.remove("hidden");
      return;
    }

    const label =
      marksToList.length === 1
        ? _ldLocalTr("local_search.count_singular", "{count} match").replace(
            "{count}",
            marksToList.length,
          )
        : _ldLocalTr("local_search.count_plural", "{count} matches").replace(
            "{count}",
            marksToList.length,
          );
    titleEl.textContent = label;

    const qLower = normalizedQuery;
    listEl.innerHTML = marksToList
      .map((mk, i) => {
        const block =
          mk.closest(
            "p, li, td, h1, h2, h3, h4, h5, h6, pre, blockquote",
          ) || mk.parentElement;
        const full = (block ? block.textContent : mk.textContent).trim();
        const fullNorm = _ldNormalize(full);
        // Find the first variant hit for snippet centering
        let pos = -1;
        for (const vs of tokenVariants) {
          for (const v of vs) {
            const p = fullNorm.indexOf(v);
            if (p >= 0 && (pos < 0 || p < pos)) pos = p;
          }
        }
        if (pos < 0) pos = fullNorm.indexOf(qLower.split(" ")[0]);
        if (pos < 0) pos = 0;
        const start = Math.max(0, pos - 40);
        const end = Math.min(full.length, pos + 80);
        const snippet =
          (start > 0 ? "…" : "") +
          full.slice(start, end) +
          (end < full.length ? "…" : "");
        return `<li>
          <button type="button" data-target="${mk.id}"
            class="ld-local-item w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs">
            <span class="text-gray-400 font-mono mr-2">${i + 1}.</span>${_ldLocalEsc(snippet)}
          </button>
        </li>`;
      })
      .join("");
    results.classList.remove("hidden");

    listEl.querySelectorAll(".ld-local-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        scrollToLocalMatch(btn.dataset.target);
      });
    });
  }

  function scrollToLocalMatch(id) {
    const mark = document.getElementById(id);
    const container = document.getElementById("content-area");
    if (!mark || !container) return;

    let ancestor = mark.parentElement;
    while (ancestor && ancestor !== container) {
      if (ancestor.tagName === "DETAILS" && !ancestor.open) {
        ancestor.open = true;
      }
      ancestor = ancestor.parentElement;
    }

    contentEl
      .querySelectorAll("mark.ld-local-mark.ld-local-active")
      .forEach((m) => m.classList.remove("ld-local-active"));
    mark.classList.add("ld-local-active");

    listEl.querySelectorAll(".ld-local-item").forEach((b) => {
      b.classList.toggle("ld-local-item-active", b.dataset.target === id);
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

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => runSearch(input.value.trim()), 250);
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    runSearch("");
    input.focus();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      runSearch("");
      input.blur();
    }
  });
}

window.initLocalSearch = initLocalSearch;
