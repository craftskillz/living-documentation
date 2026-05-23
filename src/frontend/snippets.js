// ── Snippets modal: type switching, preview, insert, parse ──────────────────
// Depends on globals from state.js (allDocs, currentDocId, currentDocContent),
// utils.js (esc), snippet-detect.js (detectSnippetType), snippet-table.js
// (_tableData, tableInit, tableRenderGrid, buildTableMarkdown) and
// snippet-tree.js (_treeItems, treeInit, treeRenderList, buildTreeMarkdown),
// snippet-table-attributes.js (table comment helpers) and
// snippet-list-markdown.js (list Markdown helpers) and
// snippet-builders.js (Markdown builders).

let _snippetSelStart = 0;
let _snippetSelEnd = 0;
let _snippetInlineEdit = false;
let _snippetInlineInsert = false;
let _snippetInlineIndent = "";
const _SNIPPET_PANELS = [
  "heading",
  "collapsible",
  "link",
  "doc-link",
  "anchor-link",
  "anchor-doc-link",
  "ordered-list",
  "unordered-list",
  "code-block",
  "blockquote",
  "image",
  "table",
  "tree",
  "diagram",
  "colored-section",
  "colored-text",
  "emojis",
  "attachment",
];

const _SNIPPET_TYPE_TO_PANEL = {
  "heading-1": "heading",
  "heading-2": "heading",
  "heading-3": "heading",
  "heading-4": "heading",
};

function _snippetPanelForType(type) {
  return _SNIPPET_TYPE_TO_PANEL[type] || type;
}

function _snippetFillTextareaDefault(id, value) {
  const textarea = document.getElementById(id);
  if (textarea && textarea.value.trim() === "") textarea.value = value;
}

const _SNIPPET_PICKER_ICONS = {
  "heading-1": "fa-solid fa-heading",
  "heading-2": "fa-solid fa-heading",
  "heading-3": "fa-solid fa-heading",
  "heading-4": "fa-solid fa-heading",
  separator: "fa-solid fa-minus",
  collapsible: "fa-solid fa-caret-right",
  "unordered-list": "fa-solid fa-list-ul",
  "ordered-list": "fa-solid fa-list-ol",
  tree: "fa-solid fa-folder-tree",
  "colored-text": "fa-solid fa-highlighter",
  "colored-section": "fa-solid fa-fill-drip",
  blockquote: "fa-solid fa-quote-right",
  "code-block": "fa-solid fa-code",
  table: "fa-solid fa-table-cells",
  link: "fa-solid fa-link",
  "doc-link": "fa-solid fa-file-lines",
  "anchor-link": "fa-solid fa-anchor",
  "anchor-doc-link": "fa-solid fa-anchor",
  image: "fa-solid fa-image",
  diagram: "fa-solid fa-diagram-project",
  emojis: "fa-solid fa-face-smile",
  attachment: "fa-solid fa-paperclip",
  "local-search": "fa-solid fa-magnifying-glass",
};

const _SNIPPET_PICKER_CATEGORIES = [
  {
    key: "structure",
    labelKey: "snippet.picker_cat_structure",
    types: ["heading-1", "heading-2", "heading-3", "heading-4", "separator", "collapsible"],
  },
  {
    key: "lists-code-data",
    labelKey: "snippet.picker_cat_lists_code_data",
    types: ["unordered-list", "ordered-list", "tree", "code-block", "table", "diagram"],
  },
  {
    key: "rich-text",
    labelKey: "snippet.picker_cat_rich_text",
    types: ["colored-text", "colored-section", "blockquote", "emojis", "local-search"],
  },
  {
    key: "links-media",
    labelKey: "snippet.picker_cat_links_media",
    types: ["link", "doc-link", "anchor-link", "anchor-doc-link", "image", "attachment"],
  },
];

const _SNIPPET_PICKER_PALETTE = {
  blueLight: {
    card:
      "border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 hover:border-sky-300 dark:hover:border-sky-700",
    icon: "text-sky-700 dark:text-sky-300",
  },
  blue: {
    card:
      "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700",
    icon: "text-blue-700 dark:text-blue-300",
  },
  blueDark: {
    card:
      "border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-700",
    icon: "text-indigo-700 dark:text-indigo-300",
  },
  blueDarker: {
    card:
      "border-blue-300 dark:border-blue-700 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800/60 hover:border-blue-400 dark:hover:border-blue-600",
    icon: "text-blue-900 dark:text-blue-100",
  },
  gray: {
    card:
      "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
    icon: "text-gray-700 dark:text-gray-200",
  },
  violet: {
    card:
      "border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 hover:border-violet-300 dark:hover:border-violet-700",
    icon: "text-violet-700 dark:text-violet-300",
  },
  green: {
    card:
      "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700",
    icon: "text-emerald-700 dark:text-emerald-300",
  },
  greenDark: {
    card:
      "border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-900/50 hover:bg-green-200 dark:hover:bg-green-800/60 hover:border-green-400 dark:hover:border-green-600",
    icon: "text-green-900 dark:text-green-100",
  },
  teal: {
    card:
      "border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 hover:border-teal-300 dark:hover:border-teal-700",
    icon: "text-teal-700 dark:text-teal-300",
  },
  dark: {
    card:
      "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500",
    icon: "text-slate-900 dark:text-slate-100",
  },
  orange: {
    card:
      "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 hover:border-orange-300 dark:hover:border-orange-700",
    icon: "text-orange-700 dark:text-orange-300",
  },
  orangeLight: {
    card:
      "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:border-amber-300 dark:hover:border-amber-700",
    icon: "text-amber-700 dark:text-amber-300",
  },
  orangeDark: {
    card:
      "border-orange-300 dark:border-orange-700 bg-orange-100 dark:bg-orange-900/50 hover:bg-orange-200 dark:hover:bg-orange-800/60 hover:border-orange-400 dark:hover:border-orange-600",
    icon: "text-orange-900 dark:text-orange-100",
  },
  red: {
    card:
      "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 hover:border-red-300 dark:hover:border-red-700",
    icon: "text-red-700 dark:text-red-300",
  },
  pink: {
    card:
      "border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/40 hover:bg-pink-100 dark:hover:bg-pink-900/50 hover:border-pink-300 dark:hover:border-pink-700",
    icon: "text-pink-700 dark:text-pink-300",
  },
  amber: {
    card:
      "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:border-amber-300 dark:hover:border-amber-700",
    icon: "text-amber-700 dark:text-amber-300",
  },
  yellow: {
    card:
      "border-yellow-300 dark:border-yellow-700 bg-yellow-100 dark:bg-yellow-900/50 hover:bg-yellow-200 dark:hover:bg-yellow-800/60 hover:border-yellow-400 dark:hover:border-yellow-600",
    icon: "text-yellow-700 dark:text-yellow-200",
  },
  indigo: {
    card:
      "border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-700",
    icon: "text-indigo-700 dark:text-indigo-300",
  },
  cyan: {
    card:
      "border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 hover:border-cyan-300 dark:hover:border-cyan-700",
    icon: "text-cyan-700 dark:text-cyan-300",
  },
};

const _SNIPPET_PICKER_TYPE_PALETTE = {
  "heading-1": "blueLight",
  "heading-2": "blue",
  "heading-3": "blueDark",
  "heading-4": "blueDarker",
  separator: "gray",
  collapsible: "dark",
  "unordered-list": "green",
  "ordered-list": "greenDark",
  tree: "cyan",
  "code-block": "dark",
  table: "orange",
  diagram: "red",
  "colored-text": "pink",
  "colored-section": "violet",
  blockquote: "gray",
  link: "orangeLight",
  "doc-link": "orange",
  "anchor-link": "orangeDark",
  "anchor-doc-link": "orangeDark",
  image: "amber",
  attachment: "orange",
  emojis: "yellow",
  "local-search": "cyan",
};

const _SNIPPET_TYPE_I18N_KEY = {
  "heading-1": "snippet.heading_1",
  "heading-2": "snippet.heading_2",
  "heading-3": "snippet.heading_3",
  "heading-4": "snippet.heading_4",
  separator: "snippet.separator",
  collapsible: "snippet.collapsible",
  "unordered-list": "snippet.bullet_list",
  "ordered-list": "snippet.numbered_list",
  tree: "snippet.tree",
  "colored-text": "snippet.colored_text",
  "colored-section": "snippet.colored_section",
  blockquote: "snippet.blockquote",
  "code-block": "snippet.code_block",
  table: "snippet.table",
  link: "snippet.link",
  "doc-link": "snippet.link_doc",
  "anchor-link": "snippet.link_anchor",
  "anchor-doc-link": "snippet.link_doc_anchor",
  image: "snippet.image",
  diagram: "snippet.diagram",
  emojis: "snippet.emojis",
  attachment: "snippet.attachment",
  "local-search": "snippet.local_search",
};

