// ── Word Cloud — stop words & logic ───────────────────────────────────────────
// Loaded by index.html as a plain <script>; all symbols are global.

// ── Human stop words (English + French only) ──────────────────────────────────
const WC_STOP_WORDS = new Set([
  // ── English ──
  "the","and","for","are","but","not","you","all","this","that",
  "with","have","from","they","will","one","been","can","has","was",
  "more","also","when","there","their","what","about","which","would",
  "into","than","then","each","just","over","after","such","here",
  "its","your","our","some","were","very","only","out","had",
  "she","his","her","him","who","how","any","other","these","those",
  "being","may","use","used","using","should","could","shall","must",
  "need","via","per","like","well","make","made","take","taken",
  "same","both","between","before","while","where","since","still",
  "even","able","back","come","down","does","done","good","much",
  "said","them","want","way","without","within","whether","though",
  "although","however","therefore","thus","hence","indeed","rather",
  "either","neither","yet","once","upon","during","against","among",
  "through","because","along","already","always","often","never",
  "again","around","another","every","most","many","least","less",
  "own","off","too","now","new","old","few","see","set",
  "put","got","let","tell","know","think","seem","look","keep",
  "give","show","hear","play","run","move","live","hold","turn",
  "help","start","might","really","actually","simply","directly",
  "basically","generally","normally","especially","currently",
  // ── French ──
  "les","des","une","pour","pas","sur","par","est","qui","que",
  "dans","avec","sont","plus","tout","aux","mais","comme","vous",
  "nous","leur","lui","elle","ils","elles","ces","ses","mon","ton",
  "son","mes","tes","ainsi","donc","alors","car","peut","fait",
  "encore","bien","aussi","très","même","entre","vers","dont","sans",
  "sous","cette","celui","celle","ceux","celles","cela","ceci",
  "avoir","être","faire","aller","voir","savoir","pouvoir","vouloir",
  "devoir","partir","venir","prendre","mettre","dire","donner","tenir",
  "tous","toutes","trop","peu","beaucoup","moins",
  "jamais","toujours","souvent","parfois","déjà","bientôt",
  "maintenant","après","avant","depuis","pendant","selon","afin",
  "quand","parce","puisque","lorsque","tandis","quoique",
  "cependant","néanmoins","pourtant","toutefois","ailleurs","ensuite",
  "enfin","surtout","notamment","seulement","simplement","vraiment",
  "lequel","laquelle","lesquels","lesquelles","duquel","auquel",
  "desquels","auxquels","chaque","plusieurs","certains","certaines",
  "quelques","autres","certaine","aucun","aucune","nul","nulle",
  "chacun","chacune","quoi","quels","quelles","quel","quelle",
  "votre","vos","notre","nos","leurs","puis","lors",
]);

