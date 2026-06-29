import fs from "fs";
import path from "path";
import { resolveDocFilePath } from "./documents";

const MAX_GENERATED_IMAGE_BYTES = 19 * 1024 * 1024;
const IMAGE_GENERATION_TIMEOUT_MS = 10 * 60 * 1000;
const GENERATED_IMAGE_FOLDER = "images-ai";
const ENV_REF_PATTERN = /^(?:env:([A-Za-z_][A-Za-z0-9_]*)|\$\{([A-Za-z_][A-Za-z0-9_]*)\})$/;

interface GenerateImageArgs {
  imageProviderId: string;
  prompt: string;
  documentId: string;
  filename?: string;
  aspectRatio?: string;
  size?: string;
  quality?: string;
  outputFormat?: string;
}

interface WorkspaceImageProvider {
  id: string;
  label: string;
  endpoint: string;
  token: string;
  model: string;
}

function jsonResult(obj: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(obj, null, 2) },
    ],
  };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function workspaceFilePath(docsPath: string): string {
  return path.join(docsPath, ".workspace");
}

function resolveSecret(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  const match = ENV_REF_PATTERN.exec(value);
  if (!match) return "";
  const name = match[1] ?? match[2];
  return (process.env[name] ?? "").trim();
}

function imageGenerationUrl(endpoint: string): URL {
  const url = new URL(endpoint);
  const cleanPath = url.pathname.replace(/\/+$/, "");
  if (cleanPath.endsWith("/images")) {
    url.pathname = cleanPath;
  } else if (cleanPath.endsWith("/v1")) {
    url.pathname = `${cleanPath}/images`;
  } else {
    url.pathname = `${cleanPath}/v1/images`;
  }
  return url;
}

function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}

function isSafeFilename(filename: string): boolean {
  return typeof filename === "string"
    && filename.length > 0
    && !/[\\/]/.test(filename)
    && !filename.startsWith(".")
    && filename !== "..";
}

function isSafeRelativePath(value: string): boolean {
  if (typeof value !== "string") return false;
  if (!value || value.startsWith("/") || value.startsWith("\\")) return false;
  const segments = value.split(/[\\/]+/).filter(Boolean);
  if (!segments.length) return false;
  return segments.every((segment) => isSafeFilename(segment) && segment !== "." && segment !== "..");
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function folderFromDocumentId(documentId: string): string {
  let decoded = documentId;
  try {
    decoded = decodeURIComponent(documentId);
  } catch {
    return "";
  }
  if (path.isAbsolute(decoded)) return "";
  const docDir = path.posix.dirname(decoded.split(path.sep).join("/"));
  if (docDir === ".") return "";
  return isSafeRelativePath(docDir) ? docDir : "";
}

function extensionFromMediaType(mediaType: unknown): string {
  if (typeof mediaType !== "string") return "";
  const normalized = mediaType.toLowerCase().split(";")[0].trim();
  if (normalized === "image/jpeg" || normalized === "image/jpg") return "jpg";
  if (normalized === "image/png") return "png";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/svg+xml") return "svg";
  return "";
}

function safeExtension(raw: unknown, fallback = "png"): string {
  const value = typeof raw === "string" ? raw.trim().toLowerCase().replace(/^\./, "") : "";
  return /^[a-z0-9]+$/.test(value) ? value : fallback;
}

function timestampedFilename(requestedName: unknown, ext: string): string {
  const originalName = typeof requestedName === "string" && requestedName.trim()
    ? requestedName.trim()
    : `generated-image.${ext}`;
  const baseWithoutExt = slugify(path.basename(originalName, path.extname(originalName))) || "generated_image";
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const random = Math.random().toString(36).slice(2, 6);
  return `${timestamp}_${random}_${baseWithoutExt}.${ext}`;
}

function readImageProvider(docsPath: string, providerId: string): WorkspaceImageProvider {
  if (!providerId.trim()) throw new Error("imageProviderId is required");
  const filePath = workspaceFilePath(docsPath);
  if (!fs.existsSync(filePath)) throw new Error("Workspace is not configured");
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed.entities)) {
    throw new Error("Workspace file is invalid");
  }

  const entity = parsed.entities.find((candidate) => {
    return isRecord(candidate) && candidate.id === providerId;
  });
  if (!isRecord(entity)) throw new Error(`Image provider not found: ${providerId}`);
  if (entity.kind !== "llm") throw new Error(`Provider ${providerId} is not an LLM node`);
  const config = isRecord(entity.config) ? entity.config : {};
  if (config.providerType !== "image") {
    throw new Error(`Provider ${providerId} is not configured as Image generation`);
  }

  const endpoint = typeof config.endpoint === "string" ? config.endpoint.trim() : "";
  const token = typeof config.token === "string" ? config.token.trim() : "";
  const model = typeof config.model === "string" ? config.model.trim() : "";
  const label = typeof entity.label === "string" ? entity.label : providerId;
  if (!endpoint) throw new Error(`Image provider ${providerId} has no endpoint`);
  if (!model) throw new Error(`Image provider ${providerId} has no model`);
  return { id: providerId, label, endpoint, token, model };
}

