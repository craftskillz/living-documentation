import fs from "fs";
import path from "path";

// Storage shape: what is actually persisted in .living-doc.json.
// Paths are stored as POSIX-style paths RELATIVE to the docs folder, so the file
// is portable across machines (checkable into git).
export interface StoredConfig {
  filenamePattern: string;
  title: string;
  theme: "light" | "dark" | "system";
  language: "en" | "fr";
  port: number;
  extraFiles: string[]; // relative to docsFolder (posix slashes)
  showDiagramDebug: boolean;
  diagramNodePalette: string[] | null;
  diagramEdgePalette: string[] | null;
  sourceRoot: string | null; // relative to docsFolder (posix slashes); null = default ("..")
  blockedFileExtensions: string[];
  exclusiveFolderExpansion: boolean;
  exclusiveCategoryExpansion: boolean;
  codeBlockMaxHeight: number;
  markdownSoftBreaks: boolean;
}

// Runtime shape: what consumers receive from readConfig.
// Paths are resolved to absolute paths so the rest of the codebase can keep using them as-is.
export interface LivingDocConfig
  extends Omit<StoredConfig, "sourceRoot" | "extraFiles"> {
  docsFolder: string; // absolute, runtime only (not persisted)
  sourceRoot: string; // absolute, always present at runtime
  extraFiles: string[]; // absolute
}

const CONFIG_FILENAME = ".living-doc.json";

// Default palettes mirror DEFAULT_NODE_PALETTE bg values and DEFAULT_EDGE_PALETTE in constants.js.
// Stored explicitly so users see (and can edit) them in .living-doc.json from the start.
const DEFAULT_DIAGRAM_NODE_PALETTE = [
  "#ffffff", // c-white,
  "#f5f5f4", // c-gray
  "#f1f5f9", // c-slate
  "#dbeafe", // c-blue
  "#e0f2fe", // c-sky
  "#cffafe", // c-cyan
  "#ccfbf1", // c-teal
  "#dcfce7", // c-green
  "#ecfccb", // c-lime
  "#fef9c3", // c-amber
  "#ffedd5", // c-orange
  "#fee2e2", // c-red
  "#ffe4e6", // c-rose
  "#fce7f3", // c-pink
  "#ede9fe", // c-purple
];

const DEFAULT_DIAGRAM_EDGE_PALETTE = [
  "#ffffff",
  "#a8a29e",
  "#374151",
  "#3b82f6",
  "#14b8a6",
  "#22c55e",
  "#f97316",
  "#ef4444",
  "#a855f7",
];

const DEFAULT_BLOCKED_FILE_EXTENSIONS = [
  "exe",
  "sh",
  "bat",
  "cmd",
  "com",
  "scr",
  "ps1",
  "msi",
];

const STORAGE_DEFAULTS: StoredConfig = {
  filenamePattern: "YYYY_MM_DD_HH_mm_[Category]_title",
  title: "Living Documentation",
  theme: "system",
  language: "en",
  port: 4321,
  extraFiles: [],
  showDiagramDebug: false,
  diagramNodePalette: DEFAULT_DIAGRAM_NODE_PALETTE,
  diagramEdgePalette: DEFAULT_DIAGRAM_EDGE_PALETTE,
  sourceRoot: null,
  blockedFileExtensions: DEFAULT_BLOCKED_FILE_EXTENSIONS,
  exclusiveFolderExpansion: false,
  exclusiveCategoryExpansion: false,
  codeBlockMaxHeight: 400,
  markdownSoftBreaks: false,
};

export function getConfigPath(docsPath: string): string {
  return path.join(docsPath, CONFIG_FILENAME);
}

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

function toRelativeStorage(docsPath: string, abs: string): string | null {
  try {
    const rel = path.relative(path.resolve(docsPath), path.resolve(abs));
    if (path.isAbsolute(rel)) return null;
    return toPosix(rel) || ".";
  } catch {
    return null;
  }
}

function resolveRelative(docsPath: string, rel: string): string {
  return path.resolve(docsPath, rel);
}

