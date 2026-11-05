// How a file is shown in a preview: as text, image or video, or as an opaque
// binary. Shared by the Blueprint file viewer and the documentation explorer.
import fs from "node:fs";
import path from "node:path";

export const MAX_TEXT_BYTES = 1024 * 1024; // 1 MB
const BINARY_SNIFF_BYTES = 8000;

export const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".bmp", ".avif"]);
export const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv", ".ogv"]);

// Binary formats whose first bytes may hold no NUL byte (a PDF header, for instance).
const BINARY_EXTS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".odp", ".rtf", ".pages", ".numbers", ".key",
  ".zip", ".gz", ".tgz", ".tar", ".7z", ".rar", ".bz2", ".xz",
  ".mp3", ".wav", ".flac", ".ogg", ".m4a",
]);

const EXT_TO_LANGUAGE: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript", ".mts": "typescript",
  ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
  ".py": "python", ".rs": "rust", ".go": "go", ".java": "java",
  ".c": "c", ".h": "c", ".cpp": "cpp", ".cc": "cpp", ".cxx": "cpp", ".hpp": "cpp",
  ".cs": "csharp", ".rb": "ruby", ".php": "php", ".swift": "swift", ".kt": "kotlin",
  ".html": "html", ".htm": "html", ".css": "css", ".scss": "scss", ".sass": "scss",
  ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".toml": "toml",
  ".md": "markdown", ".mdx": "markdown",
  ".sh": "bash", ".bash": "bash", ".zsh": "bash",
  ".sql": "sql", ".xml": "xml", ".graphql": "graphql", ".gql": "graphql",
  ".dockerfile": "dockerfile", ".tf": "hcl", ".lua": "lua", ".r": "r",
};

export interface FilePreview {
  type: "text" | "image" | "video" | "binary";
  content?: string;
  language?: string;
  truncated?: boolean;
  url?: string;
}

function readHead(abs: string, maxBytes: number): Buffer {
  const fd = fs.openSync(abs, "r");
  try {
    const buffer = Buffer.alloc(maxBytes);
    return buffer.subarray(0, fs.readSync(fd, buffer, 0, maxBytes, 0));
  } finally {
    fs.closeSync(fd);
  }
}

function hasNulByte(buffer: Buffer): boolean {
  return buffer.subarray(0, BINARY_SNIFF_BYTES).includes(0);
}

export function isMediaFile(abs: string): boolean {
  const ext = path.extname(abs).toLowerCase();
  return IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext);
}

/** Describes an existing file; `rawUrl` is where the browser fetches its media bytes. */
export function previewFile(abs: string, rawUrl: string): FilePreview {
  const ext = path.extname(abs).toLowerCase();
  if (IMAGE_EXTS.has(ext)) return { type: "image", url: rawUrl };
  if (VIDEO_EXTS.has(ext)) return { type: "video", url: rawUrl };
  if (BINARY_EXTS.has(ext)) return { type: "binary" };
  const head = readHead(abs, MAX_TEXT_BYTES);
  if (hasNulByte(head)) return { type: "binary" };
  return {
    type: "text",
    content: head.toString("utf-8"),
    language: EXT_TO_LANGUAGE[ext] ?? "plaintext",
    truncated: fs.statSync(abs).size > MAX_TEXT_BYTES,
  };
}
