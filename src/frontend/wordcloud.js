// ── Word Cloud — domain language analyzer ────────────────────────────────────
// Loaded by index.html as a plain <script>; all symbols are global.
// Goal: extract BUSINESS/DOMAIN words only — filter out all programming noise.

// ── Human stop words (English + French) ──────────────────────────────────────
const WC_HUMAN_STOP_WORDS = new Set([
  // English
  "the","a","an","and","or","but","not","nor","so","yet","both","either",
  "neither","is","are","was","were","be","been","being","have","has","had",
  "do","does","did","will","would","shall","should","may","might","can",
  "could","must","need","dare","ought","used","to","of","in","for","on",
  "with","at","by","from","up","about","into","through","during","before",
  "after","above","below","between","out","off","over","under","again",
  "further","then","once","here","there","when","where","why","how","all",
  "each","few","more","most","other","some","such","no","only","own","same",
  "than","too","very","just","also","still","already","always","never",
  "often","sometimes","usually","this","that","these","those","its","your",
  "our","their","his","her","him","she","you","they","we","me","my","it",
  "who","which","what","whose","whom","if","though","although","because",
  "since","while","unless","until","whether","as","like","via","per","i",
  "am","he","us","see","now","new","old","got","let","put","say","said",
  "says","get","use","make","made","take","come","came","go","went","know",
  "think","look","want","give","seem","back","down","even","much","well",
  "good","work","tell","keep","hold","turn","move","play","live","help",
  "run","start","off","way","too","few","show","hear","etc","eg","ie",
  "one","two","three","four","five","six","seven","eight","nine","ten",
  // French
  "le","la","les","un","une","des","du","de","d","l","au","aux","ce","ci",
  "cet","cette","ces","mon","ma","mes","ton","ta","tes","son","sa","ses",
  "notre","nos","votre","vos","leur","leurs","je","tu","il","elle","on",
  "nous","vous","ils","elles","me","te","se","lui","y","en","qui","que",
  "quoi","dont","où","et","ou","mais","donc","or","ni","car","si","ne",
  "pas","plus","moins","très","bien","mal","peu","beaucoup","trop","assez",
  "aussi","comme","pour","par","avec","sans","dans","sur","sous","entre",
  "vers","chez","contre","avant","après","pendant","depuis","selon","malgré",
  "sauf","est","sont","était","être","avoir","fait","faire","dit","dire",
  "peut","pouvoir","doit","devoir","veut","vouloir","sait","savoir","va",
  "aller","vient","venir","tout","tous","toute","toutes","autre","autres",
  "même","chaque","quel","quelle","quels","quelles","aucun","aucune",
  "certain","certaine","plusieurs","quelque","quelques","tel","telle","tels",
  "telles","cela","ceci","ça","celui","celle","ceux","celles","ici","voici",
  "voilà","alors","ainsi","encore","déjà","jamais","toujours","souvent",
  "parfois","rien","personne","chose","fois","jour","temps","part","cas",
  "point","lieu","monde","cependant","néanmoins","pourtant","toutefois",
  "quand","lorsque","puisque","parce","afin","puis","lors","notamment",
  "surtout","seulement","vraiment","enfin","ensuite","ailleurs","là",
  "ici","voici","voilà","dont","lequel","laquelle","lesquels","lesquelles",
]);