// ── Language-specific stop words (keyed by file extension) ────────────────────
const WC_LANG_STOP_WORDS = {
  // shared across all code files
  _code: new Set([
    "true","false","null","undefined","void","this","self","super",
    "return","import","export","from","class","interface","extends","implements",
    "public","private","protected","static","final","abstract","override",
    "function","const","let","var","type","enum","struct","trait","impl",
    "async","await","new","delete","typeof","instanceof","throw","throws",
    "catch","finally","break","continue","default","switch","case","while",
    "else","elif","pass","raise","yield","with","lambda","where","match",
    "package","module","namespace","using","include","require","define",
    "object","string","number","boolean","integer","float","double","long",
    "byte","char","array","list","dict","tuple","bool","none",
    "nil","print","console","stdout","stderr",
    "size","length","count","index","value","result","error","data",
    "args","argv","argc","opts","params","param","props","prop",
    "node","root","tree","left","right","next","prev","head","tail",
    "init","main","test","spec","mock","stub","util","helper","base",
    "read","write","open","close","send","recv","load","save","parse",
    "append","remove","insert","update","create","build",
    "get","set","has","add","push","pull","move","copy","sort","find","filter","reduce","map",
  ]),
  ts:    new Set(["interface","namespace","readonly","keyof","infer","never","unknown","declare","satisfies","generic"]),
  tsx:   new Set(["interface","namespace","readonly","keyof","infer","never","unknown","declare","satisfies","generic","react","props","children","component","render","state","effect","hook","usestate","useeffect","useref","usecontext","usememo","usecallback"]),
  js:    new Set(["prototype","arguments","callee","getter","setter","proxy","promise","resolve","reject","then","catch"]),
  jsx:   new Set(["react","props","children","component","render","state","effect","hook"]),
  java:  new Set(["override","extends","implements","throws","final","synchronized","volatile","transient","strictfp","instanceof","assert","native","enum","annotation","autowired","bean","component","service","repository","controller","springframework","junit","lombok","getter","setter","builder","tostring","hashcode","equals","arraylist","hashmap","optional","stream","collectors","iterator","comparable","serializable","runnable","callable","exception","runtimeexception"]),
  kt:    new Set(["override","extends","object","companion","data","sealed","inner","inline","reified","crossinline","noinline","lateinit","lazy","apply","also","let","with","run","when","vararg","init","constructor","primary","secondary","coroutine","suspend","flow","stateflow","sharedflow","viewmodel","livedata","hilt","inject","module","provides","binds","qualifier","scope","composable","remember","mutablestate","launchedeffect","lifecycle"]),
  py:    new Set(["self","none","elif","lambda","yield","with","raise","assert","except","finally","pass","global","nonlocal","import","from","class","isinstance","issubclass","hasattr","getattr","setattr","delattr","super","property","staticmethod","classmethod","abstractmethod","dataclass","field","list","dict","tuple","bool","bytes","range","enumerate","print","input","open","close","append","extend","update","items","values","keys","format","strip","split","join","replace","lower","upper","startswith","endswith","type","len","int","str","float","repr","iter","next","zip","reversed","sorted","filter","reduce","partial","functools","itertools","collections","defaultdict","namedtuple","deque","heapq","bisect","contextlib","pathlib","datetime","argparse","logging","unittest","pytest","numpy","pandas","torch","tensorflow","flask","django","fastapi","sqlalchemy","pydantic","asyncio"]),
  go:    new Set(["func","chan","goroutine","defer","panic","recover","make","append","copy","close","delete","complex","imag","real","iota","blank","rune","byte","error","interface","struct","select","range","fallthrough","goto","nil","main","init","println","printf","sprintf","fprintf","scanf","sscanf","fscanf","strings","bytes","errors","context","sync","atomic","mutex","waitgroup","channel","handler","middleware","router","request","response","writer","reader","buffer","scanner","encoder","decoder","marshal","unmarshal"]),
  rs:    new Set(["let","mut","impl","trait","enum","struct","match","some","none","okay","unwrap","expect","clone","borrow","lifetime","ownership","move","copy","drop","result","option","vector","string","hashmap","hashset","btreemap","btreeset","refcell","mutex","rwlock","channel","sender","receiver","tokio","async","await","spawn","future","stream","iterator","closure","generic","where","derive","macro","println","format","panic","assert","eprintln","anyhow","thiserror","serde","warp","actix","axum","rocket","diesel","sqlx"]),
  cs:    new Set(["using","namespace","sealed","readonly","partial","virtual","abstract","override","base","object","string","bool","int","double","float","decimal","char","byte","short","long","uint","ulong","ushort","sbyte","nullable","async","await","task","void","delegate","event","linq","lambda","expression","predicate","action","func","tuple","list","dictionary","hashset","queue","stack","array","ienumerable","ienumerator","icollection","ilist","idictionary","console","debug","trace","exception","argumentexception","nullreferenceexception","invalidoperationexception","ioexception","attribute","annotation","property","getter","setter","constructor","disposable","dispose","garbage","collector","threading","semaphore","monitor","interlocked","concurrent","entity","framework","controller","service","repository","dependency","injection","middleware","startup","program","appsettings","configuration","logging","dbcontext","dbset","migrations"]),
  swift: new Set(["guard","defer","where","some","opaque","associated","protocol","extension","mutating","nonmutating","lazy","weak","unowned","inout","subscript","operator","precedence","associativity","typealias","throw","rethrows","convenience","required","override","final","open","fileprivate","internal","public","private","static","class","struct","enum","actor","swiftui","view","body","state","binding","observedobject","stateobject","environmentobject","published","viewmodel","modifier","frame","padding","foregroundcolor","background","spacer","vstack","hstack","zstack","list","navigationview","navigationlink","sheet","alert","toolbar","button","text","image","textfield","toggle","picker","slider","stepper","scrollview","grid","path","shape","color","font","gesture","animation","transition","combine","publisher","subscriber","cancellable","sink","assign","flatmap","receive","debounce","throttle"]),
  rb:    new Set(["begin","rescue","ensure","raise","yield","lambda","proc","block","method","module","require","include","extend","prepend","attr","accessor","reader","writer","protected","private","public","freeze","frozen","dup","clone","object","class","instance","variable","symbol","hash","array","string","integer","float","boolean","nil","each","map","select","reject","inject","reduce","collect","detect","find","sort","uniq","flatten","compact","zip","take","drop","first","last","push","pull","shift","unshift","pop","min","max","sum","count","size","length","empty","any","all","none","include","respond","send","define","missing","inherited","extended","prepended","included","hook","callback","before","after","around","action","controller","model","view","route","migration","schema","database","activerecord","activemodel","actioncontroller","actionview","rails","rack","gem","bundle","rake","rspec","minitest","capybara","factory","stub","mock","double","expect","allow","receive"]),
  html:  new Set(["html","head","body","title","meta","link","script","style","div","span","section","article","header","footer","main","aside","nav","form","input","button","select","option","textarea","table","thead","tbody","tfoot","caption","colgroup","fieldset","legend","label","output","datalist","progress","details","summary","figure","figcaption","picture","source","video","audio","track","canvas","svg","path","circle","rect","line","polygon","polyline","defs","group","class","href","type","name","value","action","method","placeholder","required","checked","disabled","readonly","multiple","accept","enctype","autocomplete","autofocus","novalidate","pattern","minlength","maxlength","charset","content","lang","xmlns","viewport","initial","scale","description","keywords","author","refresh","equiv","property","role","aria","tabindex","draggable","contenteditable","spellcheck","translate","hidden","data","onclick","onchange","onsubmit","onload","onerror","onfocus","onblur","onkeydown","onkeyup","onmousedown","onmouseup","onmouseover","onmouseout","onmousemove","onscroll","onresize","tailwind"]),
  css:   new Set(["display","flex","grid","block","inline","position","relative","absolute","fixed","sticky","float","clear","margin","padding","border","outline","width","height","overflow","visibility","opacity","transform","transition","animation","color","background","font","size","weight","family","decoration","align","justify","content","items","self","order","grow","shrink","basis","wrap","direction","columns","rows","template","repeat","auto","minmax","span","area","place","object","fit","cursor","pointer","events","none","user","select","resize","zindex","layer","shadow","radius","filter","backdrop","blur","brightness","contrast","grayscale","hue","invert","saturate","sepia","rotate","scale","translate","skew","matrix","perspective","clip","mask","shape","outside","inside","overflow","ellipsis","nowrap","word","break","letter","spacing","indent","capitalize","uppercase","lowercase","white","space","vertical","baseline","middle","super","sub","list","counter","before","after","hover","focus","active","visited","disabled","checked","valid","invalid","required","optional","first","last","nth","child","root","empty","target","lang","media","screen","print","query","supports","charset","keyframes","viewport","placeholder","selection","scrollbar"]),
  scss:  new Set(["mixin","include","extend","each","while","else","error","warn","debug","forward","through","variable","interpolation","parent","selector","namespace","module","sass","scss","nesting","rule","declaration","property","value","default","global","important"]),
  yml:   new Set(["true","false","null","name","uses","with","runs","steps","jobs","needs","outputs","inputs","secrets","vars","environment","strategy","matrix","services","container","image","volumes","ports","networks","healthcheck","command","entrypoint","working","directory","timeout","retry","concurrency","permissions","defaults","reusable","workflow","trigger","push","pull","request","release","schedule","cron","branches","tags","paths","types","artifacts","cache","restore","keys","path","upload","download","deployment","approvals","reviewers","pages","packages","registry","docker","build","test","deploy","lint","coverage","report","notify","slack","email","include","exclude"]),
  yaml:  new Set(["true","false","null","name","uses","with","runs","steps","jobs","needs","outputs","inputs","secrets","vars","environment","strategy","matrix","services","container","image","volumes","ports","networks","healthcheck","command","entrypoint","working","directory","timeout","retry","concurrency","permissions","defaults","reusable","workflow","trigger","push","pull","request","release","schedule","cron","branches","tags","paths","types","artifacts","cache","restore","keys","path","upload","download","deployment","approvals","reviewers","pages","packages","registry","docker","build","test","deploy","lint","coverage","report","notify","slack","email","include","exclude"]),
  json:  new Set(["true","false","null","name","version","description","keywords","license","author","main","module","types","files","scripts","dependencies","devdependencies","peerdependencies","optionaldependencies","engines","repository","bugs","homepage","private","workspaces","exports","imports","type","config","publishconfig","resolutions","overrides"]),
  xml:   new Set(["version","encoding","xmlns","xsi","type","schema","location","element","attribute","complextype","simpletype","sequence","choice","restriction","extension","include","redefine","annotation","documentation","appinfo","notation","field","selector","unique","keyref","substitution","group","attributegroup","list","union","enumeration","pattern","minlength","maxlength","length","mininclusive","maxinclusive","minexclusive","maxexclusive","fractiondigits","totaldigits","whitespace","nillable","abstract","block","final","mixed","target","namespace","elementformdefault","attributeformdefault","blockdefault","finaldefault","lang","base","value","fixed","default","form","processcontents"]),
  toml:  new Set(["true","false","name","version","description","edition","authors","license","repository","homepage","documentation","keywords","categories","workspace","members","dependencies","devdependencies","builddependencies","features","profile","release","debug","test","bench","default","path","optional","package","build","resolver","patch","replace","source","registry","target","compiler","linker","rustflags","incremental","overflow","checks","panic","codegen","units","lto","strip","debuginfo","splitdebuginfo","rpath","binaries","examples","tests","benches","library"]),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function wcBuildStopWords(exts) {
  const combined = new Set(WC_STOP_WORDS);
  const hasCode = exts.some((e) => e !== "md" && e !== "txt");
  if (hasCode) {
    for (const w of WC_LANG_STOP_WORDS._code) combined.add(w);
  }
  for (const ext of exts) {
    const s = WC_LANG_STOP_WORDS[ext];
    if (s) for (const w of s) combined.add(w);
  }
  return combined;
}

function wcEsc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function extractWordsFromMarkdown(text, stopWords = WC_STOP_WORDS) {
  return text
    // Strip import/package/require/include/using/namespace declarations
    .replace(/^\s*(import|export\s+\{[^}]*\}|export\s+\*|package|require|#include|#import|using|namespace|from\s+['"][^'"]+['"]\s*(import)?|@[A-Za-z]+)\b.*/gm, "")
    // Strip markdown code blocks
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]+`/g, "")
    // Strip markdown links (keep label)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Strip URLs
    .replace(/https?:\/\/\S+/g, "")
    // Strip punctuation / operators
    .replace(/[#*_~>`|!\[\](){}=\-+]/g, " ")
    .toLowerCase()
    .split(/[^a-zàâäéèêëïîôùûü']+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter((w) => w.length > 3 && !stopWords.has(w));
}

function renderWordCloud(list) {
  const canvas = document.getElementById("wc-canvas");
  const body   = document.getElementById("wc-body");
  canvas.width  = body.clientWidth;
  canvas.height = body.clientHeight;

  const isDark = document.documentElement.classList.contains("dark");
  const colors = isDark
    ? ["#60a5fa","#34d399","#f9a8d4","#a78bfa","#fbbf24","#6ee7b7","#93c5fd","#fb923c"]
    : ["#1d4ed8","#047857","#7c3aed","#b45309","#be123c","#0369a1","#4338ca","#c2410c"];

  const maxFreq  = list[0][1];
  const wordList = list.map(([w, n]) => [w, Math.max(10, Math.round((72 * n) / maxFreq))]);

  document.getElementById("wc-status").classList.add("hidden");
  canvas.classList.remove("hidden");

  WordCloud(canvas, {
    list: wordList,
    gridSize: Math.round((8 * canvas.width) / 1024),
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    color: () => colors[Math.floor(Math.random() * colors.length)],
    backgroundColor: isDark ? "#030712" : "#ffffff",
    rotateRatio: 0.3,
    minSize: 10,
  });
}

// ── Browser (folder picker) ───────────────────────────────────────────────────

let _wcBrowseParent  = null;
let _wcBrowseCurrent = "";

function wcToggleBrowser() {
  const browser  = document.getElementById("wc-browser");
  const isHidden = browser.classList.toggle("hidden");
  if (!isHidden) wcLoadBrowse(_wcBrowseCurrent || document.getElementById("wc-root").value || "/");
}

async function wcLoadBrowse(dirPath) {
  const list = document.getElementById("wc-browse-list");
  list.innerHTML = '<p class="px-3 py-4 text-xs text-gray-400 text-center">Loading…</p>';
  try {
    const data = await fetch("/api/browse?path=" + encodeURIComponent(dirPath)).then((r) => r.json());
    _wcBrowseCurrent = data.current;
    _wcBrowseParent  = data.parent;
    document.getElementById("wc-browse-path").textContent = data.current;
    document.getElementById("wc-browse-up").disabled = !data.parent;

    const rows = data.dirs.map((dir) =>
      `<button data-path="${wcEsc(dir.path)}" onclick="wcLoadBrowse(this.dataset.path)"
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <span class="text-gray-400 shrink-0">&#128193;</span>
        <span class="text-gray-700 dark:text-gray-300 truncate">${wcEsc(dir.name)}</span>
      </button>`
    );

    const selectBtn = `<button onclick="wcSelectFolder()" class="w-full px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-left font-medium border-t border-gray-100 dark:border-gray-800">
      &#10003; Select: <span class="font-mono">${wcEsc(data.current)}</span>
    </button>`;

    list.innerHTML = (rows.length
      ? rows.join("")
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
  document.getElementById("wc-root").value = _wcBrowseCurrent;
  localStorage.setItem("wc-root", _wcBrowseCurrent);
  document.getElementById("wc-browser").classList.add("hidden");
}

// ── Persistence (localStorage) ────────────────────────────────────────────────

function wcSaveExts() {
  const exts = [...document.querySelectorAll(".wc-ext:checked")].map((cb) => cb.value);
  localStorage.setItem("wc-exts", JSON.stringify(exts));
}

function wcRestorePrefs() {
  const savedRoot = localStorage.getItem("wc-root");
  if (savedRoot) {
    document.getElementById("wc-root").value = savedRoot;
    _wcBrowseCurrent = savedRoot;
  }
  const savedExts = localStorage.getItem("wc-exts");
  if (savedExts) {
    try {
      const exts = JSON.parse(savedExts);
      document.querySelectorAll(".wc-ext").forEach((cb) => {
        cb.checked = exts.includes(cb.value);
      });
    } catch { /* ignore corrupt data */ }
  }
  document.querySelectorAll(".wc-ext").forEach((cb) => {
    cb.addEventListener("change", wcSaveExts);
  });
}

// ── Open / Launch / Close ─────────────────────────────────────────────────────

async function openWordCloud() {
  const overlay = document.getElementById("wc-overlay");
  const status  = document.getElementById("wc-status");
  const canvas  = document.getElementById("wc-canvas");
  overlay.classList.remove("hidden");
  status.textContent = "Choose a root folder and click Launch.";
  status.classList.remove("hidden");
  canvas.classList.add("hidden");

  const rootInput = document.getElementById("wc-root");
  if (!rootInput.value) {
    try {
      const cfg = await fetch("/api/config").then((r) => r.json());
      if (cfg.docsFolder) {
        rootInput.value  = cfg.docsFolder;
        _wcBrowseCurrent = cfg.docsFolder;
      }
    } catch { /* ignore */ }
  }
}

async function launchWordCloud() {
  const status = document.getElementById("wc-status");
  const canvas = document.getElementById("wc-canvas");
  const root   = document.getElementById("wc-root").value.trim();

  if (!root) {
    status.textContent = "Please select a root folder first.";
    status.classList.remove("hidden");
    return;
  }

  const exts = [...document.querySelectorAll(".wc-ext:checked")].map((cb) => cb.value);
  if (!exts.length) {
    status.textContent = "Please select at least one extension.";
    status.classList.remove("hidden");
    return;
  }

  document.getElementById("wc-browser").classList.add("hidden");
  status.textContent = "Reading files…";
  status.classList.remove("hidden");
  canvas.classList.add("hidden");

  try {
    const params = new URLSearchParams({ path: root });
    exts.forEach((e) => params.append("ext", e));
    const res = await fetch("/api/wordcloud?" + params);
    if (!res.ok) {
      const err = await res.json();
      status.textContent = "Error: " + (err.error || res.statusText);
      return;
    }
    const { files, text } = await res.json();
    status.textContent = `Analyzing ${files} file(s)…`;

    const stopWords = wcBuildStopWords(exts);
    const freq = {};
    for (const w of extractWordsFromMarkdown(text, stopWords)) {
      freq[w] = (freq[w] || 0) + 1;
    }

    const list = Object.entries(freq)
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 150);

    if (!list.length) {
      status.textContent = "Not enough words found.";
      return;
    }

    renderWordCloud(list);
  } catch (err) {
    status.textContent = "Error: " + err.message;
  }
}

function closeWordCloud() {
  document.getElementById("wc-overlay").classList.add("hidden");
}
