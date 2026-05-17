// ── Frontmatter status helpers ───────────────────────────────────────────────
// The project's frontmatter is not standard YAML: each line is `**key:** value`
// inside a `---`-fenced block. This module reads only the `status` line — used
// to gate mutations based on the doc lifecycle (e.g. block metadata writes on
// a SuperSeeded ADR). The `assertNotSuperSeeded` guard is consumed both by the
// HTTP routes and by the MCP tools — they share the same source of truth.

import fs from "fs";
import path from "path";
import { readConfig } from "./config";

const STATUS_LINE_RE = /^\s*(?:\*\*status:\*\*|status:)\s*(.+?)\s*$/im;
const FRONTMATTER_FENCE_RE = /^---\s*\n([\s\S]*?)\n---/;

export function parseDocStatus(content: string): string | null {
  if (typeof content !== "string") return null;
  const fence = content.match(FRONTMATTER_FENCE_RE);
  if (!fence) return null;
  const m = fence[1].match(STATUS_LINE_RE);
  return m ? m[1].trim() : null;
}

// Resolve a doc id (already decoded) to its .md file path, honouring the same
// rules the documents route uses: extraFiles for absolute ids, safe-path for
// regular ids. Returns null if the file is not readable or escapes docsPath.
function resolveDocFilePath(
  docsPath: string,
  decodedDocId: string,
  extraFiles: string[],
): string | null {
  if (path.isAbsolute(decodedDocId)) {
    const candidate = decodedDocId + ".md";
    return extraFiles.includes(candidate) ? candidate : null;
  }
  const resolved = path.resolve(docsPath, decodedDocId + ".md");
  if (!resolved.startsWith(path.resolve(docsPath) + path.sep)) return null;
  return resolved;
}

export function readDocStatus(
  docsPath: string,
  decodedDocId: string,
  extraFiles: string[],
): string | null {
  const filePath = resolveDocFilePath(docsPath, decodedDocId, extraFiles);
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return parseDocStatus(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

export const SUPERSEEDED_STATUS = "SuperSeeded";

// Typed error so callers (HTTP routes, MCP tool wrapper) can distinguish a
// lifecycle rejection from a generic failure and map it to the right response
// envelope (403 for HTTP, MCP `isError: true` content wrapper).
export class DocumentSuperSeededError extends Error {
  readonly code = "DOCUMENT_SUPERSEEDED";
  constructor(
    message = "Document is SuperSeeded; metadata is read-only.",
  ) {
    super(message);
    this.name = "DocumentSuperSeededError";
  }
}

export function assertNotSuperSeeded(
  docsPath: string,
  decodedDocId: string,
): void {
  const { extraFiles = [] } = readConfig(docsPath);
  if (readDocStatus(docsPath, decodedDocId, extraFiles) === SUPERSEEDED_STATUS) {
    throw new DocumentSuperSeededError();
  }
}