// ── Programming stop words (aggressive) ──────────────────────────────────────
const WC_PROG_STOP_WORDS = new Set([
  // Language keywords (all combined)
  "public","private","protected","static","void","class","interface",
  "abstract","final","const","let","var","function","return","if","else",
  "for","while","do","switch","case","break","continue","try","catch",
  "throw","throws","finally","new","this","self","super","import","export",
  "from","package","module","require","include","using","namespace","struct",
  "enum","trait","impl","fn","def","func","fun","val","mut","async","await",
  "yield","lambda","extends","implements","override","virtual","sealed",
  "data","object","companion","where","when","match","guard","defer","go",
  "chan","select","type","alias","as","is","in","of","with","true","false",
  "null","nil","none","undefined","println","printf","fmt","log","print",
  "main","args","argv","init","setup","teardown","describe","test","expect",
  "assert","before","after","not","and","or","delete","typeof","instanceof",
  "readonly","keyof","infer","never","unknown","declare","satisfies",
  // Generic CRUD / architectural patterns
  "get","set","add","remove","update","create","find","fetch","load","save",
  "put","post","patch","list","map","filter","reduce","sort","merge","parse",
  "format","convert","transform","validate","check","handle","process",
  "execute","start","stop","reset","clear","close","open","read","write",
  "send","receive","emit","trigger","dispatch","subscribe","unsubscribe",
  "listen","notify","register","unregister","bind","apply","call","invoke",
  // Architecture / structural
  "callback","handler","listener","middleware","interceptor","resolver",
  "provider","consumer","producer","builder","factory","adapter","wrapper",
  "proxy","decorator","observer","visitor","strategy","command","controller",
  "service","repository","dao","dto","entity","model","schema","config",
  "context","state","store","action","reducer","selector","hook","ref",
  "effect","memo","component","module","plugin","extension","util","utils",
  "helper","helpers","common","shared","base","default","index","app","core",
  "lib","src","test","spec","mock","stub","fixture","impl","internal","api",
  "sdk","client","server",
  // Request/response
  "request","response","status","code","error","exception","message","result",
  // Generic data identifiers
  "data","value","key","name","label","title","description","item","element",
  "node","child","parent","root","container","wrapper","layout","view","page",
  "screen","panel","header","footer","sidebar","navbar","body","content",
  "section","row","col","column","grid","flex","block","inline","span","div",
  "input","output","param","params","arg","option","options","props","attr",
  "attrs","field","fields","property","properties","method","methods",
  // Primitive types
  "string","number","boolean","integer","float","double","long","short",
  "byte","char","array","object","map","set","list","vector","queue","stack",
  "hash","table","tree","graph","pair","tuple","optional","nullable","void",
  "unit","any","bool","bytes","none","int","str","bool",
  // Quantifiers / positions
  "all","each","every","some","many","single","multi","first","last","next",
  "prev","previous","current","old","temp","tmp","new","top","bottom",
  "left","right","center","middle","start","end","begin","min","max",
  // Metrics / sizes
  "count","total","sum","avg","size","length","width","height","depth",
  "flag","num","idx",
  // Common abbreviations
  "id","uid","uuid","num","str","val","obj","arr","fn","cb","ctx","req",
  "res","err","msg","src","dst","evt","doc","db","io","fs","os","env","sys",
  // Protocols / formats
  "http","https","url","uri","path","port","host","tcp","udp","ssl","tls",
  "html","css","json","xml","yml","yaml","csv","sql","regex","utf","ascii",
  "rgb","rgba","hex","px","em","rem","vh","vw","auto","inherit","initial",
  // Generic single-concept words too vague to be domain
  "application","file","local","source","messages","logging","alerting",
  "programmed","offset","offsets","zone","zoned","decimal","big","integer",
  "constructor","mapper","captor","publisher","verify","subscriber",
  "org","edr","ack","ref","ssr","ssg","csr","isr",
  // Testing frameworks & matchers
  "mockito","junit","vitest","jest","mocha","rspec","pytest","cypress",
  "playwright","captor","spy","given","then","verify","times","never",
  "invocation","argumentcaptor","inorder","donothing","doreturn",
  // Company/framework names that pollute
  "ippon","springframework","jakarta","javax",
  // Dev annotations
  "todo","fixme","hack","note","deprecated","experimental","eslint","prettier",
  // Framework / tool names
  "typescript","javascript","java","kotlin","python","golang","rust","csharp",
  "swift","ruby","spring","boot","javax","jakarta","hibernate","lombok",
  "gradle","maven","webpack","vite","react","angular","vue","svelte","nuxt",
  "express","fastapi","flask","django","rails","fiber","gin","actix","tokio",
  "asyncio","junit","jest","mocha","pytest","rspec","docker","kubernetes",
  "aws","gcp","azure","terraform","ansible","nginx","apache","linux",
  // Next.js / fullstack ecosystem
  "nextjs","remix","astro","sveltekit","gatsby","nuxtjs","qwik","solid",
  "vercel","netlify","cloudflare","supabase","firebase","mongodb","postgres",
  "prisma","drizzle","typeorm","sequelize","mongoose","redis","neon",
  "trpc","graphql","grpc","rest","openapi","swagger","zod","yup","valibot",
  "tailwind","shadcn","radix","headless","chakra","mantine","antd","mui",
  "tanstack","tanstackquery","zustand","jotai","recoil","redux","mobx",
  "storybook","cypress","playwright","vitest","turbopack","turborepo",
  // Next.js file-convention exports / function names
  "getserversideprops","getstaticprops","getstaticpaths","generatestaticparams",
  "generatemetadata","serveraction","revalidate","notfound","redirect",
  "permanentredirect","unstablecache","unstablenostore","cookies","headers",
  "userouter","usepathname","usesearchparams","useparams","useformstate",
  "useformstatus","useoptimistic","useserveraction",
  // JSX / React specific
  "classname","onclick","onchange","onsubmit","onfocus","onblur","onkeydown",
  "onkeyup","onmousedown","onmouseup","defaultvalue","htmlfor","tabindex",
  "strokewidth","viewbox","fillopacity","strokeopacity","pathdata",
  "children","fragment","portal","suspense","errorboundary","strictmode",
  "createelement","createcontext","createref","forwardref",
  "usestate","useeffect","useref","usecontext","usememo","usecallback",
  "usereducer","useid","usetransition","usedeferredvalue","useimperativehandle",
  // Concurrency / runtime
  "mutex","lock","thread","goroutine","coroutine","channel","buffer","stream",
  "pipe","observable","promise","future","completable","deferred","disposable",
  "lifecycle","scope",
  // Meta
  "annotation","attribute","metadata","reflection","generic","template",
  "macro","preprocessor","compiler","runtime","debug","release","production",
  "development","staging","build","deploy","lint","coverage","report",
  // Common short noise
  "the","and","for","are","but","not","you","all","this","that","with",
  "have","from","they","will","been","can","has","was","its","our","their",
  "more","also","when","what","about","which","would","into","than","then",
  "each","just","over","after","such","here","some","were","very","only",
]);

