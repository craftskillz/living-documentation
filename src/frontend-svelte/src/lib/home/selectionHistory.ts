/** 1-based inclusive lines of the Markdown file, as sent to `git log -L`. */
export interface LineRange {
  start: number;
  end: number;
}

/** Diff rows of the range, by current line; a removal-only row sits after the last current line seen. */
export function rowsInLineRange<T extends { right: { lineNumber: number | null } }>(rows: T[], range: LineRange): T[] {
  let lastLine = 0;
  return rows.filter((row) => {
    const line = row.right.lineNumber;
    if (line === null) return lastLine >= range.start && lastLine < range.end;
    lastLine = line;
    return line >= range.start && line <= range.end;
  });
}

/** Range after restoring a hunk (0-based `newStart` in the current lines) into the current content. */
export function shiftLineRangeAfterRestore(
  range: LineRange,
  hunk: { newStart: number; newDeleteCount: number; oldLines: string[] },
): LineRange {
  const delta = hunk.oldLines.length - hunk.newDeleteCount;
  if (hunk.newStart >= range.end) return range;
  if (hunk.newStart + hunk.newDeleteCount < range.start) return { start: range.start + delta, end: range.end + delta };
  return { start: range.start, end: Math.max(range.start, range.end + delta) };
}
