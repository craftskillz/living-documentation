/** Unchanged lines kept visible on each side of a change. */
export const FOLD_CONTEXT_LINES = 3;
/** Below this, a bar would take as much room as the lines it hides. */
export const MIN_FOLDED_LINES = 3;

/**
 * A run of unchanged lines that can be hidden. It is identified by its lines in the base commit:
 * restoring a hunk shifts the current lines and can merge two runs, but the base never moves.
 */
export interface DiffFold {
  kind: "fold";
  count: number;
  firstBaseLine: number;
  lastBaseLine: number;
  expanded: boolean;
}

export type DiffFoldItem<T> = { kind: "row"; row: T } | DiffFold;

interface FoldableRow {
  hunkId: number | null;
  left: { lineNumber: number | null };
}

function isInFold(line: number, fold: Pick<DiffFold, "firstBaseLine" | "lastBaseLine">): boolean {
  return line >= fold.firstBaseLine && line <= fold.lastBaseLine;
}

function appendContextRun<T extends FoldableRow>(
  items: DiffFoldItem<T>[],
  run: T[],
  expandedLines: ReadonlySet<number>,
  followsChange: boolean,
  precedesChange: boolean,
) {
  const keptBefore = followsChange ? FOLD_CONTEXT_LINES : 0;
  const keptAfter = precedesChange ? FOLD_CONTEXT_LINES : 0;
  const count = run.length - keptBefore - keptAfter;
  const pushRows = (rows: T[]) => {
    for (const row of rows) items.push({ kind: "row", row });
  };
  if (count < MIN_FOLDED_LINES) {
    pushRows(run);
    return;
  }

  const hiddenEnd = keptBefore + count;
  const firstBaseLine = run[0].left.lineNumber ?? 0;
  const lastBaseLine = run[run.length - 1].left.lineNumber ?? 0;
  const range = { firstBaseLine, lastBaseLine };
  const expanded = [...expandedLines].some((line) => isInFold(line, range));

  pushRows(run.slice(0, keptBefore));
  items.push({ kind: "fold", count, firstBaseLine, lastBaseLine, expanded });
  if (expanded) pushRows(run.slice(keptBefore, hiddenEnd));
  pushRows(run.slice(hiddenEnd));
}

/** Rows to display: unchanged runs far from any change become fold bars, rows of a hunk always stay. */
export function foldDiffRows<T extends FoldableRow>(rows: T[], expandedLines: ReadonlySet<number>): DiffFoldItem<T>[] {
  const items: DiffFoldItem<T>[] = [];
  let run: T[] = [];
  let followsChange = false;
  for (const row of rows) {
    if (row.hunkId === null) {
      run.push(row);
      continue;
    }
    if (run.length) appendContextRun(items, run, expandedLines, followsChange, true);
    run = [];
    followsChange = true;
    items.push({ kind: "row", row });
  }
  if (run.length) appendContextRun(items, run, expandedLines, followsChange, false);
  return items;
}

/** Collapsing clears every line of the run, since a merged run can hold several expanded ones. */
export function toggleFold(expandedLines: ReadonlySet<number>, fold: DiffFold): Set<number> {
  if (!fold.expanded) return new Set([...expandedLines, fold.firstBaseLine]);
  return new Set([...expandedLines].filter((line) => !isInFold(line, fold)));
}
