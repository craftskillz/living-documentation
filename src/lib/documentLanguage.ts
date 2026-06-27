export type DocumentLanguage = "en" | "fr";

export const DOCUMENT_LANGUAGES: readonly DocumentLanguage[] = ["en", "fr"];

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const LANGUAGE_LINE_RE =
  /^(\s*(?:\*\*)?(?:language|lang|locale|langue)(?:\*\*)?\s*:\s*(?:\*\*)?\s*)(.+?)\s*$/i;

export function normalizeDocumentLanguage(value: string | null | undefined): DocumentLanguage | null {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "en" || raw.startsWith("en-") || raw === "english" || raw === "anglais") return "en";
  if (
    raw === "fr" ||
    raw.startsWith("fr-") ||
    raw === "french" ||
    raw === "francais" ||
    raw === "français"
  ) {
    return "fr";
  }
  return null;
}

export function getDocumentLanguage(content: string): DocumentLanguage | null {
  const frontmatter = content.match(FRONTMATTER_RE)?.[1];
  if (!frontmatter) return null;

  for (const line of frontmatter.split(/\r?\n/)) {
    const match = line.match(LANGUAGE_LINE_RE);
    if (match) return normalizeDocumentLanguage(match[2]);
  }
  return null;
}

export function setDocumentLanguage(content: string, language: DocumentLanguage): string {
  const existingFrontmatter = content.match(FRONTMATTER_RE);
  if (!existingFrontmatter) {
    return `---\n**language:** ${language}\n---\n\n${content}`;
  }

  const fullBlock = existingFrontmatter[0];
  const body = existingFrontmatter[1];
  const lines = body.split(/\r?\n/);
  const existingIndex = lines.findIndex((line) => LANGUAGE_LINE_RE.test(line));

  if (existingIndex >= 0) {
    lines[existingIndex] = lines[existingIndex].replace(LANGUAGE_LINE_RE, `$1${language}`);
  } else {
    const dateIndex = lines.findIndex((line) => /^\s*(?:\*\*)?date(?:\*\*)?\s*:\s*(?:\*\*)?/i.test(line));
    const insertAt = dateIndex >= 0 ? dateIndex + 1 : lines.length;
    lines.splice(insertAt, 0, `**language:** ${language}`);
  }

  const nextFrontmatter = `---\n${lines.join("\n")}\n---\n`;
  return nextFrontmatter + content.slice(fullBlock.length);
}
