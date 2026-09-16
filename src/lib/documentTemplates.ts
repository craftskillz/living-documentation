import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter';

export interface DocumentTemplate { id: string; name: string; content: string; }
export interface TemplateFolder { id: string; name: string; templates: DocumentTemplate[]; }
export interface TemplateLibrary { version: 1; folders: TemplateFolder[]; }
export const MAX_TEMPLATE_NAME = 120;
export const MAX_TEMPLATE_CONTENT = 1_000_000;
const LIBRARY_FILE = '.document-templates.json';

export class TemplateError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function templateName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > MAX_TEMPLATE_NAME) {
    throw new TemplateError(400, 'invalid_name');
  }
  return value.trim();
}
export function templateContent(value: unknown): string {
  if (typeof value !== 'string' || value.length > MAX_TEMPLATE_CONTENT) throw new TemplateError(400, 'invalid_content');
  return value;
}
export function readTemplateLibrary(docsPath: string): TemplateLibrary {
  const file = path.join(docsPath, LIBRARY_FILE);
  if (!fs.existsSync(file)) return { version: 1, folders: [] };
  // Never replace an unreadable/corrupt library with an empty one.
  const library = JSON.parse(fs.readFileSync(file, 'utf8')) as TemplateLibrary;
  if (library.version !== 1 || !Array.isArray(library.folders)) throw new Error('Invalid template library');
  const ids = new Set<string>();
  for (const folder of library.folders) {
    if (!folder || typeof folder.id !== 'string' || ids.has(folder.id) || !Array.isArray(folder.templates)) throw new Error('Invalid template folder');
    ids.add(folder.id); templateName(folder.name);
    for (const template of folder.templates) {
      if (!template || typeof template.id !== 'string' || ids.has(template.id)) throw new Error('Invalid template');
      ids.add(template.id); templateName(template.name); templateContent(template.content);
    }
  }
  return library;
}
export function writeTemplateLibrary(docsPath: string, library: TemplateLibrary): void {
  const file = path.join(docsPath, LIBRARY_FILE);
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, `${JSON.stringify(library, null, 2)}\n`, { flag: 'wx' });
    fs.renameSync(temp, file);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}
export function getTemplateFolder(library: TemplateLibrary, id: string): TemplateFolder {
  const folder = library.folders.find((item) => item.id === id);
  if (!folder) throw new TemplateError(404, 'folder_not_found');
  return folder;
}
export function ensureUniqueTemplateName(items: { id: string; name: string }[], name: string, except?: string): void {
  if (items.some((item) => item.id !== except && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    throw new TemplateError(409, 'duplicate_name');
  }
}
export function contentFromTemplate(docsPath: string, id: unknown, title: string): string {
  if (typeof id !== 'string') throw new TemplateError(400, 'template_not_found');
  const template = readTemplateLibrary(docsPath).folders.flatMap((folder) => folder.templates).find((item) => item.id === id);
  if (!template) throw new TemplateError(404, 'template_not_found');
  const { data, body } = parseFrontmatter(template.content);
  // A new document gets its own identity and provenance; preserve other template fields.
  for (const key of Object.keys(data)) {
    if (['title', 'timestamp', 'date', 'sources', 'resource'].includes(key.toLowerCase())) delete data[key];
  }
  data.title = title;
  data.timestamp = new Date().toISOString();
  return `${serializeFrontmatter(data)}\n${body.replace(/^\r?\n/, '')}`;
}
