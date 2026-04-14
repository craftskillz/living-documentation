import fs from "fs";
import path from "path";

export interface LivingDocConfig {
  docsFolder: string;
  filenamePattern: string;
  title: string;
  theme: "light" | "dark" | "system";
  language: "en" | "fr";
  port: number;
  extraFiles: string[];
  showDiagramDebug: boolean;
  diagramNodePalette: string[] | null;
  diagramEdgePalette: string[] | null;
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

const DEFAULTS: LivingDocConfig = {
  docsFolder: ".",
  filenamePattern: "YYYY_MM_DD_HH_mm_[Category]_title",
  title: "Living Documentation",
  theme: "system",
  language: "en",
  port: 4321,
  extraFiles: [],
  showDiagramDebug: false,
  diagramNodePalette: DEFAULT_DIAGRAM_NODE_PALETTE,
  diagramEdgePalette: DEFAULT_DIAGRAM_EDGE_PALETTE,
};

export function getConfigPath(docsPath: string): string {
  return path.join(docsPath, CONFIG_FILENAME);
}

export function readConfig(docsPath: string): LivingDocConfig {
  const configPath = getConfigPath(docsPath);
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<LivingDocConfig>;
      return { ...DEFAULTS, ...parsed };
    }
  } catch {
    // corrupt config — return defaults
  }
  return { ...DEFAULTS, docsFolder: docsPath };
}

export function writeConfig(
  docsPath: string,
  patch: Partial<LivingDocConfig>,
): LivingDocConfig {
  const current = readConfig(docsPath);
  const updated: LivingDocConfig = { ...current, ...patch };
  const configPath = getConfigPath(docsPath);
  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}
