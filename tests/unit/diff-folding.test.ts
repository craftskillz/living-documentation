import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  foldDiffRows,
  toggleFold,
  type DiffFold,
  type DiffFoldItem,
} from '../../src/frontend-svelte/src/lib/home/diffFolding';

interface Row {
  hunkId: number | null;
  left: { lineNumber: number | null };
}

const context = (line: number): Row => ({ hunkId: null, left: { lineNumber: line } });
const change = (line: number): Row => ({ hunkId: 0, left: { lineNumber: line } });
const contextRange = (first: number, last: number): Row[] =>
  Array.from({ length: last - first + 1 }, (_, index) => context(first + index));

/** `c<line>` for a change, `<line>` for a visible context row, `[count]` / `[count open]` for a fold. */
function shape(items: DiffFoldItem<Row>[]): string[] {
  return items.map((item) => {
    if (item.kind === 'fold') return item.expanded ? `[${item.count} open]` : `[${item.count}]`;
    return item.row.hunkId === null ? String(item.row.left.lineNumber) : `c${item.row.left.lineNumber}`;
  });
}

const foldsOf = (items: DiffFoldItem<Row>[]): DiffFold[] =>
  items.filter((item): item is DiffFold => item.kind === 'fold');

test('keeps three context lines around a change and folds the rest', () => {
  const rows = [...contextRange(1, 10), change(11), ...contextRange(12, 20)];
  assert.deepEqual(shape(foldDiffRows(rows, new Set())), ['[7]', '8', '9', '10', 'c11', '12', '13', '14', '[6]']);
});

test('keeps three context lines on each side between two changes', () => {
  const rows = [change(1), ...contextRange(2, 11), change(12)];
  assert.deepEqual(shape(foldDiffRows(rows, new Set())), ['c1', '2', '3', '4', '[4]', '9', '10', '11', 'c12']);
});

test('leaves a small hidden zone visible since a bar would take as much room', () => {
  const rows = [change(1), ...contextRange(2, 9), change(10)];
  assert.deepEqual(shape(foldDiffRows(rows, new Set())), ['c1', '2', '3', '4', '5', '6', '7', '8', '9', 'c10']);
});

test('folds the whole document into a single bar when the versions are identical', () => {
  assert.deepEqual(shape(foldDiffRows(contextRange(1, 50), new Set())), ['[50]']);
});

test('returns nothing for an empty diff and never folds a change', () => {
  assert.deepEqual(foldDiffRows([], new Set()), []);
  const rows = [change(1), change(2), change(3), change(4), change(5)];
  assert.deepEqual(shape(foldDiffRows(rows, new Set())), ['c1', 'c2', 'c3', 'c4', 'c5']);
});

test('an expanded fold keeps its bar and reveals its rows', () => {
  const rows = [...contextRange(1, 10), change(11)];
  const [fold] = foldsOf(foldDiffRows(rows, new Set()));
  const expanded = toggleFold(new Set(), fold);
  assert.deepEqual(shape(foldDiffRows(rows, expanded)), ['[7 open]', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'c11']);
  assert.deepEqual(shape(foldDiffRows(rows, toggleFold(expanded, foldsOf(foldDiffRows(rows, expanded))[0]))), [
    '[7]', '8', '9', '10', 'c11',
  ]);
});

test('a fold stays expanded when restoring a hunk merges it with the zone above', () => {
  const before = [...contextRange(1, 10), change(11), ...contextRange(12, 30), change(31)];
  const second = foldsOf(foldDiffRows(before, new Set()))[1];
  const expanded = toggleFold(new Set(), second);
  assert.equal(foldsOf(foldDiffRows(before, expanded))[0].expanded, false);

  const afterRestore = [...contextRange(1, 30), change(31)];
  const merged = foldsOf(foldDiffRows(afterRestore, expanded));
  assert.equal(merged.length, 1);
  assert.equal(merged[0].expanded, true);
  assert.equal(toggleFold(expanded, merged[0]).size, 0);
});