function _snippetPickerCleanLabel(raw) {
  if (!raw) return "";
  const parts = raw.split(/\s+/);
  if (parts.length > 1 && !/^[\p{L}\p{N}]/u.test(parts[0])) {
    return parts.slice(1).join(" ");
  }
  return raw;
}

function _snippetPickerLabel(type) {
  const key = _SNIPPET_TYPE_I18N_KEY[type];
  const raw = key ? window.t(key) : type;
  return _snippetPickerCleanLabel(raw);
}

function _renderSnippetPicker() {
  const container = document.getElementById("snippet-picker-categories");
  if (!container) return;
  container.innerHTML = "";
  for (const cat of _SNIPPET_PICKER_CATEGORIES) {
    const section = document.createElement("section");
    section.dataset.snippetCategory = cat.key;
    section.className = "space-y-2";

    const h3 = document.createElement("h3");
    h3.className =
      "text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";
    h3.textContent = window.t(cat.labelKey);
    section.appendChild(h3);

    const grid = document.createElement("div");
    grid.className =
      "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-2";

    for (const type of cat.types) {
      const paletteName = _SNIPPET_PICKER_TYPE_PALETTE[type] || "indigo";
      const colorClasses =
        _SNIPPET_PICKER_PALETTE[paletteName] ||
        _SNIPPET_PICKER_PALETTE.indigo;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.snippetType = type;
      btn.className =
        "snippet-card min-h-[76px] flex flex-col items-center justify-center gap-2 p-2 rounded-lg border text-gray-800 dark:text-gray-100 transition-colors " +
        colorClasses.card;
      btn.onclick = () => snippetPickerSelect(type);

      const i = document.createElement("i");
      i.className =
        (_SNIPPET_PICKER_ICONS[type] || "fa-solid fa-puzzle-piece") +
        " text-xl " +
        colorClasses.icon;
      i.setAttribute("aria-hidden", "true");
      btn.appendChild(i);

      const label = document.createElement("span");
      label.className = "text-xs font-medium text-center leading-tight";
      label.textContent = _snippetPickerLabel(type);
      btn.appendChild(label);

      grid.appendChild(btn);
    }
    section.appendChild(grid);
    container.appendChild(section);
  }
}

function _showSnippetPicker() {
  _renderSnippetPicker();
  document.getElementById("snippet-picker").classList.remove("hidden");
  document.getElementById("snippet-picker-back").classList.add("hidden");
  document.getElementById("snippet-submit-btn").classList.add("hidden");
  _SNIPPET_PANELS.forEach((p) => {
    const panel = document.getElementById("snip-panel-" + p);
    if (panel) panel.classList.add("hidden");
  });
  const previewWrap = document.getElementById("snippet-preview-wrap");
  if (previewWrap) previewWrap.classList.add("hidden");
  const search = document.getElementById("snippet-picker-search");
  if (search) {
    search.value = "";
    _snippetPickerFilter("");
    setTimeout(() => search.focus(), 50);
  }
}

function _showSnippetPanelOnly() {
  document.getElementById("snippet-picker").classList.add("hidden");
  document.getElementById("snippet-submit-btn").classList.remove("hidden");
  const back = document.getElementById("snippet-picker-back");
  if (back) back.classList.toggle("hidden", _snippetInlineEdit);
}

function _snippetPickerFilter(query) {
  const container = document.getElementById("snippet-picker-categories");
  if (!container) return;
  const q = (query || "").toLowerCase().trim();
  let totalVisible = 0;
  container.querySelectorAll("[data-snippet-category]").forEach((section) => {
    let visibleCount = 0;
    section.querySelectorAll("[data-snippet-type]").forEach((card) => {
      const label = (card.querySelector("span")?.textContent || "").toLowerCase();
      const match = !q || label.includes(q);
      card.classList.toggle("hidden", !match);
      if (match) visibleCount += 1;
    });
    section.classList.toggle("hidden", visibleCount === 0);
    totalVisible += visibleCount;
  });
  const noResults = document.getElementById("snippet-picker-no-results");
  if (noResults) noResults.classList.toggle("hidden", totalVisible > 0);
}

function snippetPickerSearchChanged() {
  const input = document.getElementById("snippet-picker-search");
  _snippetPickerFilter(input ? input.value : "");
}

function snippetPickerSearchKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    const firstVisible = document.querySelector(
      "#snippet-picker-categories [data-snippet-type]:not(.hidden)",
    );
    if (firstVisible) snippetPickerSelect(firstVisible.dataset.snippetType);
  }
}

function snippetPickerSelect(type) {
  document.getElementById("snippet-type").value = type;
  snippetTypeChanged();
  _showSnippetPanelOnly();
}

function snippetPickerBack() {
  const msgEl = document.getElementById("snippet-detect-msg");
  if (msgEl) msgEl.classList.add("hidden");
  _showSnippetPicker();
}