function wcIsStopWord(w) {
  return WC_HUMAN_STOP_WORDS.has(w) || WC_PROG_STOP_WORDS.has(w)
    || w.length < 3 || /^\d+$/.test(w) || /^[^a-z]/.test(w);
}

// ── Identifier splitter ───────────────────────────────────────────────────────
function splitIdentifier(word) {
  return word
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_\-./]+/g, ' ')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

// ── Text tokenizer ────────────────────────────────────────────────────────────
function wcTokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-zàâäéèêëïîôùûü]+/)
    .filter((w) => w.length >= 3);
}

// ── Language-aware word extractor ─────────────────────────────────────────────
const WC_PROSE_EXTS  = new Set(['md', 'txt', 'mdx']);
const WC_CODE_EXTS   = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'java', 'kt', 'py', 'go', 'rs', 'cs', 'swift', 'rb', 'prisma', 'graphql', 'gql']);
const WC_CONFIG_EXTS = new Set(['html', 'css', 'scss', 'yml', 'yaml', 'json', 'xml', 'toml', 'env']);
// Extensions where JSX tags should be stripped before identifier extraction
const WC_JSX_EXTS    = new Set(['tsx', 'jsx']);

function extractWordsFromFile(text, ext) {
  const words = [];

  if (WC_PROSE_EXTS.has(ext)) {
    // Prose: strip code blocks, markdown syntax, extract plain text
    const clean = text
      .replace(/^\s*(import|export\s+\{[^}]*\}|export\s+\*|package|require|#include|from\s+['"][^'"]+['"]\s*(import)?)\b.*/gm, '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`\n]+`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[#*_~>`|!\[\](){}=+\-]/g, ' ');
    words.push(...wcTokenize(clean));

  } else if (WC_CODE_EXTS.has(ext)) {
    // For JSX/TSX: strip JSX tags and common HTML attribute names before processing
    // so that <div className="..." onClick={...}> doesn't contribute noise words
    if (WC_JSX_EXTS.has(ext)) {
      // Remove JSX opening/closing tags but keep their text content
      text = text.replace(/<\/?[A-Z][A-Za-z0-9.]*[^>]*>/g, ' '); // React components
      text = text.replace(/<\/?(div|span|main|section|article|aside|nav|header|footer|form|input|button|select|option|textarea|table|thead|tbody|tr|td|th|ul|ol|li|a|img|p|h[1-6]|label|figure|figcaption|picture|video|audio|canvas|svg|path|circle|rect|g|defs|use|link|meta|head|html|body|script|style|br|hr|strong|em|code|pre|blockquote|small|sub|sup)\b[^>]*>/gi, ' ');
      // Remove JSX attribute names (lowercase words before =)
      text = text.replace(/\b(className|onClick|onChange|onSubmit|onFocus|onBlur|onKeyDown|onKeyUp|onMouseDown|onMouseUp|htmlFor|tabIndex|strokeWidth|viewBox|fillOpacity|strokeOpacity|defaultValue|placeholder|disabled|checked|readOnly|required|multiple|autoFocus|autoComplete|type|href|src|alt|width|height|style|key|ref)\s*=/g, ' =');
    }

    // Extract from line comments (// # --)
    text.replace(/(?:\/\/|#(?!.*[{}[\]<>])| -- )\s*(.+)$/gm, (_, c) => {
      words.push(...wcTokenize(c));
    });

    // Extract from block comments /* */
    text.replace(/\/\*[\s\S]*?\*\//g, (c) => {
      words.push(...wcTokenize(c));
    });

    // Extract from docstrings """ """ and ''' '''
    text.replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, (c) => {
      words.push(...wcTokenize(c));
    });

    // Extract from string literals: only human-readable (starts with letter, min 4 chars)
    text.replace(/["'`]([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s,.'éàèùâêîôûç]{3,})["'`]/g, (_, s) => {
      words.push(...wcTokenize(s));
    });

    // Split all identifiers (camelCase, PascalCase, snake_case, etc.)
    text.replace(/\b([A-Za-z][A-Za-z0-9_]{2,})\b/g, (_, id) => {
      words.push(...splitIdentifier(id));
    });

  } else if (WC_CONFIG_EXTS.has(ext)) {
    // Config: extract string values and split identifiers
    text.replace(/:\s*["']([^"']{3,})["']/g, (_, v) => {
      words.push(...wcTokenize(v));
    });
    text.replace(/\b([A-Za-z][A-Za-z0-9_]{2,})\b/g, (_, id) => {
      words.push(...splitIdentifier(id));
    });
  }

  return words.filter((w) => !wcIsStopWord(w));
}