// Reads raw JSON, migrates any legacy absolute paths and the removed docsFolder field
// in-memory, and writes back if anything changed. Returns the storage-shape config.
function readAndMigrate(docsPath: string): StoredConfig {
  const configPath = getConfigPath(docsPath);
  if (!fs.existsSync(configPath)) {
    return { ...STORAGE_DEFAULTS };
  }
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch {
    return { ...STORAGE_DEFAULTS };
  }
  let dirty = false;

  // docsFolder was stored historically — now purely runtime. Drop it silently.
  if ("docsFolder" in raw) {
    delete raw.docsFolder;
    dirty = true;
  }

  // Migrate sourceRoot: absolute → relative (or null if conversion impossible).
  if (typeof raw.sourceRoot === "string" && path.isAbsolute(raw.sourceRoot)) {
    const rel = toRelativeStorage(docsPath, raw.sourceRoot);
    if (rel !== null) {
      console.warn(
        `[living-doc] Migrating sourceRoot to relative path: "${rel}"`,
      );
      raw.sourceRoot = rel;
    } else {
      console.warn(
        `[living-doc] Could not convert sourceRoot to a relative path; resetting to default.`,
      );
      raw.sourceRoot = null;
    }
    dirty = true;
  }

  // Migrate extraFiles: absolute entries → relative. Drop entries that can't be converted.
  if (Array.isArray(raw.extraFiles)) {
    const migrated: string[] = [];
    let changed = false;
    for (const entry of raw.extraFiles as unknown[]) {
      if (typeof entry !== "string") {
        changed = true;
        continue;
      }
      if (path.isAbsolute(entry)) {
        const rel = toRelativeStorage(docsPath, entry);
        if (rel !== null) {
          console.warn(
            `[living-doc] Migrating extraFile to relative: "${rel}"`,
          );
          migrated.push(rel);
        } else {
          console.warn(
            `[living-doc] Could not convert extraFile "${entry}" — dropping it.`,
          );
        }
        changed = true;
      } else {
        const normalized = toPosix(entry);
        migrated.push(normalized);
        if (normalized !== entry) changed = true;
      }
    }
    if (changed) {
      raw.extraFiles = migrated;
      dirty = true;
    }
  }

  if (dirty) {
    try {
      fs.writeFileSync(configPath, JSON.stringify(raw, null, 2), "utf-8");
    } catch {
      // Non-fatal: config is read-only or disk is full. Runtime view still works.
    }
  }

  return { ...STORAGE_DEFAULTS, ...(raw as Partial<StoredConfig>) };
}

export function readConfig(docsPath: string): LivingDocConfig {
  const stored = readAndMigrate(docsPath);
  const absDocsPath = path.resolve(docsPath);
  const sourceRoot =
    stored.sourceRoot === null
      ? path.dirname(absDocsPath)
      : resolveRelative(absDocsPath, stored.sourceRoot);
  const extraFiles = stored.extraFiles.map((rel) =>
    resolveRelative(absDocsPath, rel),
  );
  const { sourceRoot: _omitSrc, extraFiles: _omitExtra, ...rest } = stored;
  void _omitSrc;
  void _omitExtra;
  return {
    ...rest,
    docsFolder: absDocsPath,
    sourceRoot,
    extraFiles,
  };
}

// Callers pass the storage-shape (paths relative to docsFolder, POSIX slashes).
// Values are normalised to POSIX before write so the file stays portable across OSes.
export function writeConfig(
  docsPath: string,
  patch: Partial<StoredConfig>,
): LivingDocConfig {
  const stored = readAndMigrate(docsPath);
  const updated: StoredConfig = { ...stored, ...patch };
  if ("sourceRoot" in patch && typeof updated.sourceRoot === "string") {
    updated.sourceRoot = toPosix(updated.sourceRoot);
  }
  if ("extraFiles" in patch && Array.isArray(updated.extraFiles)) {
    updated.extraFiles = updated.extraFiles.map((p) => toPosix(p));
  }
  fs.writeFileSync(
    getConfigPath(docsPath),
    JSON.stringify(updated, null, 2),
    "utf-8",
  );
  return readConfig(docsPath);
}