// Each emoji has search tags (bilingual FR/EN, space-separated, lowercase).
// Filter matches a 2+ char query against any tag prefix or substring.
const _EMOJI_CATEGORIES = [
  { label: 'snippet.emoji_cat_smileys', emojis: [
    { e: '😀', t: 'grin grinning smile sourire happy heureux' },
    { e: '😃', t: 'smiley joy joie sourire happy' },
    { e: '😄', t: 'smile sourire happy heureux joie' },
    { e: '😁', t: 'beaming grin sourire dents' },
    { e: '😆', t: 'laugh rire lol' },
    { e: '😅', t: 'sweat transpire rire nerveux' },
    { e: '🤣', t: 'rofl lol mdr rire' },
    { e: '😂', t: 'joy larmes tears rire lol' },
    { e: '🙂', t: 'slight smile sourire' },
    { e: '🙃', t: 'upside renverse inverse' },
    { e: '😉', t: 'wink clin oeil' },
    { e: '😊', t: 'blush rougir sourire' },
    { e: '😇', t: 'angel ange halo innocent' },
    { e: '🥰', t: 'love amour coeur heart smile' },
    { e: '😍', t: 'heart eyes amoureux love amour' },
    { e: '🤩', t: 'star stars etoile wow' },
    { e: '😘', t: 'kiss bisou' },
    { e: '😋', t: 'yum miam savoureux langue' },
    { e: '😛', t: 'tongue langue' },
    { e: '😜', t: 'wink tongue langue clin' },
    { e: '🤪', t: 'crazy fou zany' },
    { e: '😝', t: 'tongue langue squinting' },
    { e: '🤗', t: 'hug calin embrasser' },
    { e: '🤔', t: 'think reflexion reflechir pense' },
    { e: '🤨', t: 'raised brow sourcil suspicious' },
    { e: '😐', t: 'neutral neutre' },
    { e: '😑', t: 'expressionless impassible' },
    { e: '😒', t: 'unamused decu blase' },
    { e: '🙄', t: 'roll eyes yeux ciel' },
    { e: '😬', t: 'grimace' },
    { e: '😌', t: 'relieved soulage' },
    { e: '😔', t: 'pensive pensif triste sad' },
    { e: '😪', t: 'sleepy sommeil fatigue' },
    { e: '😴', t: 'sleep dormir zzz' },
    { e: '🤤', t: 'drool bave' },
    { e: '😷', t: 'mask masque malade' },
    { e: '🤒', t: 'sick malade fever fievre' },
    { e: '🤕', t: 'hurt blesse bandage' },
    { e: '🤢', t: 'nausea nausee' },
    { e: '🤮', t: 'vomit vomir malade' },
    { e: '🤧', t: 'sneeze eternue rhume' },
    { e: '🥵', t: 'hot chaud transpire' },
    { e: '🥶', t: 'cold froid gele' },
    { e: '🥴', t: 'woozy ivre' },
    { e: '😵', t: 'dizzy dead mort vertige' },
    { e: '🤯', t: 'explode tete mind blown' },
    { e: '🤠', t: 'cowboy chapeau' },
    { e: '🥳', t: 'party fete anniversaire birthday' },
    { e: '😎', t: 'cool sunglasses lunettes' },
    { e: '🤓', t: 'nerd geek' },
    { e: '🧐', t: 'monocle curious' },
    { e: '😕', t: 'confused confus' },
    { e: '😟', t: 'worried inquiet' },
    { e: '🙁', t: 'frown triste' },
    { e: '☹️', t: 'sad triste frown' },
    { e: '😮', t: 'surprised surpris open mouth' },
    { e: '😯', t: 'hushed' },
    { e: '😲', t: 'astonished etonne' },
    { e: '😳', t: 'flushed gene rougeur' },
    { e: '🥺', t: 'pleading supplier chien' },
    { e: '😦', t: 'frown open mouth' },
    { e: '😧', t: 'anguish angoisse' },
    { e: '😨', t: 'fear peur' },
    { e: '😰', t: 'anxious anxieux stress' },
    { e: '😥', t: 'sad disappointed decu' },
    { e: '😢', t: 'cry pleurer larme' },
    { e: '😭', t: 'cry pleurer loud bawling' },
    { e: '😱', t: 'scream cri peur horror' },
    { e: '😖', t: 'confounded' },
    { e: '😣', t: 'persevere effort' },
    { e: '😞', t: 'disappointed decu' },
    { e: '😓', t: 'sweat transpire fatigue' },
    { e: '😩', t: 'weary fatigue las' },
    { e: '😫', t: 'tired fatigue' },
    { e: '🥱', t: 'yawn baille' },
    { e: '😤', t: 'triumph huff vapeur nez' },
    { e: '😠', t: 'angry colere fache' },
    { e: '😡', t: 'rage colere rouge' },
    { e: '🤬', t: 'curse insulte jure' },
    { e: '😈', t: 'devil diable smiling' },
    { e: '👿', t: 'imp diable' },
    { e: '💀', t: 'skull mort death crane' },
    { e: '☠️', t: 'crossbones pirate mort death' },
    { e: '💩', t: 'poop caca merde' },
    { e: '🤡', t: 'clown' },
    { e: '👻', t: 'ghost fantome' },
    { e: '👽', t: 'alien extraterrestre' },
    { e: '🤖', t: 'robot ia ai' },
    { e: '🎃', t: 'pumpkin halloween citrouille' },
    { e: '😺', t: 'cat chat' },
    { e: '😸', t: 'cat chat grin' },
    { e: '😹', t: 'cat chat joy' },
    { e: '😻', t: 'cat chat love amour heart' },
    { e: '😼', t: 'cat chat wry' },
    { e: '😽', t: 'cat chat kiss' },
    { e: '🙀', t: 'cat chat fear peur' },
    { e: '😿', t: 'cat chat cry pleurer' },
    { e: '😾', t: 'cat chat angry colere' },
  ]},
  { label: 'snippet.emoji_cat_gestures', emojis: [
    { e: '👍', t: 'thumbs up pouce ok bien like' },
    { e: '👎', t: 'thumbs down pouce bas dislike' },
    { e: '👌', t: 'ok parfait' },
    { e: '✌️', t: 'victory victoire peace paix' },
    { e: '🤞', t: 'fingers crossed doigts croises' },
    { e: '🤟', t: 'love you' },
    { e: '🤘', t: 'rock horns metal cornes' },
    { e: '🤙', t: 'call appelle hang loose' },
    { e: '👈', t: 'left gauche pointing' },
    { e: '👉', t: 'right droite pointing' },
    { e: '👆', t: 'up haut pointing' },
    { e: '👇', t: 'down bas pointing' },
    { e: '☝️', t: 'one index up haut' },
    { e: '✋', t: 'stop hand main raised' },
    { e: '🤚', t: 'back hand main' },
    { e: '🖐️', t: 'hand main splayed' },
    { e: '🖖', t: 'vulcan spock star trek' },
    { e: '👋', t: 'wave bonjour hello salut goodbye' },
    { e: '🤝', t: 'handshake accord deal poignee' },
    { e: '🙏', t: 'pray priere merci thanks please' },
    { e: '💪', t: 'muscle fort biceps strong' },
    { e: '🦾', t: 'mechanical arm bras prothese' },
    { e: '👏', t: 'clap applaud bravo applaudir' },
    { e: '🙌', t: 'raise hands hourra celebrate' },
    { e: '👐', t: 'open hands' },
    { e: '🤲', t: 'palms up paumes' },
    { e: '🤜', t: 'fist poing right' },
    { e: '🤛', t: 'fist poing left' },
    { e: '✊', t: 'fist poing leve' },
    { e: '👊', t: 'fist punch poing frapper' },
    { e: '🤏', t: 'pinch petit small' },
    { e: '🤌', t: 'italian pinched' },
    { e: '🖕', t: 'middle finger doigt honneur' },
    { e: '✍️', t: 'write ecrire hand main' },
    { e: '🦶', t: 'foot pied' },
    { e: '🦵', t: 'leg jambe' },
    { e: '👂', t: 'ear oreille' },
    { e: '🦻', t: 'ear hearing appareil auditif' },
    { e: '👃', t: 'nose nez' },
    { e: '🧠', t: 'brain cerveau mind' },
    { e: '👀', t: 'eyes yeux regarder' },
    { e: '👁️', t: 'eye oeil' },
    { e: '👄', t: 'mouth bouche' },
    { e: '👅', t: 'tongue langue' },
    { e: '🦷', t: 'tooth dent' },
    { e: '🫀', t: 'heart anatomic coeur organe' },
    { e: '🫁', t: 'lungs poumons' },
  ]},
  { label: 'snippet.emoji_cat_hearts', emojis: [
    { e: '❤️', t: 'heart coeur red rouge love amour' },
    { e: '🧡', t: 'orange heart coeur' },
    { e: '💛', t: 'yellow heart coeur jaune' },
    { e: '💚', t: 'green heart coeur vert' },
    { e: '💙', t: 'blue heart coeur bleu' },
    { e: '💜', t: 'purple heart coeur violet' },
    { e: '🖤', t: 'black heart coeur noir' },
    { e: '🤍', t: 'white heart coeur blanc' },
    { e: '🤎', t: 'brown heart coeur marron' },
    { e: '💔', t: 'broken heart coeur brise rupture' },
    { e: '❤️‍🔥', t: 'heart fire feu passion' },
    { e: '❤️‍🩹', t: 'heart mending coeur reparation' },
    { e: '💖', t: 'sparkling heart coeur brillant' },
    { e: '💕', t: 'two hearts coeurs' },
    { e: '💘', t: 'arrow heart cupid cupidon' },
    { e: '💝', t: 'ribbon heart cadeau' },
    { e: '💞', t: 'revolving hearts coeurs' },
    { e: '💟', t: 'heart decoration' },
    { e: '💌', t: 'love letter lettre enveloppe' },
    { e: '💋', t: 'kiss mark bisou levres' },
    { e: '❣️', t: 'heart exclamation' },
    { e: '💯', t: 'hundred 100 cent perfect parfait' },
    { e: '✨', t: 'sparkles etincelles magic magique brillant' },
    { e: '⭐', t: 'star etoile' },
    { e: '🌟', t: 'glowing star etoile' },
    { e: '💫', t: 'dizzy star vertige etoile' },
    { e: '🔥', t: 'fire feu hot flamme' },
    { e: '💥', t: 'boom explosion collision' },
    { e: '⚡', t: 'lightning eclair thunder tonnerre fast' },
    { e: '💢', t: 'anger colere symbol' },
    { e: '💨', t: 'dash vent wind fast vitesse' },
    { e: '💦', t: 'drops gouttes sweat eau' },
    { e: '💤', t: 'zzz sleep dormir sommeil' },
    { e: '🕳️', t: 'hole trou' },
    { e: '💭', t: 'thought pensee bulle' },
    { e: '🗯️', t: 'right anger bubble' },
    { e: '💬', t: 'speech bulle dialogue chat' },
  ]},
  { label: 'snippet.emoji_cat_objects', emojis: [
    { e: '💻', t: 'laptop ordinateur computer portable' },
    { e: '🖥️', t: 'desktop computer ordinateur bureau' },
    { e: '⌨️', t: 'keyboard clavier' },
    { e: '🖱️', t: 'mouse souris' },
    { e: '💾', t: 'floppy disquette save sauvegarder' },
    { e: '💿', t: 'disk cd optical' },
    { e: '📀', t: 'dvd' },
    { e: '📱', t: 'phone mobile telephone smartphone' },
    { e: '📲', t: 'phone call mobile incoming' },
    { e: '☎️', t: 'telephone vintage' },
    { e: '📞', t: 'receiver combine phone' },
    { e: '📟', t: 'pager' },
    { e: '📠', t: 'fax' },
    { e: '🔋', t: 'battery batterie pile' },
    { e: '🔌', t: 'plug prise electrique' },
    { e: '💡', t: 'bulb idee idea light lumiere ampoule' },
    { e: '🔦', t: 'flashlight torche lampe' },
    { e: '🕯️', t: 'candle bougie' },
    { e: '📷', t: 'camera appareil photo' },
    { e: '📸', t: 'camera flash photo' },
    { e: '📹', t: 'video camera' },
    { e: '🎥', t: 'movie film cinema camera' },
    { e: '🎞️', t: 'film reel pellicule' },
    { e: '📽️', t: 'projector projecteur' },
    { e: '⏰', t: 'alarm reveil clock horloge' },
    { e: '⏱️', t: 'stopwatch chrono chronometre' },
    { e: '⏲️', t: 'timer minuteur' },
    { e: '🕰️', t: 'mantel clock horloge' },
    { e: '⌛', t: 'hourglass sablier done' },
    { e: '⏳', t: 'hourglass sablier flow running' },
    { e: '📡', t: 'satellite antenne' },
    { e: '🔭', t: 'telescope astronomie' },
    { e: '🔬', t: 'microscope science' },
    { e: '💊', t: 'pill pilule medicine medicament' },
    { e: '💉', t: 'syringe seringue injection vaccin' },
    { e: '🩹', t: 'bandage pansement' },
    { e: '🩺', t: 'stethoscope medecin' },
    { e: '🧪', t: 'tube eprouvette chimie chemistry' },
    { e: '🧬', t: 'dna adn gene' },
    { e: '🔍', t: 'search magnify loupe rechercher find left' },
    { e: '🔎', t: 'search magnify loupe rechercher find right' },
    { e: '🗝️', t: 'key cle old' },
    { e: '🔑', t: 'key cle' },
    { e: '🔐', t: 'lock key cle cadenas' },
    { e: '🔒', t: 'lock cadenas verrouille secure' },
    { e: '🔓', t: 'unlock cadenas ouvert' },
    { e: '🛡️', t: 'shield bouclier protection' },
    { e: '🔨', t: 'hammer marteau' },
    { e: '⚒️', t: 'tools outils hammer pick' },
    { e: '🛠️', t: 'tools outils hammer wrench' },
    { e: '🔧', t: 'wrench cle anglaise' },
    { e: '🔩', t: 'nut bolt ecrou' },
    { e: '⚙️', t: 'gear settings parametres engrenage config' },
    { e: '🪛', t: 'screwdriver tournevis' },
    { e: '🪝', t: 'hook crochet' },
    { e: '🧰', t: 'toolbox caisse outils' },
    { e: '🧲', t: 'magnet aimant' },
    { e: '🧱', t: 'brick brique' },
    { e: '⛏️', t: 'pick pioche' },
    { e: '🪓', t: 'axe hache' },
  ]},
  { label: 'snippet.emoji_cat_office', emojis: [
    { e: '📝', t: 'memo note ecrire write' },
    { e: '✏️', t: 'pencil crayon' },
    { e: '🖊️', t: 'pen stylo bille' },
    { e: '🖋️', t: 'fountain pen stylo plume' },
    { e: '🖌️', t: 'paintbrush pinceau' },
    { e: '🖍️', t: 'crayon feutre' },
    { e: '📐', t: 'triangle ruler equerre' },
    { e: '📏', t: 'ruler regle' },
    { e: '📎', t: 'paperclip trombone attach' },
    { e: '🖇️', t: 'linked paperclips trombones' },
    { e: '📌', t: 'pushpin punaise' },
    { e: '📍', t: 'pin location lieu' },
    { e: '✂️', t: 'scissors ciseaux cut couper' },
    { e: '🗂️', t: 'card index dividers onglets' },
    { e: '📁', t: 'folder dossier' },
    { e: '📂', t: 'open folder dossier ouvert' },
    { e: '🗃️', t: 'card box boite fiches' },
    { e: '🗄️', t: 'file cabinet archive armoire' },
    { e: '📋', t: 'clipboard presse papier' },
    { e: '📃', t: 'page curl document' },
    { e: '📄', t: 'document page' },
    { e: '📜', t: 'scroll parchemin' },
    { e: '📰', t: 'newspaper journal presse' },
    { e: '🗞️', t: 'rolled newspaper journal' },
    { e: '📓', t: 'notebook carnet cahier' },
    { e: '📔', t: 'notebook decorated carnet' },
    { e: '📒', t: 'ledger registre' },
    { e: '📕', t: 'book rouge red ferme' },
    { e: '📗', t: 'book vert green' },
    { e: '📘', t: 'book bleu blue' },
    { e: '📙', t: 'book orange' },
    { e: '📚', t: 'books livres bibliotheque' },
    { e: '📖', t: 'open book livre ouvert' },
    { e: '🔖', t: 'bookmark marque page signet' },
    { e: '🏷️', t: 'label tag etiquette' },
    { e: '💼', t: 'briefcase mallette attache case business' },
    { e: '🗒️', t: 'spiral note notepad' },
    { e: '🗓️', t: 'spiral calendar calendrier' },
    { e: '📅', t: 'calendar calendrier date' },
    { e: '📆', t: 'tear off calendar calendrier' },
    { e: '🗑️', t: 'trash poubelle delete supprimer can' },
    { e: '🪣', t: 'bucket seau' },
    { e: '📦', t: 'package colis box boite' },
    { e: '📫', t: 'mailbox boite lettres closed flag up' },
    { e: '📪', t: 'mailbox boite lettres closed flag down' },
    { e: '📬', t: 'mailbox open boite lettres flag up' },
    { e: '📭', t: 'mailbox open boite lettres flag down' },
    { e: '📮', t: 'postbox boite aux lettres' },
    { e: '✉️', t: 'envelope enveloppe' },
    { e: '📧', t: 'email courriel mail at' },
    { e: '📨', t: 'email incoming recu' },
    { e: '📩', t: 'email arrow envoi' },
    { e: '📤', t: 'outbox envoyer sent' },
    { e: '📥', t: 'inbox recevoir' },
    { e: '📊', t: 'bar chart graphique barres histogramme' },
    { e: '📈', t: 'chart up tendance hausse croissance' },
    { e: '📉', t: 'chart down baisse decroissance' },
  ]},
  { label: 'snippet.emoji_cat_symbols', emojis: [
    { e: '🆕', t: 'new nouveau nouvelle brand fresh neuf' },
    { e: '♻️', t: 'existing existant existante recycle recycler reuse reutiliser' },
    { e: '✅', t: 'check ok valide coche green' },
    { e: '☑️', t: 'check ballot case' },
    { e: '✔️', t: 'check coche mark' },
    { e: '❌', t: 'cross error erreur red rouge croix ko' },
    { e: '✖️', t: 'multiply multiplier cross' },
    { e: '❎', t: 'cross square button' },
    { e: '⚠️', t: 'warning attention danger' },
    { e: 'ℹ️', t: 'info information' },
    { e: '❓', t: 'question red interrogation' },
    { e: '❔', t: 'question white interrogation' },
    { e: '❗', t: 'exclamation important red' },
    { e: '❕', t: 'exclamation white' },
    { e: '‼️', t: 'double exclamation' },
    { e: '⁉️', t: 'exclamation question' },
    { e: '🚀', t: 'rocket fusee launch lancer' },
    { e: '🎉', t: 'party popper tada fete celebration' },
    { e: '🎊', t: 'confetti ball fete' },
    { e: '🏆', t: 'trophy trophee winner' },
    { e: '🥇', t: 'gold medal medaille or first' },
    { e: '🥈', t: 'silver medal medaille argent second' },
    { e: '🥉', t: 'bronze medal medaille third' },
    { e: '🏅', t: 'medal medaille sports' },
    { e: '🎖️', t: 'military medal medaille' },
    { e: '🎯', t: 'target cible dart' },
    { e: '🎁', t: 'gift cadeau present' },
    { e: '🔔', t: 'bell cloche notify notification' },
    { e: '🔕', t: 'bell off muted silence' },
    { e: '📢', t: 'loudspeaker annonce public' },
    { e: '📣', t: 'megaphone porte voix' },
    { e: '📯', t: 'postal horn cor' },
    { e: '➕', t: 'plus add heavy' },
    { e: '➖', t: 'minus moins heavy' },
    { e: '➗', t: 'divide division' },
    { e: '♾️', t: 'infinity infini' },
    { e: '💲', t: 'dollar sign dollars money argent' },
    { e: '💱', t: 'currency exchange change devise' },
    { e: '©️', t: 'copyright' },
    { e: '®️', t: 'registered' },
    { e: '™️', t: 'trademark marque' },
    { e: '↔️', t: 'left right arrow fleche horizontal' },
    { e: '↕️', t: 'up down arrow fleche vertical' },
    { e: '↖️', t: 'up left arrow fleche' },
    { e: '↗️', t: 'up right arrow fleche' },
    { e: '↘️', t: 'down right arrow fleche' },
    { e: '↙️', t: 'down left arrow fleche' },
    { e: '⬅️', t: 'left arrow fleche gauche' },
    { e: '➡️', t: 'right arrow fleche droite' },
    { e: '⬆️', t: 'up arrow fleche haut' },
    { e: '⬇️', t: 'down arrow fleche bas' },
    { e: '🔃', t: 'clockwise vertical arrows' },
    { e: '🔄', t: 'counterclockwise arrows reload refresh recharger' },
    { e: '🔁', t: 'repeat loop boucle' },
    { e: '🔂', t: 'repeat single once' },
    { e: '🔀', t: 'shuffle melange random' },
    { e: '🔼', t: 'up button triangle' },
    { e: '🔽', t: 'down button triangle' },
    { e: '⏫', t: 'fast up double triangle' },
    { e: '⏬', t: 'fast down double triangle' },
    { e: '⏪', t: 'rewind back' },
    { e: '⏩', t: 'fast forward avance' },
    { e: '⏭️', t: 'next track suivant' },
    { e: '⏮️', t: 'previous track precedent' },
    { e: '⏯️', t: 'play pause' },
    { e: '▶️', t: 'play lecture' },
    { e: '⏸️', t: 'pause' },
    { e: '⏹️', t: 'stop' },
    { e: '⏺️', t: 'record enregistrer' },
    { e: '⏏️', t: 'eject ejecter' },
    { e: '🎵', t: 'music note musique' },
    { e: '🎶', t: 'music notes musique' },
    { e: '🔈', t: 'speaker low bas' },
    { e: '🔉', t: 'speaker medium moyen' },
    { e: '🔊', t: 'speaker loud fort haut son sound' },
    { e: '🔇', t: 'muted mute silence' },
    { e: '📶', t: 'signal antenne bars' },
    { e: '🛜', t: 'wireless wifi' },
    { e: '🔗', t: 'link lien chain' },
    { e: '⛓️', t: 'chains chaine' },
    { e: '🏁', t: 'finish flag checkered fin arrivee' },
    { e: '🚩', t: 'flag drapeau triangular' },
    { e: '🏳️', t: 'white flag drapeau blanc' },
    { e: '🏴', t: 'black flag drapeau noir' },
    { e: '🏳️‍🌈', t: 'rainbow lgbt pride drapeau arc en ciel' },
    { e: '🏳️‍⚧️', t: 'trans drapeau transgender' },
    { e: '🏴‍☠️', t: 'pirate drapeau jolly roger' },
  ]},
];