// ── State ─────────────────────────────────────────────────────────────────────
let _wcWordFreq   = null; // Map<word, number>  — total occurrence count
let _wcWordFiles  = null; // Map<word, Set<path>> — which files contain the word
let _wcTotalFiles = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────
function wcEsc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Render ────────────────────────────────────────────────────────────────────
function wcRender() {
  const minFiles = Math.max(1, parseInt(document.getElementById('wc-min-files').value) || 1);

  const allWords = [..._wcWordFreq.entries()].sort((a, b) => b[1] - a[1]);
  const list = allWords
    .filter(([w]) => (_wcWordFiles.get(w) || new Set()).size >= minFiles)
    .slice(0, 150);

  const status = document.getElementById('wc-status');
  const canvas = document.getElementById('wc-canvas');

  if (!list.length) {
    const total = allWords.length;
    status.textContent = total
      ? `${total} domain word(s) found but none appear in ${minFiles}+ file(s). Lower the "Min files" threshold to 1.`
      : 'No domain words extracted. Try adding more file extensions or a broader folder.';
    status.classList.remove('hidden');
    canvas.classList.add('hidden');
    document.getElementById('wc-sidebar').classList.add('hidden');
    return;
  }

  // Stats
  const uniqueDomain = [..._wcWordFreq.keys()]
    .filter((w) => (_wcWordFiles.get(w) || new Set()).size >= minFiles).length;
  document.getElementById('wc-stats').innerHTML =
    `<div>${_wcTotalFiles} file(s) scanned</div>` +
    `<div>${uniqueDomain} unique domain words</div>` +
    `<div>${list.length} shown</div>`;

  // Top-50 sidebar list
  const topList = document.getElementById('wc-top-list');
  const top50 = list.slice(0, 50);
  const maxF  = top50[0][1];
  topList.innerHTML = top50.map(([w, n], i) => {
    const pct = Math.round((n / maxF) * 100);
    return `<div onclick="wcShowDetail('${wcEsc(w)}')"
      class="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <span class="text-gray-400 dark:text-gray-600 w-5 text-right shrink-0 tabular-nums text-xs">${i + 1}</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-1">
          <span class="text-gray-800 dark:text-gray-200 font-medium truncate text-xs">${wcEsc(w)}</span>
          <span class="text-gray-400 dark:text-gray-600 tabular-nums shrink-0 text-xs">${n}</span>
        </div>
        <div class="h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-0.5">
          <div class="h-1 bg-blue-400 dark:bg-blue-600 rounded-full" style="width:${pct}%"></div>
        </div>
      </div>
    </div>`;
  }).join('');

  // Show sidebar first so the layout settles before we measure the canvas area
  document.getElementById('wc-sidebar').classList.remove('hidden');
  status.classList.add('hidden');

  const isDark = document.documentElement.classList.contains('dark');
  const colors = isDark
    ? ['#60a5fa', '#34d399', '#f9a8d4', '#a78bfa', '#fbbf24', '#6ee7b7', '#93c5fd', '#fb923c', '#4ade80', '#f472b6']
    : ['#1d4ed8', '#047857', '#7c3aed', '#b45309', '#be123c', '#0369a1', '#4338ca', '#c2410c', '#15803d', '#9333ea'];

  // rAF: wait for the browser to reflow after showing the sidebar,
  // then measure the actual canvas container size before rendering.
  requestAnimationFrame(() => {
    const wrap = document.getElementById('wc-canvas-wrap');
    canvas.width  = Math.max(400, wrap.offsetWidth);
    canvas.height = Math.max(300, wrap.offsetHeight);
    canvas.style.width  = canvas.width  + 'px';
    canvas.style.height = canvas.height + 'px';
    canvas.classList.remove('hidden');

    // Scale font sizes to the canvas area so words fill the available space.
    const fontScale = Math.sqrt((canvas.width * canvas.height) / (800 * 500));
    const maxFont   = Math.min(220, Math.round(72 * fontScale));
    const wordList  = top50.map(([w, n]) => [w, Math.max(12, Math.round((maxFont * n) / maxF))]);

    WordCloud(canvas, {
      list: wordList,
      gridSize: Math.round((4 * canvas.width) / 1024),
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      color: () => colors[Math.floor(Math.random() * colors.length)],
      backgroundColor: isDark ? '#030712' : '#ffffff',
      rotateRatio: 0.2,
      minSize: 6,
      shrinkToFit: true,
      click: (item) => wcShowDetail(item[0]),
    });
  });
}