function assertDocumentExists(docsPath: string, documentId: string) {
  const doc = { id: documentId, title: "", category: "", folder: null };
  const filePath = resolveDocFilePath(docsPath, doc);
  if (!filePath) throw new Error(`Document not found: ${documentId}`);
}

export async function toolGenerateImage(docsPath: string, args: GenerateImageArgs) {
  if (!args || typeof args !== "object") throw new Error("Missing arguments");
  if (typeof args.imageProviderId !== "string" || !args.imageProviderId.trim()) {
    throw new Error("Missing required parameter 'imageProviderId'");
  }
  if (typeof args.prompt !== "string" || !args.prompt.trim()) {
    throw new Error("Missing required parameter 'prompt'");
  }
  if (typeof args.documentId !== "string" || !args.documentId.trim()) {
    throw new Error("Missing required parameter 'documentId'");
  }

  assertDocumentExists(docsPath, args.documentId);
  const provider = readImageProvider(docsPath, args.imageProviderId.trim());
  const resolvedToken = resolveSecret(provider.token);
  if (provider.token && !resolvedToken) {
    throw new Error(`Image provider token reference is unset: ${provider.token}`);
  }

  const url = imageGenerationUrl(provider.endpoint);
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (resolvedToken) headers.Authorization = `Bearer ${resolvedToken}`;

  const body: Record<string, unknown> = {
    model: provider.model,
    prompt: args.prompt.trim(),
    response_format: "b64_json",
  };
  if (typeof args.aspectRatio === "string" && args.aspectRatio.trim()) {
    body.aspect_ratio = args.aspectRatio.trim();
  }
  if (typeof args.size === "string" && args.size.trim()) {
    body.size = args.size.trim();
  }
  if (typeof args.quality === "string" && args.quality.trim()) {
    body.quality = args.quality.trim();
  }
  if (typeof args.outputFormat === "string" && args.outputFormat.trim()) {
    body.output_format = safeExtension(args.outputFormat);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_GENERATION_TIMEOUT_MS);
  let response: Response;
  let text: string;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    text = await response.text();
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const detail = text.trim().slice(0, 2000);
    throw new Error(`Image generation failed: ${url.toString()} -> ${response.status} ${response.statusText}${detail ? `: ${detail}` : ""}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Image generation response was not JSON");
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.data) || !parsed.data.length) {
    throw new Error("Image generation response did not contain data[]");
  }
  const first = parsed.data[0];
  if (!isRecord(first) || typeof first.b64_json !== "string" || !first.b64_json.trim()) {
    throw new Error("Image generation response did not contain data[0].b64_json");
  }

  const mediaType = first.media_type ?? first.mime_type;
  const ext = safeExtension(
    args.outputFormat,
    extensionFromMediaType(mediaType) || "png",
  );
  const buffer = Buffer.from(first.b64_json.replace(/^data:[^;]+;base64,/, ""), "base64");
  if (!buffer.length) throw new Error("Generated image was empty");
  if (buffer.length > MAX_GENERATED_IMAGE_BYTES) {
    throw new Error(`Generated image is too large (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
  }

  const folder = folderFromDocumentId(args.documentId);
  const imagesDir = path.join(docsPath, GENERATED_IMAGE_FOLDER, folder);
  fs.mkdirSync(imagesDir, { recursive: true });
  const basename = timestampedFilename(args.filename, ext);
  const filename = folder ? `${folder}/${basename}` : basename;
  const filePath = path.join(imagesDir, basename);
  fs.writeFileSync(filePath, buffer);

  const urlPath = `/${GENERATED_IMAGE_FOLDER}/${filename}`;
  const label = path.basename(filename);
  const markdown = `![${label}](./${GENERATED_IMAGE_FOLDER}/${filename})`;
  return jsonResult({
    success: true,
    providerId: provider.id,
    provider: provider.label,
    model: provider.model,
    filename: toPosixPath(filename),
    url: urlPath,
    markdown,
    size: buffer.length,
    revisedPrompt: isRecord(first) && typeof first.revised_prompt === "string" ? first.revised_prompt : undefined,
  });
}