let _emojiGridWired = false;

function _emojiBtnHtml(item) {
  return `<button type="button" data-emoji="${item.e}" title="${item.t.split(' ').slice(0, 3).join(', ')}" class="emoji-btn w-7 h-7 text-lg rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center">${item.e}</button>`;
}

function _renderEmojiCategories() {
  return _EMOJI_CATEGORIES.map((cat) => `
    <div>
      <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 px-1">${window.t(cat.label)}</div>
      <div class="flex flex-wrap gap-1">
        ${cat.emojis.map(_emojiBtnHtml).join('')}
      </div>
    </div>
  `).join('');
}

function _renderEmojiSearch(query) {
  const q = query.toLowerCase().trim();
  const matches = [];
  for (const cat of _EMOJI_CATEGORIES) {
    for (const item of cat.emojis) {
      if (item.t.includes(q) || item.e === query) matches.push(item);
    }
  }
  if (matches.length === 0) {
    return `<div class="text-xs text-gray-400 dark:text-gray-600 px-1 py-2">${window.t('snippet.emoji_no_results')}</div>`;
  }
  return `<div class="flex flex-wrap gap-1">${matches.map(_emojiBtnHtml).join('')}</div>`;
}

function emojiInit() {
  const grid = document.getElementById('snip-emoji-grid');
  if (!grid) return;
  grid.innerHTML = _renderEmojiCategories();

  if (!_emojiGridWired) {
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.emoji-btn');
      if (btn && btn.dataset.emoji) emojiAppend(btn.dataset.emoji);
    });
    const searchInput = document.getElementById('snip-emoji-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => emojiFilter(e.target.value));
    }
    _emojiGridWired = true;
  }

  const searchInput = document.getElementById('snip-emoji-search');
  if (searchInput) searchInput.value = '';
  snippetUpdatePreview();
}

