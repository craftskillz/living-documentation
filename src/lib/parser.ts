export interface DocMetadata {
  id: string;           // URL-safe identifier (encoded filename without .md)
  filename: string;     // original filename
  title: string;        // human-readable title
  category: string;     // extracted category
  folder: string[] | null; // path segments from root to parent dir, null if at root
  date: string | null;  // ISO date string YYYY-MM-DD
  formattedDate: string | null;
}

function buildPatternsFromFormat(patternStr: string): {
  full: RegExp | null;
  dateOnly: RegExp | null;
  hasDate: boolean;
  hasCategory: boolean;
  catBeforeDate: boolean;
} {
  const hasDate = /YYYY.*MM.*DD/.test(patternStr);
  const hasCategory = /\[Category\]/i.test(patternStr);
  const dateGroup = '(\\d{4}_\\d{2}_\\d{2})';
  const catGroup = '\\[([^\\]]+)\\]';
  const catBeforeDate =
    hasDate && hasCategory &&
    patternStr.search(/\[Category\]/i) < patternStr.search(/YYYY/i);

  if (hasDate && hasCategory) {
    const ordered = catBeforeDate
      ? `${catGroup}_${dateGroup}`
      : `${dateGroup}_${catGroup}`;
    return {
      full: new RegExp(`^${ordered}_(.+)\\.md$`, 'i'),
      dateOnly: new RegExp(`^${dateGroup}_(.+)\\.md$`, 'i'),
      hasDate,
      hasCategory,
      catBeforeDate,
    };
  } else if (hasDate) {
    return {
      full: null,
      dateOnly: new RegExp(`^${dateGroup}_(.+)\\.md$`, 'i'),
      hasDate,
      hasCategory,
      catBeforeDate: false,
    };
  } else if (hasCategory) {
    return {
      full: new RegExp(`^${catGroup}_(.+)\\.md$`, 'i'),
      dateOnly: null,
      hasDate,
      hasCategory,
      catBeforeDate: false,
    };
  }
  return { full: null, dateOnly: null, hasDate, hasCategory, catBeforeDate: false };
}

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

export function parseFilename(filename: string, filenamePattern?: string): DocMetadata {
  const id = encodeURIComponent(filename.slice(0, -3));
  const { full: FULL_PAT, dateOnly: DATE_ONLY_PAT, hasDate, hasCategory, catBeforeDate } =
    buildPatternsFromFormat(filenamePattern ?? 'YYYY_MM_DD_[Category]_title');

  if (FULL_PAT) {
    const full = filename.match(FULL_PAT);
    if (full) {
      if (hasDate && hasCategory) {
        const dateStr = catBeforeDate ? full[2] : full[1];
        const category = catBeforeDate ? full[1] : full[2];
        const titlePart = full[3];
        const date = dateStr.replace(/_/g, '-');
        return { id, filename, title: titleCase(titlePart), category, folder: null, date, formattedDate: formatDate(date) };
      } else if (hasCategory) {
        const [, category, titlePart] = full;
        return { id, filename, title: titleCase(titlePart), category, folder: null, date: null, formattedDate: null };
      }
    }
  }

  if (DATE_ONLY_PAT) {
    const dateOnly = filename.match(DATE_ONLY_PAT);
    if (dateOnly) {
      const [, dateStr, titlePart] = dateOnly;
      const date = dateStr.replace(/_/g, '-');
      return { id, filename, title: titleCase(titlePart), category: 'General', folder: null, date, formattedDate: formatDate(date) };
    }
  }

  // Fallback — no date, no category
  const rawTitle = filename.slice(0, -3).replace(/[_-]+/g, ' ');
  return {
    id,
    filename,
    title: rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1),
    category: 'General',
    folder: null,
    date: null,
    formattedDate: null,
  };
}
