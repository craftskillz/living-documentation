<script lang="ts">
  import { t } from "../i18n.svelte";

  declare global {
    interface Window {
      WordCloud?: (el: HTMLElement, opts: any) => void;
    }
  }

  let { open, onclose }: { open: boolean; onclose: () => void } = $props();

  // ── Human stop words (English + French) ──────────────────────────────────
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

  // ── Programming stop words (aggressive) ──────────────────────────────────
  const WC_PROG_STOP_WORDS = new Set([
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
    "get","set","add","remove","update","create","find","fetch","load","save",
    "put","post","patch","list","map","filter","reduce","sort","merge","parse",
    "format","convert","transform","validate","check","handle","process",
    "execute","start","stop","reset","clear","close","open","read","write",
    "send","receive","emit","trigger","dispatch","subscribe","unsubscribe",
    "listen","notify","register","unregister","bind","apply","call","invoke",
    "callback","handler","listener","middleware","interceptor","resolver",
    "provider","consumer","producer","builder","factory","adapter","wrapper",
    "proxy","decorator","observer","visitor","strategy","command","controller",
    "service","repository","dao","dto","entity","model","schema","config",
    "context","state","store","action","reducer","selector","hook","ref",
    "effect","memo","component","module","plugin","extension","util","utils",
    "helper","helpers","common","shared","base","default","index","app","core",
    "lib","src","test","spec","mock","stub","fixture","impl","internal","api",
    "sdk","client","server",
    "request","response","status","code","error","exception","message","result",
    "data","value","key","name","label","title","description","item","element",
    "node","child","parent","root","container","wrapper","layout","view","page",
    "screen","panel","header","footer","sidebar","navbar","body","content",
    "section","row","col","column","grid","flex","block","inline","span","div",
    "input","output","param","params","arg","option","options","props","attr",
    "attrs","field","fields","property","properties","method","methods",
    "string","number","boolean","integer","float","double","long","short",
    "byte","char","array","object","map","set","list","vector","queue","stack",
    "hash","table","tree","graph","pair","tuple","optional","nullable","void",
    "unit","any","bool","bytes","none","int","str","bool",
    "all","each","every","some","many","single","multi","first","last","next",
    "prev","previous","current","old","temp","tmp","new","top","bottom",
    "left","right","center","middle","start","end","begin","min","max",
    "count","total","sum","avg","size","length","width","height","depth",
    "flag","num","idx",
    "id","uid","uuid","num","str","val","obj","arr","fn","cb","ctx","req",
    "res","err","msg","src","dst","evt","doc","db","io","fs","os","env","sys",
    "http","https","url","uri","path","port","host","tcp","udp","ssl","tls",
    "html","css","json","xml","yml","yaml","csv","sql","regex","utf","ascii",
    "rgb","rgba","hex","px","em","rem","vh","vw","auto","inherit","initial",
    "application","file","local","source","messages","logging","alerting",
    "programmed","offset","offsets","zone","zoned","decimal","big","integer",
    "constructor","mapper","captor","publisher","verify","subscriber",
    "org","edr","ack","ref","ssr","ssg","csr","isr",
    "mockito","junit","vitest","jest","mocha","rspec","pytest","cypress",
    "playwright","captor","spy","given","then","verify","times","never",
    "invocation","argumentcaptor","inorder","donothing","doreturn",
    "ippon","springframework","jakarta","javax",
    "todo","fixme","hack","note","deprecated","experimental","eslint","prettier",
    "typescript","javascript","java","kotlin","python","golang","rust","csharp",
    "swift","ruby","spring","boot","javax","jakarta","hibernate","lombok",
    "gradle","maven","webpack","vite","react","angular","vue","svelte","nuxt",
    "express","fastapi","flask","django","rails","fiber","gin","actix","tokio",
    "asyncio","junit","jest","mocha","pytest","rspec","docker","kubernetes",
    "aws","gcp","azure","terraform","ansible","nginx","apache","linux",
    "nextjs","remix","astro","sveltekit","gatsby","nuxtjs","qwik","solid",
    "vercel","netlify","cloudflare","supabase","firebase","mongodb","postgres",
    "prisma","drizzle","typeorm","sequelize","mongoose","redis","neon",
    "trpc","graphql","grpc","rest","openapi","swagger","zod","yup","valibot",
    "tailwind","shadcn","radix","headless","chakra","mantine","antd","mui",
    "tanstack","tanstackquery","zustand","jotai","recoil","redux","mobx",
    "storybook","cypress","playwright","vitest","turbopack","turborepo",
    "getserversideprops","getstaticprops","getstaticpaths","generatestaticparams",
    "generatemetadata","serveraction","revalidate","notfound","redirect",
    "permanentredirect","unstablecache","unstablenostore","cookies","headers",
    "userouter","usepathname","usesearchparams","useparams","useformstate",
    "useformstatus","useoptimistic","useserveraction",
    "classname","onclick","onchange","onsubmit","onfocus","onblur","onkeydown",
    "onkeyup","onmousedown","onmouseup","defaultvalue","htmlfor","tabindex",
    "strokewidth","viewbox","fillopacity","strokeopacity","pathdata",
    "children","fragment","portal","suspense","errorboundary","strictmode",
    "createelement","createcontext","createref","forwardref",
    "usestate","useeffect","useref","usecontext","usememo","usecallback",
    "usereducer","useid","usetransition","usedeferredvalue","useimperativehandle",
    "mutex","lock","thread","goroutine","coroutine","channel","buffer","stream",
    "pipe","observable","promise","future","completable","deferred","disposable",
    "lifecycle","scope",
    "annotation","attribute","metadata","reflection","generic","template",
    "macro","preprocessor","compiler","runtime","debug","release","production",
    "development","staging","build","deploy","lint","coverage","report",
    "the","and","for","are","but","not","you","all","this","that","with",
    "have","from","they","will","been","can","has","was","its","our","their",
    "more","also","when","what","about","which","would","into","than","then",
    "each","just","over","after","such","here","some","were","very","only",
  ]);

  function wcIsStopWord(w: string): boolean {
    return (
      WC_HUMAN_STOP_WORDS.has(w) ||
      WC_PROG_STOP_WORDS.has(w) ||
      w.length < 3 ||
      /^\d+$/.test(w) ||
      /^[^a-z]/.test(w)
    );
  }

  // ── Identifier splitter ──────────────────────────────────────────────────
  function splitIdentifier(word: string): string[] {
    return word
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .replace(/[_\-./]+/g, " ")
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((w) => w.length >= 3);
  }

  // ── Text tokenizer ───────────────────────────────────────────────────────
  function wcTokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^a-zàâäéèêëïîôùûü]+/)
      .filter((w) => w.length >= 3);
  }

  // ── Language-aware word extractor ────────────────────────────────────────
  // Single source of truth for supported extensions, sorted alphabetically.
  // cat drives tokenization; `jsx` enables extra JSX stripping; `def` = checked by default.
  type ExtCat = "prose" | "code" | "config";
  const EXT_DEFS: { value: string; cat: ExtCat; jsx?: boolean; def?: boolean }[] = [
    { value: "adoc", cat: "prose" }, { value: "asciidoc", cat: "prose" },
    { value: "asm", cat: "code" }, { value: "astro", cat: "code" },
    { value: "avsc", cat: "config" }, { value: "bash", cat: "code" },
    { value: "bat", cat: "code" }, { value: "bicep", cat: "config" },
    { value: "c", cat: "code" }, { value: "cc", cat: "code" },
    { value: "cfg", cat: "config" }, { value: "cjs", cat: "code" },
    { value: "clj", cat: "code" }, { value: "cljs", cat: "code" },
    { value: "cmake", cat: "code" }, { value: "cmd", cat: "code" },
    { value: "conf", cat: "config" }, { value: "cpp", cat: "code" },
    { value: "cql", cat: "code" }, { value: "cs", cat: "code" },
    { value: "cshtml", cat: "code" }, { value: "css", cat: "config" },
    { value: "cxx", cat: "code" }, { value: "dart", cat: "code" },
    { value: "env", cat: "config" }, { value: "erb", cat: "code" },
    { value: "erl", cat: "code" }, { value: "ex", cat: "code" },
    { value: "exs", cat: "code" }, { value: "fish", cat: "code" },
    { value: "fs", cat: "code" }, { value: "fsx", cat: "code" },
    { value: "go", cat: "code" }, { value: "gql", cat: "code" },
    { value: "gradle", cat: "code" }, { value: "graphql", cat: "code" },
    { value: "groovy", cat: "code" }, { value: "h", cat: "code" },
    { value: "hcl", cat: "config" }, { value: "hpp", cat: "code" },
    { value: "hs", cat: "code" }, { value: "html", cat: "config" },
    { value: "ini", cat: "config" }, { value: "java", cat: "code" },
    { value: "jl", cat: "code" }, { value: "js", cat: "code" },
    { value: "json", cat: "config" }, { value: "jsx", cat: "code", jsx: true },
    { value: "kt", cat: "code" }, { value: "less", cat: "config" },
    { value: "lua", cat: "code" }, { value: "m", cat: "code" },
    { value: "md", cat: "prose", def: true }, { value: "mdx", cat: "prose" },
    { value: "mjs", cat: "code" }, { value: "mk", cat: "code" },
    { value: "ml", cat: "code" }, { value: "mli", cat: "code" },
    { value: "mm", cat: "code" }, { value: "nim", cat: "code" },
    { value: "php", cat: "code" }, { value: "pl", cat: "code" },
    { value: "prisma", cat: "code" }, { value: "properties", cat: "config" },
    { value: "proto", cat: "code" }, { value: "ps1", cat: "code" },
    { value: "py", cat: "code" }, { value: "r", cat: "code" },
    { value: "razor", cat: "code" }, { value: "rb", cat: "code" },
    { value: "rs", cat: "code" }, { value: "rst", cat: "prose" },
    { value: "s", cat: "code" }, { value: "scala", cat: "code" },
    { value: "scss", cat: "config" }, { value: "sh", cat: "code" },
    { value: "sol", cat: "code" }, { value: "sql", cat: "code" },
    { value: "styl", cat: "config" }, { value: "svelte", cat: "code" },
    { value: "swift", cat: "code" }, { value: "tex", cat: "prose" },
    { value: "tf", cat: "config" }, { value: "tfvars", cat: "config" },
    { value: "thrift", cat: "code" }, { value: "toml", cat: "config" },
    { value: "ts", cat: "code" }, { value: "tsx", cat: "code", jsx: true },
    { value: "txt", cat: "prose" }, { value: "v", cat: "code" },
    { value: "vb", cat: "code" }, { value: "vue", cat: "code" },
    { value: "xml", cat: "config" }, { value: "yaml", cat: "config" },
    { value: "yml", cat: "config" }, { value: "zig", cat: "code" },
    { value: "zsh", cat: "code" },
  ];
  const WC_PROSE_EXTS = new Set(EXT_DEFS.filter((e) => e.cat === "prose").map((e) => e.value));
  const WC_CODE_EXTS = new Set(EXT_DEFS.filter((e) => e.cat === "code").map((e) => e.value));
  const WC_CONFIG_EXTS = new Set(EXT_DEFS.filter((e) => e.cat === "config").map((e) => e.value));
  const WC_JSX_EXTS = new Set(EXT_DEFS.filter((e) => e.jsx).map((e) => e.value));

  function extractWordsFromFile(text: string, ext: string): string[] {
    const words: string[] = [];

    if (WC_PROSE_EXTS.has(ext)) {
      const clean = text
        .replace(
          /^\s*(import|export\s+\{[^}]*\}|export\s+\*|package|require|#include|from\s+['"][^'"]+['"]\s*(import)?)\b.*/gm,
          "",
        )
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`[^`\n]+`/g, " ")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/[#*_~>`|!\[\](){}=+\-]/g, " ");
      words.push(...wcTokenize(clean));
    } else if (WC_CODE_EXTS.has(ext)) {
      if (WC_JSX_EXTS.has(ext)) {
        text = text.replace(/<\/?[A-Z][A-Za-z0-9.]*[^>]*>/g, " ");
        text = text.replace(
          /<\/?(div|span|main|section|article|aside|nav|header|footer|form|input|button|select|option|textarea|table|thead|tbody|tr|td|th|ul|ol|li|a|img|p|h[1-6]|label|figure|figcaption|picture|video|audio|canvas|svg|path|circle|rect|g|defs|use|link|meta|head|html|body|script|style|br|hr|strong|em|code|pre|blockquote|small|sub|sup)\b[^>]*>/gi,
          " ",
        );
        text = text.replace(
          /\b(className|onClick|onChange|onSubmit|onFocus|onBlur|onKeyDown|onKeyUp|onMouseDown|onMouseUp|htmlFor|tabIndex|strokeWidth|viewBox|fillOpacity|strokeOpacity|defaultValue|placeholder|disabled|checked|readOnly|required|multiple|autoFocus|autoComplete|type|href|src|alt|width|height|style|key|ref)\s*=/g,
          " =",
        );
      }

      text = text.replace(
        /^\s*(import\s+[\w.*{},\s'"@/-]+;?|from\s+['"][^'"]+['"]\s*;?|package\s+[\w.]+;?|namespace\s+[\w.]+;?|using\s+[\w.]+;?|require\s*\(?\s*['"][^'"]+['"]\s*\)?;?)\s*$/gm,
        "",
      );

      text.replace(/(?:\/\/|#(?!.*[{}[\]<>])| -- )\s*(.+)$/gm, (_, c) => {
        words.push(...wcTokenize(c));
        return _;
      });

      text.replace(/\/\*[\s\S]*?\*\//g, (c) => {
        words.push(...wcTokenize(c));
        return c;
      });

      text.replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, (c) => {
        words.push(...wcTokenize(c));
        return c;
      });

      text.replace(
        /["'`]([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s,.'éàèùâêîôûç]{3,})["'`]/g,
        (_, s) => {
          words.push(...wcTokenize(s));
          return _;
        },
      );

      text.replace(/\b([A-Za-z][A-Za-z0-9_]{2,})\b/g, (_, id) => {
        words.push(...splitIdentifier(id));
        return _;
      });
    } else if (WC_CONFIG_EXTS.has(ext)) {
      text.replace(/:\s*["']([^"']{3,})["']/g, (_, v) => {
        words.push(...wcTokenize(v));
        return _;
      });
      text.replace(/\b([A-Za-z][A-Za-z0-9_]{2,})\b/g, (_, id) => {
        words.push(...splitIdentifier(id));
        return _;
      });
    }

    return words.filter((w) => !wcIsStopWord(w));
  }

  // ── Reactive state ───────────────────────────────────────────────────────
  let rootValue = $state("");
  let excludeValue = $state("");
  let minFiles = $state(1);
  let statusText = $state("");
  let showStatus = $state(true);
  let showSidebar = $state(false);

  // extension checkboxes — flat, alphabetically sorted, derived from EXT_DEFS
  type ExtDef = { value: string; label: string; checked: boolean };
  let exts = $state<ExtDef[]>(
    EXT_DEFS.map((e) => ({ value: e.value, label: "." + e.value, checked: !!e.def })),
  );

  function checkedExts(): string[] {
    return exts.filter((e) => e.checked).map((e) => e.value);
  }

  let allToggled = $derived(exts.every((e) => e.checked));

  // analysis result
  let wordFreq: Map<string, number> | null = $state(null);
  let wordFiles: Map<string, Set<string>> | null = $state(null);
  let totalFiles = $state(0);

  // stats / top-list (derived from a render pass)
  type TopEntry = { word: string; freq: number; pct: number };
  let stats = $state<{ scanned: number; unique: number; shown: number } | null>(null);
  let foundExts = $state<string[]>([]);
  let topList = $state<TopEntry[]>([]);

  // detail panel
  let detailOpen = $state(false);
  let detailWord = $state("");
  let detailFreq = $state(0);
  let detailFiles = $state<string[]>([]);

  // ── persistence ──────────────────────────────────────────────────────────
  function saveExts() {
    localStorage.setItem("wc-exts", JSON.stringify(checkedExts()));
  }

  function toggleAllExts() {
    const all = allToggled;
    exts = exts.map((e) => ({ ...e, checked: !all }));
    saveExts();
  }

  function onExtChange() {
    saveExts();
  }

  function wcGetExcludeSet(): Set<string> {
    return new Set(
      (excludeValue || "")
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  function wcAddExclude(item: string) {
    const existing = wcGetExcludeSet();
    if (existing.has(item)) return;
    existing.add(item);
    excludeValue = [...existing].join(", ");
    localStorage.setItem("wc-exclude", excludeValue);
    if (exclBrowserOpen) wcExclLoadBrowse(exclBrowseCurrent);
    refreshDetailPanel();
  }

  function onExcludeChange() {
    localStorage.setItem("wc-exclude", excludeValue);
    if (exclBrowserOpen) wcExclLoadBrowse(exclBrowseCurrent);
    refreshDetailPanel();
  }

  function refreshDetailPanel() {
    if (detailOpen && detailWord) wcShowDetail(detailWord);
  }

  function wcApplyFilter() {
    if (wordFreq) wcRender();
  }

  function wcRestorePrefs() {
    const savedRoot = localStorage.getItem("wc-root");
    if (savedRoot) {
      rootValue = savedRoot;
      browseCurrent = savedRoot;
    }
    const savedExclude = localStorage.getItem("wc-exclude");
    if (savedExclude) excludeValue = savedExclude;
    const savedExts = localStorage.getItem("wc-exts");
    if (savedExts) {
      try {
        const saved: string[] = JSON.parse(savedExts);
        exts = exts.map((e) => ({ ...e, checked: saved.includes(e.value) }));
      } catch {
        /* ignore corrupt data */
      }
    }
  }

  // ── exclude browser ────────────────────────────────────────────────────────
  type BrowseRow =
    | { kind: "dir"; name: string; path: string; entry: string }
    | { kind: "file"; name: string; entry: string };

  let exclBrowserOpen = $state(false);
  let exclBrowseParent: string | null = $state(null);
  let exclBrowseCurrent = $state("");
  let exclBrowsePath = $state("");
  let exclBrowseRows = $state<BrowseRow[] | null>(null);
  let exclBrowseMsg = $state("");

  function wcToggleExcludeBrowser() {
    exclBrowserOpen = !exclBrowserOpen;
    if (exclBrowserOpen) {
      const start = exclBrowseCurrent || rootValue || "/";
      wcExclLoadBrowse(start);
    }
  }

  async function wcExclLoadBrowse(dirPath: string) {
    exclBrowseRows = null;
    exclBrowseMsg = "Loading…";
    try {
      const data = await fetch(
        "/api/browse?all=1&path=" + encodeURIComponent(dirPath),
      ).then((r) => r.json());
      exclBrowseCurrent = data.current;
      exclBrowseParent = data.parent;
      exclBrowsePath = data.current;

      const root = rootValue.trim();
      const exclusionEntry = (absPath: string, name: string) =>
        root && absPath.startsWith(root + "/")
          ? absPath.slice(root.length + 1)
          : name;

      const excluded = wcGetExcludeSet();

      const dirRows: BrowseRow[] = (data.dirs || [])
        .filter(
          (dir: any) => !excluded.has(exclusionEntry(dir.path, dir.name)),
        )
        .map((dir: any) => ({
          kind: "dir" as const,
          name: dir.name,
          path: dir.path,
          entry: exclusionEntry(dir.path, dir.name),
        }));

      const exts = checkedExts();
      const fileRows: BrowseRow[] = (data.files || [])
        .filter((f: any) => exts.some((e) => f.name.endsWith("." + e)))
        .filter((f: any) => !excluded.has(exclusionEntry(f.path, f.name)))
        .map((f: any) => ({
          kind: "file" as const,
          name: f.name,
          entry: exclusionEntry(f.path, f.name),
        }));

      const all = [...dirRows, ...fileRows];
      exclBrowseRows = all;
      exclBrowseMsg = all.length ? "" : "Empty directory";
    } catch {
      exclBrowseRows = [];
      exclBrowseMsg = "Cannot read directory";
    }
  }

  function wcExclBrowseUp() {
    if (exclBrowseParent) wcExclLoadBrowse(exclBrowseParent);
  }

  // ── folder picker browser ──────────────────────────────────────────────────
  type FolderRow = { name: string; path: string };

  let browserOpen = $state(false);
  let browseParent: string | null = $state(null);
  let browseCurrent = $state("");
  let browsePath = $state("");
  let browseRows = $state<FolderRow[] | null>(null);
  let browseMsg = $state("");

  function wcToggleBrowser() {
    browserOpen = !browserOpen;
    if (browserOpen) wcLoadBrowse(browseCurrent || rootValue || "/");
  }

  async function wcLoadBrowse(dirPath: string) {
    browseRows = null;
    browseMsg = "Loading…";
    try {
      const data = await fetch(
        "/api/browse?path=" + encodeURIComponent(dirPath),
      ).then((r) => r.json());
      browseCurrent = data.current;
      browseParent = data.parent;
      browsePath = data.current;
      browseRows = (data.dirs || []).map((dir: any) => ({
        name: dir.name,
        path: dir.path,
      }));
      browseMsg = browseRows!.length ? "" : "No sub-folders";
    } catch {
      browseRows = [];
      browseMsg = "Cannot read directory";
    }
  }

  function wcBrowseUp() {
    if (browseParent) wcLoadBrowse(browseParent);
  }

  function wcSelectFolder() {
    rootValue = browseCurrent;
    localStorage.setItem("wc-root", browseCurrent);
    browserOpen = false;
    excludeValue = "";
    localStorage.removeItem("wc-exclude");
    exclBrowseCurrent = browseCurrent;
  }

  // ── render ──────────────────────────────────────────────────────────────────
  let canvasEl = $state<HTMLCanvasElement>(null!);
  let canvasWrapEl = $state<HTMLDivElement>(null!);
  let canvasVisible = $state(false);

  function wcRender() {
    if (!wordFreq || !wordFiles) return;
    const min = Math.max(1, minFiles || 1);

    const allWords = [...wordFreq.entries()].sort((a, b) => b[1] - a[1]);
    const list = allWords
      .filter(([w]) => (wordFiles!.get(w) || new Set()).size >= min)
      .slice(0, 150);

    if (!list.length) {
      const total = allWords.length;
      statusText = total
        ? `${total} domain word(s) found but none appear in ${min}+ file(s). Lower the "Min files" threshold to 1.`
        : "No domain words extracted. Try adding more file extensions or a broader folder.";
      showStatus = true;
      canvasVisible = false;
      showSidebar = false;
      return;
    }

    const uniqueDomain = [...wordFreq.keys()].filter(
      (w) => (wordFiles!.get(w) || new Set()).size >= min,
    ).length;
    stats = {
      scanned: totalFiles,
      unique: uniqueDomain,
      shown: list.length,
    };

    const top50 = list.slice(0, 50);
    const maxF = top50[0][1];
    topList = top50.map(([w, n]) => ({
      word: w,
      freq: n,
      pct: Math.round((n / maxF) * 100),
    }));

    showSidebar = true;
    showStatus = false;

    const isDark = document.documentElement.classList.contains("dark");
    const colors = isDark
      ? ["#60a5fa","#34d399","#f9a8d4","#a78bfa","#fbbf24","#6ee7b7","#93c5fd","#fb923c","#4ade80","#f472b6"]
      : ["#1d4ed8","#047857","#7c3aed","#b45309","#be123c","#0369a1","#4338ca","#c2410c","#15803d","#9333ea"];

    requestAnimationFrame(() => {
      if (!canvasEl || !canvasWrapEl) return;
      const canvas = canvasEl;
      const wrap = canvasWrapEl;
      canvas.width = Math.max(400, wrap.offsetWidth);
      canvas.height = Math.max(300, wrap.offsetHeight);
      canvas.style.width = canvas.width + "px";
      canvas.style.height = canvas.height + "px";
      canvasVisible = true;

      const fontScale = Math.sqrt(
        (canvas.width * canvas.height) / (800 * 500),
      );
      const maxFont = Math.min(220, Math.round(72 * fontScale));
      const wordList = top50.map(([w, n]) => [
        w,
        Math.max(12, Math.round((maxFont * n) / maxF)),
      ]);

      window.WordCloud?.(canvas, {
        list: wordList,
        gridSize: Math.round((4 * canvas.width) / 1024),
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        color: () => colors[Math.floor(Math.random() * colors.length)],
        backgroundColor: isDark ? "#030712" : "#ffffff",
        rotateRatio: 0.2,
        minSize: 6,
        shrinkToFit: true,
        click: (item: any) => wcShowDetail(item[0]),
      });
    });
  }

  function wcShowDetail(word: string) {
    if (!wordFiles || !wordFreq) return;
    const files = [...(wordFiles.get(word) || [])].sort();
    const freq = wordFreq.get(word) || 0;
    detailWord = word;
    detailFreq = freq;
    detailFiles = files;
    detailOpen = true;
  }

  function wcCloseDetail() {
    detailOpen = false;
  }

  // ── launch ──────────────────────────────────────────────────────────────────
  async function launchWordCloud() {
    const root = rootValue.trim();
    if (!root) {
      statusText = "Please select a root folder first.";
      showStatus = true;
      return;
    }
    const exts = checkedExts();
    if (!exts.length) {
      statusText = "Please select at least one extension.";
      showStatus = true;
      return;
    }

    browserOpen = false;
    showSidebar = false;
    detailOpen = false;
    statusText = "Reading files…";
    showStatus = true;
    canvasVisible = false;

    try {
      const excludeRaw = excludeValue.trim();
      const excludeDirs = excludeRaw
        ? excludeRaw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
        : [];
      localStorage.setItem("wc-exclude", excludeRaw);

      const params = new URLSearchParams({ path: root });
      exts.forEach((e) => params.append("ext", e));
      excludeDirs.forEach((d) => params.append("exclude", d));
      const res = await fetch("/api/wordcloud?" + params);
      if (!res.ok) {
        const err = await res.json();
        statusText = "Error: " + (err.error || res.statusText);
        return;
      }
      const { files, fileTexts } = await res.json();
      statusText = `Analyzing ${files} file(s)…`;

      const freq = new Map<string, number>();
      const fileMap = new Map<string, Set<string>>();
      const extsSeen = new Set<string>();
      totalFiles = files;

      for (const { path: filePath, text } of fileTexts) {
        const ext = (filePath.split(".").pop() || "").toLowerCase();
        if (ext) extsSeen.add(ext);
        const words = extractWordsFromFile(text, ext);
        const seenInFile = new Set<string>();
        for (const w of words) {
          freq.set(w, (freq.get(w) || 0) + 1);
          if (!seenInFile.has(w)) {
            seenInFile.add(w);
            if (!fileMap.has(w)) fileMap.set(w, new Set());
            fileMap.get(w)!.add(filePath);
          }
        }
      }

      wordFreq = freq;
      wordFiles = fileMap;
      foundExts = [...extsSeen].sort().map((e) => "." + e);
      wcRender();
    } catch (err: any) {
      statusText = "Error: " + err.message;
    }
  }

  // ── open lifecycle ──────────────────────────────────────────────────────────
  let wasOpen = false;
  $effect(() => {
    if (open && !wasOpen) {
      wasOpen = true;
      // reset
      statusText = "Choose a root folder and click Launch.";
      showStatus = true;
      canvasVisible = false;
      showSidebar = false;
      detailOpen = false;
      wordFreq = null;
      wordFiles = null;
      stats = null;
      topList = [];
      browserOpen = false;
      exclBrowserOpen = false;
      minFiles = 1;

      wcRestorePrefs();

      if (!rootValue) {
        fetch("/api/config")
          .then((r) => r.json())
          .then((cfg) => {
            if (cfg.docsFolder) {
              rootValue = cfg.docsFolder;
              browseCurrent = cfg.docsFolder;
            }
          })
          .catch(() => {});
      }
    } else if (!open) {
      wasOpen = false;
    }
  });
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-950">
    <div
      class="flex items-center justify-between px-6 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0"
    >
      <h2 class="font-semibold text-base">{t("wc.title")}</h2>
      <button
        onclick={onclose}
        class="text-sm px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {t("wc.close_btn")}
      </button>
    </div>

    <!-- Search root toolbar -->
    <div class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
      <!-- Row 1: path + browse + launch -->
      <div class="flex items-center gap-3 px-6 py-3">
        <label class="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
          {t("wc.search_root_label")}
        </label>
        <input
          bind:value={rootValue}
          type="text"
          readonly
          spellcheck="false"
          class="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono cursor-default focus:outline-none"
        />
        <button
          onclick={wcToggleBrowser}
          class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
        >
          &#128193; <span>{t("wc.browse_btn")}</span>
        </button>
        <button
          onclick={launchWordCloud}
          class="text-sm px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shrink-0"
        >
          {t("wc.launch_btn")}
        </button>
      </div>

      <!-- Row 1b: exclude folders -->
      <div class="flex items-start gap-3 px-6 pb-2">
        <label class="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0 pt-1.5">
          {t("wc.exclude_label")}
        </label>
        <textarea
          bind:value={excludeValue}
          rows="3"
          spellcheck="false"
          placeholder={t("wc.exclude_placeholder")}
          oninput={onExcludeChange}
          class="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y"
        ></textarea>
        <button
          onclick={wcToggleExcludeBrowser}
          class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
        >
          &#128193; <span>{t("wc.browse_btn")}</span>
        </button>
      </div>

      <!-- Row 1c: exclude browser -->
      {#if exclBrowserOpen}
        <div class="border-t border-gray-200 dark:border-gray-700">
          <div
            class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
          >
            <button
              onclick={wcExclBrowseUp}
              disabled={!exclBrowseParent}
              class="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-30 disabled:pointer-events-none shrink-0"
            >
              &#8593; Up
            </button>
            <span
              class="font-mono text-xs text-gray-400 dark:text-gray-500 truncate flex-1 text-right"
            >{exclBrowsePath}</span>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-800 max-h-52 overflow-y-auto">
            {#if exclBrowseRows === null}
              <p class="px-3 py-4 text-xs text-gray-400 text-center">{exclBrowseMsg}</p>
            {:else if exclBrowseRows.length === 0}
              <p class="px-3 py-3 text-xs {exclBrowseMsg === 'Cannot read directory' ? 'text-red-400' : 'text-gray-400'} text-center">{exclBrowseMsg}</p>
            {:else}
              {#each exclBrowseRows as row}
                {#if row.kind === "dir"}
                  <div class="group flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <button
                      onclick={() => wcExclLoadBrowse(row.path)}
                      class="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-left"
                    >
                      <span class="text-gray-400 shrink-0">&#128193;</span>
                      <span class="text-gray-700 dark:text-gray-300 truncate">{row.name}</span>
                    </button>
                    <button
                      onclick={() => wcAddExclude(row.entry)}
                      title="Add to exclusions"
                      class="shrink-0 text-red-400 hover:text-red-600 px-3 py-2 text-sm font-bold transition-colors"
                    >⊖</button>
                  </div>
                {:else}
                  <div class="group flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <span class="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      <span class="shrink-0 opacity-40">&#128196;</span>
                      <span class="truncate font-mono">{row.name}</span>
                    </span>
                    <button
                      onclick={() => wcAddExclude(row.entry)}
                      title="Add to exclusions"
                      class="shrink-0 text-red-400 hover:text-red-600 px-3 py-2 text-sm font-bold transition-colors"
                    >⊖</button>
                  </div>
                {/if}
              {/each}
            {/if}
          </div>
        </div>
      {/if}

      <!-- Row 2: extension checkboxes -->
      <div class="flex items-center gap-x-4 gap-y-2 px-6 pb-3 flex-wrap">
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
          {t("wc.extensions_label")}
        </span>
        <label class="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 cursor-pointer shrink-0">
          <input type="checkbox" checked={allToggled} onchange={toggleAllExts} />
          {t("wc.all_btn")}
        </label>
        {#each exts as ext (ext.value)}
          <label class="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={ext.checked}
              onchange={onExtChange}
            />
            {ext.label}
          </label>
        {/each}
      </div>

      <!-- Row 3: folder browser -->
      {#if browserOpen}
        <div class="border-t border-gray-200 dark:border-gray-700">
          <div
            class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
          >
            <button
              onclick={wcBrowseUp}
              disabled={!browseParent}
              class="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-30 disabled:pointer-events-none shrink-0"
            >
              &#8593; Up
            </button>
            <span
              class="font-mono text-xs text-gray-400 dark:text-gray-500 truncate flex-1 text-right"
            >{browsePath}</span>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-800 max-h-52 overflow-y-auto">
            {#if browseRows === null}
              <p class="px-3 py-4 text-xs text-gray-400 text-center">{browseMsg}</p>
            {:else}
              {#if browseRows.length === 0}
                <p class="px-3 py-3 text-xs {browseMsg === 'Cannot read directory' ? 'text-red-400' : 'text-gray-400'} text-center">{browseMsg}</p>
              {:else}
                {#each browseRows as dir}
                  <div class="group flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <button
                      onclick={() => wcLoadBrowse(dir.path)}
                      class="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-left"
                    >
                      <span class="text-gray-400 shrink-0">&#128193;</span>
                      <span class="text-gray-700 dark:text-gray-300 truncate">{dir.name}</span>
                    </button>
                    <button
                      onclick={() => wcAddExclude(dir.name)}
                      title="Exclude this folder"
                      class="shrink-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 px-3 py-2 text-sm transition-opacity"
                    >⊖</button>
                  </div>
                {/each}
              {/if}
              {#if browseMsg !== "Cannot read directory"}
                <button
                  onclick={wcSelectFolder}
                  class="w-full px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-left font-medium border-t border-gray-100 dark:border-gray-800"
                >
                  &#10003; Select: <span class="font-mono">{browsePath}</span>
                </button>
              {/if}
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <div class="flex-1 overflow-hidden flex">
      <!-- Left sidebar -->
      {#if showSidebar}
        <div
          class="w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900 overflow-hidden"
        >
          <div class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 space-y-0.5 border-b border-gray-100 dark:border-gray-800">
            {#if stats}
              <div>{stats.scanned} file(s) scanned</div>
              <div>{stats.unique} unique domain words</div>
              <div>{stats.shown} shown</div>
              {#if foundExts.length}
                <div title={foundExts.join(", ")}>
                  {foundExts.length} extension{foundExts.length > 1 ? "s" : ""} found ({foundExts.join(", ")})
                </div>
              {/if}
            {/if}
          </div>
          <div class="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <span class="text-xs text-gray-500 dark:text-gray-400 shrink-0 cursor-help" title={t("wc.min_files_hint")}>
              {t("wc.min_files_label")}
            </span>
            <input
              bind:value={minFiles}
              type="number"
              min="1"
              max="20"
              title={t("wc.min_files_hint")}
              class="w-12 px-1.5 py-0.5 text-xs rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none"
            />
            <button
              onclick={wcApplyFilter}
              title={t("wc.apply_hint")}
              class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t("wc.apply_btn")}
            </button>
          </div>
          <p class="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">
            {t("wc.top_words")}
          </p>
          <div class="flex-1 overflow-y-auto">
            {#each topList as entry, i}
              <div
                onclick={() => wcShowDetail(entry.word)}
                role="button"
                tabindex="0"
                class="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <span class="text-gray-400 dark:text-gray-600 w-5 text-right shrink-0 tabular-nums text-xs">{i + 1}</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-gray-800 dark:text-gray-200 font-medium truncate text-xs">{entry.word}</span>
                    <span class="text-gray-400 dark:text-gray-600 tabular-nums shrink-0 text-xs">{entry.freq}</span>
                  </div>
                  <div class="h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-0.5">
                    <div class="h-1 bg-blue-400 dark:bg-blue-600 rounded-full" style="width:{entry.pct}%"></div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Canvas / status area -->
      <div bind:this={canvasWrapEl} class="flex-1 relative overflow-hidden">
        {#if showStatus}
          <p class="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm animate-pulse">
            {statusText}
          </p>
        {/if}
        <canvas
          bind:this={canvasEl}
          class:hidden={!canvasVisible}
          style="position: absolute; inset: 0"
        ></canvas>
      </div>

      <!-- Right detail panel -->
      {#if detailOpen}
        <div
          class="w-80 shrink-0 border-l border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900 overflow-hidden"
        >
          <div class="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span class="font-bold text-sm text-gray-900 dark:text-gray-100">{detailWord}  ×{detailFreq}</span>
            <button
              onclick={wcCloseDetail}
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs leading-none"
            >
              ✕
            </button>
          </div>
          <p class="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">
            {t("wc.found_in")}
          </p>
          <div class="flex-1 overflow-y-auto px-3 py-1 space-y-1 text-xs">
            {#if detailFiles.length}
              {#each detailFiles as f}
                <div class="flex items-center gap-1 group py-0.5">
                  <span class="text-gray-600 dark:text-gray-400 break-all font-mono flex-1 text-xs">{f}</span>
                  <button
                    onclick={() => wcAddExclude(f)}
                    title="Exclude this file"
                    class="shrink-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs leading-none px-1 transition-opacity"
                  >⊖</button>
                </div>
              {/each}
            {:else}
              <div class="text-gray-400 text-center py-2">—</div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