function emojiFilter(query) {
  const grid = document.getElementById('snip-emoji-grid');
  if (!grid) return;
  const q = (query || '').trim();
  grid.innerHTML = q.length < 2 ? _renderEmojiCategories() : _renderEmojiSearch(q);
}

function emojiAppend(emoji) {
  const input = document.getElementById('snip-emoji-string');
  if (!input) return;
  input.value += emoji;
  snippetUpdatePreview();
}

function emojiClear() {
  const input = document.getElementById('snip-emoji-string');
  if (!input) return;
  input.value = '';
  snippetUpdatePreview();
}

const _COLOR_SWATCHES = {
  info:    { bg: "#eff6ff", border: "#3b82f6", text: "#1e3a5f" },
  success: { bg: "#f0fdf4", border: "#22c55e", text: "#14532d" },
  warning: { bg: "#fffbeb", border: "#f59e0b", text: "#451a03" },
  danger:  { bg: "#fef2f2", border: "#ef4444", text: "#450a0a" },
  note:    { bg: "#f5f3ff", border: "#8b5cf6", text: "#2e1065" },
  neutral: { bg: "#f9fafb", border: "#6b7280", text: "#111827" },
};
let _colorSectionSwatch = "info";
let _colorTextSwatch = "info";

function colorSectionPickSwatch(btn) {
  document.querySelectorAll(".color-swatch-btn").forEach((b) => {
    b.classList.remove("selected-swatch", "ring-offset-2");
  });
  btn.classList.add("selected-swatch", "ring-offset-2");
  const color = btn.getAttribute("data-color-swatch");
  // Apply the matching ring color
  const ringMap = { info: "ring-blue-400", success: "ring-green-400", warning: "ring-amber-400", danger: "ring-red-400", note: "ring-purple-400", neutral: "ring-gray-400" };
  btn.classList.add(ringMap[color] || "ring-blue-400");
  _colorSectionSwatch = color;
  snippetUpdatePreview();
}

function colorTextPickSwatch(btn) {
  document.querySelectorAll(".color-text-swatch-btn").forEach((b) => {
    b.classList.remove("selected-text-swatch", "ring-offset-2");
  });
  btn.classList.add("selected-text-swatch", "ring-offset-2");
  const color = btn.getAttribute("data-color-text-swatch");
  const ringMap = { info: "ring-blue-400", success: "ring-green-400", warning: "ring-amber-400", danger: "ring-red-400", note: "ring-purple-400", neutral: "ring-gray-400" };
  btn.classList.add(ringMap[color] || "ring-blue-400");
  _colorTextSwatch = color;
  snippetUpdatePreview();
}

function _stripMdInline(s) {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1$2")
    .replace(/(^|[^_])_([^_]+)_(?!_)/g, "$1$2")
    .trim();
}

function _slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function _extractHeadingsFromMarkdown(content) {
  const out = [];
  const lines = (content || "").split("\n");
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const text = _stripMdInline(m[2]);
    const slug = _slugifyHeading(text);
    if (slug) out.push({ level: m[1].length, text, slug });
  }
  return out;
}

function _collectEditorHeadings() {
  const editor = document.getElementById("doc-editor");
  return _extractHeadingsFromMarkdown(editor ? editor.value : "");
}

function _renderAnchorOptions(sel, headings, emptyKey) {
  if (!sel) return;
  if (headings.length === 0) {
    sel.innerHTML = `<option value="" disabled selected>${window.t(emptyKey)}</option>`;
    return;
  }
  sel.innerHTML = headings
    .map((h) => {
      const indent = "· ".repeat(Math.max(0, h.level - 1));
      return `<option value="${esc(h.slug)}">${esc(indent + h.text)}</option>`;
    })
    .join("");
}

function _populateAnchorSelect() {
  _renderAnchorOptions(
    document.getElementById("snip-anchor-id"),
    _collectEditorHeadings(),
    'snippet.link_anchor_no_headings',
  );
}

async function snippetAnchorDocChanged() {
  const docSel = document.getElementById("snip-anchor-doc-select");
  const anchorSel = document.getElementById("snip-anchor-doc-id");
  if (!docSel || !anchorSel) return;
  const docId = docSel.value;
  if (!docId) {
    _renderAnchorOptions(anchorSel, [], 'snippet.link_anchor_no_headings');
    snippetUpdatePreview();
    return;
  }
  anchorSel.innerHTML = `<option value="" disabled selected>${window.t('common.loading')}</option>`;
  try {
    const doc = await fetch("/api/documents/" + encodeURIComponent(docId))
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      });
    const headings = _extractHeadingsFromMarkdown(doc.content || "");
    _renderAnchorOptions(anchorSel, headings, 'snippet.link_anchor_no_headings');
  } catch {
    _renderAnchorOptions(anchorSel, [], 'snippet.link_anchor_no_headings');
  }
  snippetUpdatePreview();
}

