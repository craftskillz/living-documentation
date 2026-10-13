import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from './frontmatter';
import { docSlug } from './docSlug';

export { docSlug };

export interface DocMetadata {
  id: string;           // URL-safe identifier (encoded filename without .md)
  filename: string;     // original filename
  title: string;        // frontmatter `title`, else the filename
  folder: string[] | null; // path segments from root to parent dir, null if at root
  date: string | null;  // frontmatter `timestamp`: YYYY-MM-DD or YYYY-MM-DDTHH:mm
  formattedDate: string | null;
}

const ISO_DATE_RE = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/;
// Pre-nomenclature-removal names (`YYYY_MM_DD[_HH_mm]_[Category]_title`): the
// prefix is dropped so documents without a frontmatter title stay readable.
const LEGACY_PREFIX_RE = /^(?:\d{4}_\d{2}_\d{2}(?:_\d{2}_\d{2})?_)?(?:\[[^\]]*\]_)?/;

function formatDate(iso: string): string {
  const hasTime = iso.includes('T');
  const datePart = hasTime ? iso.split('T')[0] : iso;
  const [year, month, day] = datePart.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dateStr = d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return hasTime ? `${dateStr} ${iso.split('T')[1]}` : dateStr;
}

// YAML may already have turned the timestamp into a Date.
function timestampToIso(value: unknown): string | null {
  const raw = value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toISOString()
    : typeof value === 'string' ? value.trim() : '';
  const match = raw.match(ISO_DATE_RE);
  if (!match) return null;
  return match[2] ? `${match[1]}T${match[2]}` : match[1];
}

/** Fallback title when the frontmatter has none. */
export function titleFromFilename(filename: string): string {
  const stem = path.basename(filename).replace(/\.md$/i, '');
  const raw = (stem.replace(LEGACY_PREFIX_RE, '') || stem).replace(/[_-]+/g, ' ').trim();
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Display metadata of a document: the filename is only an identifier. */
export function parseDocMetadata(filename: string, content: string): DocMetadata {
  const id = encodeURIComponent(filename.slice(0, -3));
  const { data } = parseFrontmatter(content);
  const title = typeof data.title === 'string' && data.title.trim()
    ? data.title.trim()
    : titleFromFilename(filename);
  const date = timestampToIso(data.timestamp);
  return { id, filename, title, folder: null, date, formattedDate: date ? formatDate(date) : null };
}

/** Reads a document and returns its metadata (an unreadable file falls back to its filename). */
export function readDocMetadata(absPath: string, filename: string): DocMetadata {
  let content = '';
  try { content = fs.readFileSync(absPath, 'utf-8'); } catch { /* unreadable: filename only */ }
  return parseDocMetadata(filename, content);
}

/** First free `<slug>.md`, `<slug>-2.md`, … in `dir`. */
export function uniqueDocFilename(dir: string, title: string): string {
  const slug = docSlug(title);
  let candidate = `${slug}.md`;
  for (let n = 2; fs.existsSync(path.join(dir, candidate)); n++) candidate = `${slug}-${n}.md`;
  return candidate;
}
