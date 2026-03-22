export interface DocMetadata {
  id: string;           // URL-safe identifier (encoded filename without .md)
  filename: string;     // original filename
  title: string;        // human-readable title
  category: string;     // extracted category
  date: string | null;  // ISO date string YYYY-MM-DD
  formattedDate: string | null;
}

function buildPatternsFromFormat(patternStr: string): {
  full: RegExp | null;
  dateOnly: RegExp | null;
  hasDate: boolean;
  hasCategory: boolean;
} {
  const hasDate = /YYYY.*MM.*DD/.test(patternStr);
  const hasCategory = /\[Category\]/i.test(patternStr);
  const dateGroup = '(\\d{4}_\\d{2}_\\d{2})';
  const catGroup = '\\[([^\\]]+)\\]';

  if (hasDate && hasCategory) {
    return {
      full: new RegExp(`^${dateGroup}_${catGroup}_(.+)\\.md$`, 'i'),
      dateOnly: new RegExp(`^${dateGroup}_(.+)\\.md$`, 'i'),
      hasDate,
      hasCategory,
    };
  } else if (hasDate) {
    return {
      full: null,
      dateOnly: new RegExp(`^${dateGroup}_(.+)\\.md$`, 'i'),
      hasDate,
      hasCategory,
    };
  } else if (hasCategory) {
    return {
      full: new RegExp(`^${catGroup}_(.+)\\.md$`, 'i'),
      dateOnly: null,
      hasDate,
      hasCategory,
    };
  }
  return { full: null, dateOnly: null, hasDate, hasCategory };
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
  const { full: FULL_PAT, dateOnly: DATE_ONLY_PAT, hasDate, hasCategory } =
    buildPatternsFromFormat(filenamePattern ?? 'YYYY_MM_DD_[Category]_title');

  if (FULL_PAT) {
    const full = filename.match(FULL_PAT);
    if (full) {
      if (hasDate && hasCategory) {
        const [, dateStr, category, titlePart] = full;
        const date = dateStr.replace(/_/g, '-');
        return { id, filename, title: titleCase(titlePart), category, date, formattedDate: formatDate(date) };
      } else if (hasCategory) {
        const [, category, titlePart] = full;
        return { id, filename, title: titleCase(titlePart), category, date: null, formattedDate: null };
      }
    }
  }

  if (DATE_ONLY_PAT) {
    const dateOnly = filename.match(DATE_ONLY_PAT);
    if (dateOnly) {
      const [, dateStr, titlePart] = dateOnly;
      const date = dateStr.replace(/_/g, '-');
      return { id, filename, title: titleCase(titlePart), category: 'General', date, formattedDate: formatDate(date) };
    }
  }

  // Fallback — no date, no category
  const rawTitle = filename.slice(0, -3).replace(/[_-]+/g, ' ');
  return {
    id,
    filename,
    title: rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1),
    category: 'General',
    date: null,
    formattedDate: null,
  };
}