function _setSnippetModalMode(mode) {
  const isInlineEdit = mode === "inline-edit";
  const isInlineInsert = mode === "inline-insert";
  const isInline = isInlineEdit || isInlineInsert;
  _snippetInlineEdit = isInlineEdit;
  _snippetInlineInsert = isInlineInsert;
  if (!isInlineEdit) _snippetInlineIndent = "";
  const title = document.getElementById("snippet-modal-title");
  if (title) {
    let key = "snippet.modal_title";
    if (isInlineEdit) key = "snippet.inline_modal_title";
    else if (isInlineInsert) key = "snippet.inline_insert_modal_title";
    title.textContent = window.t(key);
  }
  const submit = document.getElementById("snippet-submit-btn");
  if (submit) {
    submit.textContent = window.t(
      isInlineEdit ? "snippet.inline_save_btn" : "snippet.insert_btn",
    );
  }
  const typeSelect = document.getElementById("snippet-type");
  if (typeSelect) {
    typeSelect.disabled = isInlineEdit;
    typeSelect.classList.toggle("cursor-not-allowed", isInlineEdit);
    typeSelect.classList.toggle("opacity-70", isInlineEdit);
  }
  const deleteBtn = document.getElementById("snippet-delete-btn");
  if (deleteBtn) {
    deleteBtn.classList.toggle("hidden", !isInlineEdit);
  }
  const card = document.getElementById("snippet-modal-card");
  if (card) {
    card.classList.toggle("max-w-6xl", !isInlineEdit);
    card.classList.toggle("max-w-5xl", isInlineEdit);
  }
}

function _openSnippetsModalForText(selectedText, detectedOverride = null) {
  const docOpts = allDocs
    .map((d) => `<option value="${d.id}">${d.title}</option>`)
    .join("");
  document.getElementById("snip-doc-select").innerHTML = docOpts;
  document.getElementById("snip-anchor-doc-select").innerHTML = docOpts;
  _populateAnchorSelect();
  snippetAnchorDocChanged();

  const msgEl = document.getElementById("snippet-detect-msg");
  if (msgEl) msgEl.classList.add("hidden");
  const detected = selectedText
    ? detectedOverride || detectSnippetType(selectedText)
    : null;

  if (_snippetInlineInsert) {
    _showSnippetPicker();
  } else if (detected) {
    document.getElementById("snippet-type").value = detected;
    snippetTypeChanged();
    parseAndFillSnippet(selectedText, detected);
    _showSnippetPanelOnly();
  } else if (selectedText) {
    _showSnippetPicker();
  } else {
    _showSnippetPicker();
  }

  document.getElementById("snippets-modal").classList.remove("hidden");
}

function openSnippetsModal() {
  const editor = document.getElementById("doc-editor");
  _snippetSelStart = editor.selectionStart;
  _snippetSelEnd = editor.selectionEnd;
  _setSnippetModalMode("insert");
  _openSnippetsModalForText(editor.value.slice(_snippetSelStart, _snippetSelEnd));
}

function openSnippetsModalForInlineEdit(range) {
  if (!range || typeof currentDocContent !== "string") return;
  _snippetSelStart = range.start;
  _snippetSelEnd = range.end;
  _setSnippetModalMode("inline-edit");
  _snippetInlineIndent = range.indent || "";
  const selectedText = currentDocContent.slice(_snippetSelStart, _snippetSelEnd);
  _openSnippetsModalForText(selectedText, range.type || null);
}

function openSnippetsModalForInlineInsert(insertPos) {
  if (typeof currentDocContent !== "string") return;
  const pos = Math.max(
    0,
    Math.min(currentDocContent.length, Number(insertPos) || 0),
  );
  _snippetSelStart = pos;
  _snippetSelEnd = pos;
  _setSnippetModalMode("inline-insert");
  _openSnippetsModalForText("");
}

function closeSnippetsModal() {
  document.getElementById("snippets-modal").classList.add("hidden");
  _setSnippetModalMode("insert");
}

function snippetTypeChanged() {
  const type = document.getElementById("snippet-type").value;
  const activePanel = _snippetPanelForType(type);
  _SNIPPET_PANELS.forEach((p) => {
    const panel = document.getElementById("snip-panel-" + p);
    if (panel) panel.classList.toggle("hidden", p !== activePanel);
  });
  const previewWrap = document.getElementById("snippet-preview-wrap");
  if (previewWrap) {
    previewWrap.classList.toggle(
      "hidden",
      type === "attachment" ||
        type === "table" ||
        type === "code-block" ||
        type === "blockquote" ||
        type === "ordered-list" ||
        type === "unordered-list" ||
        type === "colored-section" ||
        type === "colored-text" ||
        type === "tree" ||
        type === "collapsible" ||
        type.startsWith("heading-"),
    );
  }

  if (type === "table") tableInit();
  else if (type === "tree") treeInit();
  else if (type === "diagram") snippetDiagInit();
  else if (type === "emojis") emojiInit();
  else if (type === "attachment") {
    /* no preview — file picker opens on Insert */
  } else {
    if (type === "ordered-list") {
      _snippetFillTextareaDefault(
        "snip-ordered-list-content",
        ldOrderedListDefaultMarkdown(),
      );
    } else if (type === "unordered-list") {
      _snippetFillTextareaDefault(
        "snip-unordered-list-content",
        ldUnorderedListDefaultMarkdown(),
      );
    }
    snippetUpdatePreview();
  }
}

async function snippetDiagInit() {
  let diagrams = [];
  try {
    diagrams = await fetch("/api/diagrams").then((r) => r.json());
  } catch {
    diagrams = [];
  }
  const sel = document.getElementById("snip-diag-select");
  sel.innerHTML = diagrams.length
    ? diagrams
        .map(
          (d) => `<option value="${esc(d.id)}">${esc(d.title)}</option>`,
        )
        .join("")
    : `<option value="" disabled>${window.t('snippet.diagram_no_diagrams')}</option>`;

  // Pre-fill image name from current doc title
  const docTitle = document
    .getElementById("doc-title")
    .textContent.trim();
  const slug = docTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  document.getElementById("snip-diag-img-name").value = slug
    ? slug + ".png"
    : "diagram.png";
  document.getElementById("snip-diag-new-name").value = docTitle
    ? docTitle + " Diagram"
    : "";

  document.getElementById("snip-diag-mode-existing").checked = true;
  snippetDiagModeChanged();
}

function snippetDiagModeChanged() {
  const isNew = document.getElementById("snip-diag-mode-new").checked;
  document
    .getElementById("snip-diag-existing-section")
    .classList.toggle("hidden", isNew);
  document
    .getElementById("snip-diag-new-section")
    .classList.toggle("hidden", !isNew);
  snippetDiagSyncImgName();
  snippetUpdatePreview();
}

function snippetDiagSyncImgName() {
  const isNew = document.getElementById("snip-diag-mode-new").checked;
  let label;
  if (isNew) {
    label = document.getElementById("snip-diag-new-name").value.trim();
  } else {
    const sel = document.getElementById("snip-diag-select");
    label = sel.options[sel.selectedIndex]?.text ?? "";
  }
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  document.getElementById("snip-diag-img-name").value = slug
    ? slug + ".png"
    : "diagram.png";
}

function _snippetSelectedText(selectEl, fallback) {
  return selectEl.options[selectEl.selectedIndex]?.text || fallback;
}

function _snippetSwatch(name) {
  return _COLOR_SWATCHES[name] || _COLOR_SWATCHES.info;
}

