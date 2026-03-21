export interface DocMetadata {
  id: string;           // URL-safe identifier (encoded filename without .md)
  filename: string;     // original filename
  title: string;        // human-readable title
  category: string;     // extracted category
  date: string | null;  // ISO date string YYYY-MM-DD
  formattedDate: string | null;
}

// Matches: YYYY_MM_DD_[Category]_title_words.md
const FULL_PATTERN = /^(\d{4}_\d{2}_\d{2})_\[([^\]]+)\]_(.+)\.md$/i;

// Matches: YYYY_MM_DD_title_words.md (no category)
const DATE_ONLY_PATTERN = /^(\d{4}_\d{2}_\d{2})_(.+)\.md$/i;

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function titleCase(raw: string): string {
  return raw
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function parseFilename(filename: string): DocMetadata {
  const id = encodeURIComponent(filename.slice(0, -3));

  const full = filename.match(FULL_PATTERN);
  if (full) {
    const [, dateStr, category, titlePart] = full;
    const date = dateStr.replace(/_/g, '-');
    return {
      id,
      filename,
      title: titleCase(titlePart),
      category,
      date,
      formattedDate: formatDate(date),
    };
  }

  const dateOnly = filename.match(DATE_ONLY_PATTERN);
  if (dateOnly) {
    const [, dateStr, titlePart] = dateOnly;
    const date = dateStr.replace(/_/g, '-');
    return {
      id,
      filename,
      title: titleCase(titlePart),
      category: 'Uncategorized',
      date,
      formattedDate: formatDate(date),
    };
  }

  // Fallback — no date, no category
  const rawTitle = filename.slice(0, -3).replace(/[_-]+/g, ' ');
  return {
    id,
    filename,
    title: rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1),
    category: 'Uncategorized',
    date: null,
    formattedDate: null,
  };
}
