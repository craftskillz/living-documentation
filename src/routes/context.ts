import { Router } from "express";
import fs from "fs";
import path from "path";
import { readConfig } from "../lib/config";

interface FileSummary {
  path: string;
  root: "sourceRoot" | "docsFolder";
  exists: boolean;
  type: "file" | "directory" | "missing";
  size: number | null;
  modifiedAt: string | null;
}

interface AiRule {
  id: string;
  title: string;
  severity: string;
  description: string;
  tags: string[];
  appliesTo: string[];
  path: string;
  body: string;
  modifiedAt: string | null;
}

const AI_ROOT_DIR = "AI";
const AI_RULES_DIR = path.join(AI_ROOT_DIR, "rules");
const AI_MCP_DIR = path.join(AI_ROOT_DIR, "MCP");
const MCP_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "ai-rule";
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim())
    : [];
}

function frontmatterArray(values: string[]): string {
  return `[${values.map((item) => JSON.stringify(item)).join(", ")}]`;
}

function describePath(entry: string, root: FileSummary["root"], rootPath: string): FileSummary {
  const abs = path.resolve(rootPath, entry);
  const rel = path.relative(rootPath, abs);
  if (path.isAbsolute(rel) || rel.startsWith("..")) {
    return { path: entry, root, exists: false, type: "missing", size: null, modifiedAt: null };
  }
  if (!fs.existsSync(abs)) {
    return { path: entry, root, exists: false, type: "missing", size: null, modifiedAt: null };
  }
  const stat = fs.statSync(abs);
  return {
    path: toPosixPath(entry),
    root,
    exists: true,
    type: stat.isDirectory() ? "directory" : "file",
    size: stat.isFile() ? stat.size : null,
    modifiedAt: stat.mtime.toISOString(),
  };
}

function parseFrontmatter(md: string): { fields: Record<string, string>; body: string } {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { fields: {}, body: md.trim() };
  const fields: Record<string, string> = {};
  match[1].split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(":");
    if (idx <= 0 || /^\s+-\s+/.test(line)) return;
    fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  return { fields, body: md.slice(match[0].length).trim() };
}