function _snippetMarkdownBuildData(type) {
  switch (type) {
    case "collapsible": {
      const bodyEl = document.getElementById("snip-collapsible-body");
      return {
        summary: document.getElementById("snip-collapsible-summary").value,
        summaryFallback: window.t("snippet.collapsible_summary_value"),
        body: bodyEl ? bodyEl.value : "",
        bodyFallback: "## Titre\n\nTexte",
      };
    }
    case "link":
      return {
        text: document.getElementById("snip-link-text").value,
        textFallback: window.t("snippet.link_text_placeholder"),
        url: document.getElementById("snip-link-url").value,
      };
    case "doc-link": {
      const sel = document.getElementById("snip-doc-select");
      return {
        docId: sel.value,
        title: _snippetSelectedText(sel, sel.value),
        text: document.getElementById("snip-doc-link-text").value,
      };
    }
    case "anchor-link":
      return {
        text: document.getElementById("snip-anchor-text").value,
        textFallback: window.t("snippet.link_section_placeholder"),
        anchor: document.getElementById("snip-anchor-id").value,
        anchorFallback: window.t("snippet.link_anchor_placeholder"),
      };
    case "anchor-doc-link": {
      const sel = document.getElementById("snip-anchor-doc-select");
      return {
        docId: sel.value,
        text: document.getElementById("snip-anchor-doc-text").value,
        textFallback: window.t("snippet.link_section_placeholder"),
        anchor: document.getElementById("snip-anchor-doc-id").value,
        anchorFallback: window.t("snippet.link_anchor_placeholder"),
      };
    }
    case "ordered-list":
      return {
        content: document.getElementById("snip-ordered-list-content").value,
      };
    case "unordered-list":
      return {
        content: document.getElementById("snip-unordered-list-content").value,
      };
    case "code-block":
      return {
        lang: document.getElementById("snip-code-lang").value,
        code: document.getElementById("snip-code-content").value,
        inlineIndent: _snippetInlineEdit ? _snippetInlineIndent : "",
      };
    case "blockquote":
      return {
        content: document.getElementById("snip-blockquote-content").value,
      };
    case "heading-1":
    case "heading-2":
    case "heading-3":
    case "heading-4":
      return {
        text: document.getElementById("snip-heading-content").value,
        fallback:
          (window.t && window.t("snippet.heading_text_placeholder")) ||
          "Titre",
      };
    case "image":
      return {
        alt: document.getElementById("snip-image-alt").value,
        url: document.getElementById("snip-image-url").value,
      };
    case "table": {
      const styleEl = document.getElementById("snip-table-style");
      const borderedEl = document.getElementById("snip-table-bordered");
      const colorEl = document.getElementById("snip-table-color");
      return {
        markdown: buildTableMarkdown(),
        style: styleEl ? styleEl.value : "",
        bordered: Boolean(borderedEl && borderedEl.checked),
        color: colorEl ? colorEl.value : "",
      };
    }
    case "tree":
      return { markdown: buildTreeMarkdown() };
    case "diagram": {
      const isNew = document.getElementById("snip-diag-mode-new").checked;
      const imgName =
        document.getElementById("snip-diag-img-name").value.trim() ||
        "diagram.png";
      if (isNew) {
        return {
          id: "d" + Date.now(),
          label:
            document.getElementById("snip-diag-new-name").value.trim() ||
            "Diagram",
          imageName: imgName,
        };
      }
      const sel = document.getElementById("snip-diag-select");
      return {
        id: sel.value,
        label: _snippetSelectedText(sel, "Diagram"),
        imageName: imgName,
      };
    }
    case "colored-text":
      return {
        color: _snippetSwatch(_colorTextSwatch),
        content:
          document.getElementById("snip-colored-text-content").value ||
          window.t("snippet.colored_text_content_placeholder"),
      };
    case "colored-section":
      return {
        color: _snippetSwatch(_colorSectionSwatch),
        content:
          document.getElementById("snip-colored-content").value ||
          window.t("snippet.colored_section_content_placeholder"),
      };
    case "emojis":
      return { value: document.getElementById("snip-emoji-string").value };
    default:
      return {};
  }
}

function buildSnippetMarkdown() {
  const type = document.getElementById("snippet-type").value;
  return ldBuildSnippetMarkdown(type, _snippetMarkdownBuildData(type));
}

function snippetUpdatePreview() {
  document.getElementById("snippet-preview").textContent =
    buildSnippetMarkdown();
}

async function insertSnippet() {
  const type = document.getElementById("snippet-type").value;
  if (_snippetInlineEdit && (type === "diagram" || type === "attachment")) {
    return;
  }
  if (_snippetInlineInsert && type === "attachment") {
    return;
  }
  if (type === "diagram") {
    insertDiagramSnippet();
    return;
  }
  if (type === "attachment") {
    closeSnippetsModal();
    if (typeof openFilePicker === "function") openFilePicker();
    return;
  }
  const text = buildSnippetMarkdown();
  const wasInlineEdit = _snippetInlineEdit;
  const wasInlineInsert = _snippetInlineInsert;
  closeSnippetsModal();
  if (wasInlineEdit) {
    const before = currentDocContent.slice(0, _snippetSelStart);
    const after = currentDocContent.slice(_snippetSelEnd);
    try {
      await saveCurrentDocumentContent(before + text + after);
    } catch (err) {
      alert(
        window.t("snippet.inline_save_failed") +
          (err && err.message ? err.message : String(err)),
      );
    }
    return;
  }
  if (wasInlineInsert) {
    const before = currentDocContent.slice(0, _snippetSelStart);
    const after = currentDocContent.slice(_snippetSelStart);
    const leadingBlank =
      before.length === 0 || /\n\n$/.test(before)
        ? ""
        : before.endsWith("\n")
          ? "\n"
          : "\n\n";
    const trailingBlank =
      after.length === 0 || /^\n\n/.test(after)
        ? ""
        : after.startsWith("\n")
          ? "\n"
          : "\n\n";
    const payload = leadingBlank + text + trailingBlank;
    try {
      await saveCurrentDocumentContent(before + payload + after);
    } catch (err) {
      alert(
        window.t("snippet.inline_insert_failed") +
          (err && err.message ? err.message : String(err)),
      );
    }
    return;
  }
  const editor = document.getElementById("doc-editor");
  const before = editor.value.slice(0, _snippetSelStart);
  const after = editor.value.slice(_snippetSelEnd);
  editor.value = before + text + after;
  editor.selectionStart = editor.selectionEnd =
    _snippetSelStart + text.length;
  editor.focus();
}

async function _confirmInlineSnippetDeletion() {
  if (typeof showConfirm === "function") {
    return showConfirm({
      title: window.t("snippet.inline_delete_title"),
      message: window.t("snippet.inline_delete_message"),
      detail: window.t("snippet.inline_delete_detail"),
      confirmLabel: window.t("snippet.inline_delete_confirm_btn"),
      danger: true,
      detailTone: "warning",
    });
  }
  return confirm(window.t("snippet.inline_delete_message"));
}

async function _performInlineSnippetDeletion(start, end) {
  const before = currentDocContent.slice(0, start);
  const after = currentDocContent.slice(end);
  try {
    await saveCurrentDocumentContent(before + after);
  } catch (err) {
    alert(
      window.t("snippet.inline_delete_failed") +
        (err && err.message ? err.message : String(err)),
    );
  }
}

async function deleteInlineSnippetBlock() {
  if (!_snippetInlineEdit) return;
  const ok = await _confirmInlineSnippetDeletion();
  if (!ok) return;
  const start = _snippetSelStart;
  const end = _snippetSelEnd;
  closeSnippetsModal();
  await _performInlineSnippetDeletion(start, end);
}

async function confirmAndDeleteInlineSnippetRange(range) {
  if (!range || typeof currentDocContent !== "string") return;
  const ok = await _confirmInlineSnippetDeletion();
  if (!ok) return;
  await _performInlineSnippetDeletion(range.start, range.end);
}
window.confirmAndDeleteInlineSnippetRange = confirmAndDeleteInlineSnippetRange;