function wcShowDetail(word) {
  const files = [...(_wcWordFiles.get(word) || [])].sort();
  const freq  = _wcWordFreq.get(word) || 0;
  document.getElementById('wc-detail-word').textContent = `${word}  ×${freq}`;
  document.getElementById('wc-detail-files').innerHTML = files.length
    ? files.map((f) => `
        <div class="flex items-center gap-1 group py-0.5">
          <span class="text-gray-600 dark:text-gray-400 break-all font-mono flex-1 text-xs">${wcEsc(f)}</span>
          <button onclick="wcAddExclude('${wcEsc(f)}')" title="Exclude this file"
            class="shrink-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs leading-none px-1 transition-opacity">⊖</button>
        </div>`).join('')
    : '<div class="text-gray-400 text-center py-2">—</div>';
  document.getElementById('wc-detail').classList.remove('hidden');
}

function wcCloseDetail() {
  document.getElementById('wc-detail').classList.add('hidden');
}

function wcGetExcludeSet() {
  const ta = document.getElementById('wc-exclude');
  return new Set(
    (ta.value || '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
  );
}

function wcAddExclude(item) {
  const existing = wcGetExcludeSet();
  if (existing.has(item)) return;
  existing.add(item);
  const ta = document.getElementById('wc-exclude');
  ta.value = [...existing].join(', ');
  localStorage.setItem('wc-exclude', ta.value);
  // Refresh exclude browser and detail panel if open
  if (!document.getElementById('wc-exclude-browser').classList.contains('hidden')) {
    wcExclLoadBrowse(_wcExclBrowseCurrent);
  }
  wcRefreshDetailPanel();
}

function wcOnExcludeChange() {
  const ta = document.getElementById('wc-exclude');
  localStorage.setItem('wc-exclude', ta.value);
  if (!document.getElementById('wc-exclude-browser').classList.contains('hidden')) {
    wcExclLoadBrowse(_wcExclBrowseCurrent);
  }
  wcRefreshDetailPanel();
}

function wcApplyFilter() {
  if (_wcWordFreq) wcRender();
}

// ── Exclude browser ───────────────────────────────────────────────────────────

let _wcExclBrowseParent  = null;
let _wcExclBrowseCurrent = '';

function wcToggleExcludeBrowser() {
  const browser  = document.getElementById('wc-exclude-browser');
  const isHidden = browser.classList.toggle('hidden');
  if (!isHidden) {
    const start = _wcExclBrowseCurrent || document.getElementById('wc-root').value || '/';
    wcExclLoadBrowse(start);
  }
}

async function wcExclLoadBrowse(dirPath) {
  const list = document.getElementById('wc-excl-browse-list');
  list.innerHTML = '<p class="px-3 py-4 text-xs text-gray-400 text-center">Loading…</p>';
  try {
    const data = await fetch('/api/browse?all=1&path=' + encodeURIComponent(dirPath)).then((r) => r.json());
    _wcExclBrowseCurrent = data.current;
    _wcExclBrowseParent  = data.parent;
    document.getElementById('wc-excl-browse-path').textContent = data.current;
    document.getElementById('wc-excl-browse-up').disabled = !data.parent;

    const root = document.getElementById('wc-root').value.trim();

    // Helper: compute the entry to add — relative to root if possible, else basename
    function exclusionEntry(absPath, name) {
      if (root && absPath.startsWith(root + '/')) {
        return absPath.slice(root.length + 1); // relative path
      }
      return name;
    }

    const excluded = wcGetExcludeSet();

    const rows = data.dirs
      .filter((dir) => !excluded.has(exclusionEntry(dir.path, dir.name)))
      .map((dir) => {
        const entry = exclusionEntry(dir.path, dir.name);
        return `<div class="group flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <button data-path="${wcEsc(dir.path)}" onclick="wcExclLoadBrowse(this.dataset.path)"
            class="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-left">
            <span class="text-gray-400 shrink-0">&#128193;</span>
            <span class="text-gray-700 dark:text-gray-300 truncate">${wcEsc(dir.name)}</span>
          </button>
          <button onclick="wcAddExclude('${wcEsc(entry)}')" title="Add to exclusions"
            class="shrink-0 text-red-400 hover:text-red-600 px-3 py-2 text-sm font-bold transition-colors">⊖</button>
        </div>`;
      });

    // Also show files in the current dir that match scanned extensions
    const exts = [...document.querySelectorAll('.wc-ext:checked')].map((cb) => cb.value);
    const fileRows = (data.files || [])
      .filter((f) => exts.some((e) => f.name.endsWith('.' + e)))
      .filter((f) => !excluded.has(exclusionEntry(f.path, f.name)))
      .map((f) => {
        const entry = exclusionEntry(f.path, f.name);
        return `<div class="group flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <span class="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
            <span class="shrink-0 opacity-40">&#128196;</span>
            <span class="truncate font-mono">${wcEsc(f.name)}</span>
          </span>
          <button onclick="wcAddExclude('${wcEsc(entry)}')" title="Add to exclusions"
            class="shrink-0 text-red-400 hover:text-red-600 px-3 py-2 text-sm font-bold transition-colors">⊖</button>
        </div>`;
      });

    const allRows = [...rows, ...fileRows];
    list.innerHTML = allRows.length
      ? allRows.join('')
      : '<p class="px-3 py-3 text-xs text-gray-400 text-center">Empty directory</p>';
  } catch {
    list.innerHTML = '<p class="px-3 py-4 text-xs text-red-400 text-center">Cannot read directory</p>';
  }
}

function wcExclBrowseUp() {
  if (_wcExclBrowseParent) wcExclLoadBrowse(_wcExclBrowseParent);
}

// ── Browser (folder picker) ───────────────────────────────────────────────────

let _wcBrowseParent  = null;
let _wcBrowseCurrent = '';

function wcToggleBrowser() {
  const browser  = document.getElementById('wc-browser');
  const isHidden = browser.classList.toggle('hidden');
  if (!isHidden) wcLoadBrowse(_wcBrowseCurrent || document.getElementById('wc-root').value || '/');
}

async function wcLoadBrowse(dirPath) {
  const list = document.getElementById('wc-browse-list');
  list.innerHTML = '<p class="px-3 py-4 text-xs text-gray-400 text-center">Loading…</p>';
  try {
    const data = await fetch('/api/browse?path=' + encodeURIComponent(dirPath)).then((r) => r.json());
    _wcBrowseCurrent = data.current;
    _wcBrowseParent  = data.parent;
    document.getElementById('wc-browse-path').textContent = data.current;
    document.getElementById('wc-browse-up').disabled = !data.parent;

    const rows = data.dirs.map((dir) =>
      `<div class="group flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <button data-path="${wcEsc(dir.path)}" onclick="wcLoadBrowse(this.dataset.path)"
          class="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-left">
          <span class="text-gray-400 shrink-0">&#128193;</span>
          <span class="text-gray-700 dark:text-gray-300 truncate">${wcEsc(dir.name)}</span>
        </button>
        <button onclick="wcAddExclude('${wcEsc(dir.name)}')" title="Exclude this folder"
          class="shrink-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 px-3 py-2 text-sm transition-opacity">⊖</button>
      </div>`,
    );

    const selectBtn = `<button onclick="wcSelectFolder()" class="w-full px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-left font-medium border-t border-gray-100 dark:border-gray-800">
      &#10003; Select: <span class="font-mono">${wcEsc(data.current)}</span>
    </button>`;

    list.innerHTML = (rows.length
      ? rows.join('')
      : '<p class="px-3 py-3 text-xs text-gray-400 text-center">No sub-folders</p>'
    ) + selectBtn;
  } catch {
    list.innerHTML = '<p class="px-3 py-4 text-xs text-red-400 text-center">Cannot read directory</p>';
  }
}

function wcBrowseUp() {
  if (_wcBrowseParent) wcLoadBrowse(_wcBrowseParent);
}

function wcSelectFolder() {
  document.getElementById('wc-root').value = _wcBrowseCurrent;
  localStorage.setItem('wc-root', _wcBrowseCurrent);
  document.getElementById('wc-browser').classList.add('hidden');
}

// ── Persistence (localStorage) ────────────────────────────────────────────────

function wcToggleAllExts() {
  const boxes = [...document.querySelectorAll('.wc-ext')];
  const allChecked = boxes.every((cb) => cb.checked);
  boxes.forEach((cb) => { cb.checked = !allChecked; });
  document.getElementById('wcToggleAllBtn').textContent = allChecked ? 'All' : 'None';
  wcSaveExts();
}

function wcSaveExts() {
  const exts = [...document.querySelectorAll('.wc-ext:checked')].map((cb) => cb.value);
  localStorage.setItem('wc-exts', JSON.stringify(exts));
}

function wcRestorePrefs() {
  const savedRoot = localStorage.getItem('wc-root');
  if (savedRoot) {
    document.getElementById('wc-root').value = savedRoot;
    _wcBrowseCurrent = savedRoot;
  }
  const savedExclude = localStorage.getItem('wc-exclude');
  if (savedExclude) document.getElementById('wc-exclude').value = savedExclude;
  const savedExts = localStorage.getItem('wc-exts');
  if (savedExts) {
    try {
      const exts = JSON.parse(savedExts);
      document.querySelectorAll('.wc-ext').forEach((cb) => {
        cb.checked = exts.includes(cb.value);
      });
    } catch { /* ignore corrupt data */ }
  }
  document.querySelectorAll('.wc-ext').forEach((cb) => {
    cb.addEventListener('change', wcSaveExts);
  });
}

// ── Open / Launch / Close ─────────────────────────────────────────────────────

async function openWordCloud() {
  const overlay = document.getElementById('wc-overlay');
  const status  = document.getElementById('wc-status');
  const canvas  = document.getElementById('wc-canvas');
  overlay.classList.remove('hidden');
  status.textContent = 'Choose a root folder and click Launch.';
  status.classList.remove('hidden');
  canvas.classList.add('hidden');

  const rootInput = document.getElementById('wc-root');
  if (!rootInput.value) {
    try {
      const cfg = await fetch('/api/config').then((r) => r.json());
      if (cfg.docsFolder) {
        rootInput.value  = cfg.docsFolder;
        _wcBrowseCurrent = cfg.docsFolder;
      }
    } catch { /* ignore */ }
  }
}

async function launchWordCloud() {
  const status = document.getElementById('wc-status');
  const canvas = document.getElementById('wc-canvas');
  const root   = document.getElementById('wc-root').value.trim();

  if (!root) {
    status.textContent = 'Please select a root folder first.';
    status.classList.remove('hidden');
    return;
  }

  const exts = [...document.querySelectorAll('.wc-ext:checked')].map((cb) => cb.value);
  if (!exts.length) {
    status.textContent = 'Please select at least one extension.';
    status.classList.remove('hidden');
    return;
  }

  document.getElementById('wc-browser').classList.add('hidden');
  document.getElementById('wc-sidebar').classList.add('hidden');
  document.getElementById('wc-detail').classList.add('hidden');
  status.textContent = 'Reading files…';
  status.classList.remove('hidden');
  canvas.classList.add('hidden');

  try {
    const excludeRaw = document.getElementById('wc-exclude').value.trim();
    const excludeDirs = excludeRaw ? excludeRaw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) : [];
    localStorage.setItem('wc-exclude', excludeRaw);

    const params = new URLSearchParams({ path: root });
    exts.forEach((e) => params.append('ext', e));
    excludeDirs.forEach((d) => params.append('exclude', d));
    const res = await fetch('/api/wordcloud?' + params);
    if (!res.ok) {
      const err = await res.json();
      status.textContent = 'Error: ' + (err.error || res.statusText);
      return;
    }
    const { files, fileTexts } = await res.json();
    status.textContent = `Analyzing ${files} file(s)…`;

    _wcWordFreq   = new Map();
    _wcWordFiles  = new Map();
    _wcTotalFiles = files;

    for (const { path: filePath, text } of fileTexts) {
      const ext   = (filePath.split('.').pop() || '').toLowerCase();
      const words = extractWordsFromFile(text, ext);
      const seenInFile = new Set();
      for (const w of words) {
        _wcWordFreq.set(w, (_wcWordFreq.get(w) || 0) + 1);
        if (!seenInFile.has(w)) {
          seenInFile.add(w);
          if (!_wcWordFiles.has(w)) _wcWordFiles.set(w, new Set());
          _wcWordFiles.get(w).add(filePath);
        }
      }
    }

    wcRender();
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
  }
}

function closeWordCloud() {
  document.getElementById('wc-overlay').classList.add('hidden');
}