function parseInlineArray(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function firstParagraph(body: string): string {
  return body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .find(Boolean) || "";
}

function listInstructionFiles(docsPath: string): FileSummary[] {
  const instructionDir = path.join(docsPath, AI_ROOT_DIR);
  if (!fs.existsSync(instructionDir)) return [];
  return fs.readdirSync(instructionDir, { withFileTypes: true })
    .filter((entry) => {
      if (!entry.name.toLowerCase().endsWith(".md")) return false;
      const fullPath = path.join(instructionDir, entry.name);
      return entry.isFile() || (entry.isSymbolicLink() && fs.statSync(fullPath).isFile());
    })
    .map((entry) => describePath(path.join(AI_ROOT_DIR, entry.name), "docsFolder", docsPath))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function readAiRules(docsPath: string): AiRule[] {
  const rulesDir = path.join(docsPath, AI_RULES_DIR);
  if (!fs.existsSync(rulesDir)) return [];
  return fs.readdirSync(rulesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry): AiRule => {
      const abs = path.join(rulesDir, entry.name);
      const stat = fs.statSync(abs);
      const raw = fs.readFileSync(abs, "utf-8");
      const { fields, body } = parseFrontmatter(raw);
      const id = safeString(fields.id, path.basename(entry.name, ".md"));
      const title = safeString(fields.title, id);
      return {
        id,
        title,
        severity: safeString(fields.severity, "guideline"),
        description: safeString(fields.description, firstParagraph(body)),
        tags: parseInlineArray(fields.tags),
        appliesTo: parseInlineArray(fields.appliesTo),
        path: toPosixPath(path.join(AI_RULES_DIR, entry.name)),
        body,
        modifiedAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

function createRuleMarkdown(rule: AiRule): string {
  return [
    "---",
    `id: ${rule.id}`,
    `title: ${rule.title}`,
    `severity: ${rule.severity}`,
    `description: ${rule.description}`,
    `tags: ${frontmatterArray(rule.tags)}`,
    `appliesTo: ${frontmatterArray(rule.appliesTo)}`,
    "---",
    "",
    rule.body,
    "",
  ].join("\n");
}

function linkInstructionFile(sourcePath: string, docsPath: string): FileSummary | { error: string; status: number } {
  if (!sourcePath || typeof sourcePath !== "string") {
    return { error: "path is required", status: 400 };
  }

  const source = path.resolve(sourcePath);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    return { error: "Instruction file not found", status: 404 };
  }

  const filename = path.basename(source);
  if (filename.startsWith(".") || !filename.toLowerCase().endsWith(".md")) {
    return { error: "Instruction file must be a visible Markdown file", status: 400 };
  }

  const instructionDir = path.join(docsPath, AI_ROOT_DIR);
  const target = path.join(instructionDir, filename);
  if (!target.startsWith(path.resolve(docsPath) + path.sep)) {
    return { error: "Invalid instruction file path", status: 400 };
  }
  if (fs.existsSync(target)) {
    return { error: "Instruction file already exists", status: 409 };
  }

  fs.mkdirSync(instructionDir, { recursive: true });
  const symlinkTarget = path.relative(instructionDir, source);
  fs.symlinkSync(symlinkTarget, target, "file");
  return describePath(path.join(AI_ROOT_DIR, filename), "docsFolder", docsPath);
}

function deleteInstructionFile(filename: string, docsPath: string): { deleted: string } | { error: string; status: number } {
  if (!filename || typeof filename !== "string") {
    return { error: "filename is required", status: 400 };
  }
  if (filename !== path.basename(filename) || filename.startsWith(".") || !filename.toLowerCase().endsWith(".md")) {
    return { error: "Invalid instruction file name", status: 400 };
  }

  const target = path.join(docsPath, AI_ROOT_DIR, filename);
  const aiRoot = path.resolve(docsPath, AI_ROOT_DIR);
  if (!target.startsWith(aiRoot + path.sep)) {
    return { error: "Invalid instruction file path", status: 400 };
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return { error: "Instruction file not found", status: 404 };
  }

  fs.unlinkSync(target);
  return { deleted: toPosixPath(path.join(AI_ROOT_DIR, filename)) };
}

export function contextRouter(docsPath: string): Router {
  const router = Router();

  router.get("/orientation", (_req, res) => {
    const config = readConfig(docsPath);
    res.json({
      instructions: listInstructionFiles(docsPath),
      rules: readAiRules(docsPath),
      sourceRoot: config.sourceRoot,
      rulesFolder: toPosixPath(path.join(AI_RULES_DIR)),
    });
  });

  router.post("/instructions", (req, res) => {
    const result = linkInstructionFile(req.body?.path, docsPath);
    if ("error" in result) return res.status(result.status).json({ error: result.error });
    res.status(201).json(result);
  });

  router.delete("/instructions/:filename", (req, res) => {
    const result = deleteInstructionFile(req.params.filename, docsPath);
    if ("error" in result) return res.status(result.status).json({ error: result.error });
    res.json(result);
  });

  router.post("/rules", (req, res) => {
    const title = safeString(req.body?.title);
    if (!title) return res.status(400).json({ error: "Rule title is required" });

    const id = slugify(safeString(req.body?.id, title));
    const rulesDir = path.join(docsPath, AI_RULES_DIR);
    const target = path.join(rulesDir, `${id}.md`);
    if (!target.startsWith(path.resolve(docsPath) + path.sep)) {
      return res.status(400).json({ error: "Invalid rule path" });
    }
    if (fs.existsSync(target)) {
      return res.status(409).json({ error: "Rule already exists" });
    }

    const body = safeString(req.body?.body, safeString(req.body?.description));
    const rule: AiRule = {
      id,
      title,
      severity: safeString(req.body?.severity, "guideline"),
      description: safeString(req.body?.description, firstParagraph(body)),
      tags: safeStringArray(req.body?.tags),
      appliesTo: safeStringArray(req.body?.appliesTo),
      path: toPosixPath(path.join(AI_RULES_DIR, `${id}.md`)),
      body,
      modifiedAt: null,
    };

    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(target, createRuleMarkdown(rule), "utf-8");
    const stat = fs.statSync(target);
    res.status(201).json({ ...rule, modifiedAt: stat.mtime.toISOString() });
  });

  router.post("/mcp-result", (req, res) => {
    const rawName = safeString(req.body?.name);
    const rawKind = safeString(req.body?.kind);
    const content = typeof req.body?.content === "string" ? req.body.content : "";
    if (!rawName) return res.status(400).json({ error: "name is required" });
    if (rawKind !== "tool" && rawKind !== "prompt") {
      return res.status(400).json({ error: "kind must be 'tool' or 'prompt'" });
    }
    if (!content) return res.status(400).json({ error: "content is required" });

    const baseName = rawName.endsWith(".md") ? rawName.slice(0, -3) : rawName;
    if (!MCP_NAME_PATTERN.test(baseName)) {
      return res.status(400).json({ error: "Invalid MCP item name" });
    }

    const slugName = baseName.replace(/_/g, "-");
    const mcpDir = path.join(docsPath, AI_MCP_DIR);
    fs.mkdirSync(mcpDir, { recursive: true });

    const indexedPattern = /^(\d{3})-(tool|prompt)-(.+)\.md$/;
    let maxIndex = 0;
    let existingFilename: string | null = null;
    for (const entry of fs.readdirSync(mcpDir)) {
      const match = entry.match(indexedPattern);
      if (!match) continue;
      const idx = parseInt(match[1], 10);
      if (idx > maxIndex) maxIndex = idx;
      if (match[2] === rawKind && match[3] === slugName) existingFilename = entry;
    }

    const filename = existingFilename ?? `${String(maxIndex + 1).padStart(3, "0")}-${rawKind}-${slugName}.md`;
    const target = path.join(mcpDir, filename);
    if (!target.startsWith(path.resolve(docsPath) + path.sep)) {
      return res.status(400).json({ error: "Invalid MCP result path" });
    }

    fs.mkdirSync(mcpDir, { recursive: true });
    fs.writeFileSync(target, content, "utf-8");
    res.status(201).json({ path: toPosixPath(path.join(AI_MCP_DIR, filename)) });
  });

  return router;
}