async function insertDiagramSnippet() {
  const isNew = document.getElementById("snip-diag-mode-new").checked;
  const imgName =
    document.getElementById("snip-diag-img-name").value.trim() ||
    "diagram.png";
  let diagId, diagLabel;
  if (isNew) {
    diagId = "d" + Date.now();
    diagLabel =
      document.getElementById("snip-diag-new-name").value.trim() ||
      "Diagram";
    try {
      await fetch(`/api/diagrams/${diagId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: diagLabel, nodes: [], edges: [] }),
      });
    } catch (err) {
      alert(window.t('error.create_diagram') + err.message);
      return;
    }
  } else {
    const sel = document.getElementById("snip-diag-select");
    diagId = sel.value;
    diagLabel = sel.options[sel.selectedIndex]?.text || "Diagram";
  }

  // Insert at cursor
  const md = `[![${diagLabel}](./images/${imgName})](/diagram?id=${diagId})`;
  const wasInlineInsert = _snippetInlineInsert;
  const insertStart = _snippetSelStart;
  const insertEnd = _snippetSelEnd;
  closeSnippetsModal();

  let newContent;
  if (wasInlineInsert) {
    const before = currentDocContent.slice(0, insertStart);
    const after = currentDocContent.slice(insertStart);
    const leadingBlank =
      before.length === 0 || /\n\n$/.test(before)
        ? ""
        : before.endsWith("\n")
          ? "\n"
          : "\n\n";
    const trailingBlank =
      after.length === 0 || /^\n\n/.test(after)
        ? ""
        : after.startsWith("\n")
          ? "\n"
          : "\n\n";
    newContent = before + leadingBlank + md + trailingBlank + after;
  } else {
    const editor = document.getElementById("doc-editor");
    const before = editor.value.slice(0, insertStart);
    const after = editor.value.slice(insertEnd);
    editor.value = before + md + after;
    newContent = editor.value;
  }

  // Auto-save (and re-render the viewer when in inline-insert mode so the
  // updated DOM is what gets cached if the user back-buttons here) then
  // redirect to the diagram editor.
  try {
    if (wasInlineInsert && typeof saveCurrentDocumentContent === "function") {
      await saveCurrentDocumentContent(newContent);
    } else {
      const res = await fetch("/api/documents/" + currentDocId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
      if (!res.ok) throw new Error(await res.text());
      currentDocContent = newContent;
    }
  } catch (err) {
    alert("Erreur lors de la sauvegarde : " + err.message);
    return;
  }

  window.location.href = `/diagram?id=${diagId}&img=${encodeURIComponent(imgName)}`;
}

// ── Snippet parsing (detection lives in /snippet-detect.js) ────────────────
function _isMarkdownTableSeparatorLine(line) {
  return ldIsMarkdownTableSeparatorLine(line);
}

function parseAndFillSnippet(text, type) {
  const t = text.trim();
  switch (type) {
    case "collapsible": {
      const summaryMatch = t.match(/<summary>([\s\S]*?)<\/summary>/i);
      if (summaryMatch) {
        document.getElementById("snip-collapsible-summary").value =
          summaryMatch[1].trim();
      }
      const bodyMatch = t.match(
        /<details\b[^>]*>[\s\S]*?<\/summary>\s*\n?([\s\S]*?)\s*<\/details>\s*$/i,
      );
      const bodyEl = document.getElementById("snip-collapsible-body");
      if (bodyEl) bodyEl.value = bodyMatch ? bodyMatch[1].trim() : "";
      break;
    }
    case "link": {
      const m = t.match(/^\[([\s\S]*?)\]\(([\s\S]*?)\)$/);
      if (m) {
        document.getElementById("snip-link-text").value = m[1];
        document.getElementById("snip-link-url").value = m[2];
      }
      break;
    }
    case "doc-link": {
      const m = t.match(/^\[([\s\S]*?)\]\(\?doc=([\s\S]*?)\)$/);
      if (m) {
        const docId = decodeURIComponent(m[1] === "" ? m[2] : m[2]);
        const sel = document.getElementById("snip-doc-select");
        for (const opt of sel.options) {
          if (opt.value === decodeURIComponent(m[2])) {
            sel.value = opt.value;
            break;
          }
        }
        const autoTitle = sel.options[sel.selectedIndex]?.text ?? "";
        document.getElementById("snip-doc-link-text").value =
          m[1] === autoTitle ? "" : m[1];
      }
      break;
    }
    case "anchor-link": {
      const m = t.match(/^\[([\s\S]*?)\]\(#([\s\S]*?)\)$/);
      if (m) {
        document.getElementById("snip-anchor-text").value = m[1];
        const sel = document.getElementById("snip-anchor-id");
        const wanted = m[2];
        const hasOpt = Array.from(sel.options).some(
          (o) => o.value === wanted,
        );
        if (!hasOpt) {
          const opt = document.createElement("option");
          opt.value = wanted;
          opt.textContent = wanted;
          sel.insertBefore(opt, sel.firstChild);
        }
        sel.value = wanted;
      }
      break;
    }
    case "anchor-doc-link": {
      const m = t.match(
        /^\[([\s\S]*?)\]\(\?doc=([\s\S]*?)#([\s\S]*?)\)$/,
      );
      if (m) {
        const sel = document.getElementById("snip-anchor-doc-select");
        for (const opt of sel.options) {
          if (opt.value === decodeURIComponent(m[2])) {
            sel.value = opt.value;
            break;
          }
        }
        document.getElementById("snip-anchor-doc-text").value = m[1];
        const wanted = m[3];
        snippetAnchorDocChanged().then(() => {
          const anchorSel = document.getElementById("snip-anchor-doc-id");
          if (!anchorSel) return;
          const hasOpt = Array.from(anchorSel.options).some(
            (o) => o.value === wanted,
          );
          if (!hasOpt) {
            const opt = document.createElement("option");
            opt.value = wanted;
            opt.textContent = wanted;
            anchorSel.insertBefore(opt, anchorSel.firstChild);
          }
          anchorSel.value = wanted;
          snippetUpdatePreview();
        });
      }
      break;
    }
    case "ordered-list": {
      document.getElementById("snip-ordered-list-content").value = t;
      break;
    }
    case "unordered-list": {
      document.getElementById("snip-unordered-list-content").value = t;
      break;
    }
    case "code-block": {
      const m = t.match(/^```[ \t]*([^\n]*)\n([\s\S]*?)\n[ \t]*```$/);
      document.getElementById("snip-code-lang").value = m ? m[1].trim() : "";
      let codeContent = m ? m[2] : "";
      if (m && _snippetInlineIndent) {
        const escapedIndent = _snippetInlineIndent.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );
        codeContent = codeContent.replace(
          new RegExp("^" + escapedIndent, "gm"),
          "",
        );
      }
      document.getElementById("snip-code-content").value = codeContent;
      break;
    }
    case "blockquote": {
      document.getElementById("snip-blockquote-content").value = t
        .split("\n")
        .map((line) => line.replace(/^>\s?/, ""))
        .join("\n");
      break;
    }
    case "image": {
      const m = t.match(/^!\[([\s\S]*?)\]\(([\s\S]*?)\)$/);
      if (m) {
        document.getElementById("snip-image-alt").value = m[1];
        document.getElementById("snip-image-url").value = m[2];
      }
      break;
    }
    case "heading-1":
    case "heading-2":
    case "heading-3":
    case "heading-4": {
      const level = Number(type.slice(-1));
      const re = new RegExp(`^#{${level}}\\s+(.+)$`);
      const m = t.match(re);
      const headingEl = document.getElementById("snip-heading-content");
      if (headingEl) headingEl.value = m ? m[1].trim() : "";
      break;
    }
    case "table": {
      const attrs = ldParseTableAttributesFromMarkdown(t);
      const styleEl = document.getElementById("snip-table-style");
      const borderedEl = document.getElementById("snip-table-bordered");
      const colorEl = document.getElementById("snip-table-color");
      if (styleEl) styleEl.value = attrs.style || "";
      if (borderedEl) borderedEl.checked = attrs.border === "bordered";
      if (colorEl) colorEl.value = attrs.color || "";
      const allLines = t
        .split("\n")
        .filter((l) => /^\|.*\|$/.test(l.trim()));
      const dataLines = allLines.filter(
        (l) => !_isMarkdownTableSeparatorLine(l),
      );
      _tableData = dataLines.map(ldParseMarkdownTableCells);
      const maxCols = Math.max(..._tableData.map((r) => r.length));
      _tableData.forEach((row) => {
        while (row.length < maxCols) row.push("");
      });
      tableRenderGrid();
      break;
    }
    case "tree": {
      const inner = t.replace(/^```text\n/, "").replace(/\n```$/, "");
      _treeItems = inner.split("\n").map((line) => {
        const m = line.match(/^((?:│   |    )*)(?:├── |└── )([\s\S]+)$/);
        if (m) return { name: m[2], depth: m[1].length / 4 + 1 };
        return { name: line, depth: 0 };
      });
      treeRenderList();
      break;
    }
    case "colored-text": {
      const m = t.match(/^<span\s[^>]*color:([^;>"]+)[^>]*>([\s\S]*)<\/span>$/);
      if (m) {
        const col = m[1].trim();
        const found = Object.entries(_COLOR_SWATCHES).find(([, v]) => v.border === col);
        if (found) {
          _colorTextSwatch = found[0];
          document.querySelectorAll(".color-text-swatch-btn").forEach((b) => b.classList.remove("selected-text-swatch", "ring-offset-2"));
          const activeBtn = document.querySelector(`[data-color-text-swatch="${_colorTextSwatch}"]`);
          if (activeBtn) activeBtn.classList.add("selected-text-swatch", "ring-offset-2");
        }
        document.getElementById("snip-colored-text-content").value = m[2];
      }
      break;
    }
    case "colored-section": {
      // Extract border color from inline style to guess the swatch
      const borderM = t.match(/border-left:[^;]*solid\s+(#[0-9a-fA-F]{6})/);
      if (borderM) {
        const found = Object.entries(_COLOR_SWATCHES).find(([, v]) => v.border === borderM[1]);
        if (found) {
          _colorSectionSwatch = found[0];
          document.querySelectorAll(".color-swatch-btn").forEach((b) => {
            b.classList.remove("selected-swatch", "ring-offset-2");
          });
          const activeBtn = document.querySelector(`[data-color-swatch="${_colorSectionSwatch}"]`);
          if (activeBtn) activeBtn.classList.add("selected-swatch", "ring-offset-2");
        }
      }
      const contentM = t.match(/^<div[^>]*>\n\n([\s\S]*?)\n\n<\/div>$/);
      if (contentM) document.getElementById("snip-colored-content").value = contentM[1];
      break;
    }
  }
  snippetUpdatePreview();
}
