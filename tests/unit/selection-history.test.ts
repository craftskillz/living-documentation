import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rowsInLineRange, shiftLineRangeAfterRestore } from '../../src/frontend-svelte/src/lib/home/selectionHistory';

const row = (lineNumber: number | null, id: string) => ({ id, right: { lineNumber } });

test('rowsInLineRange keeps the current lines of the range and the removals inside it', () => {
  const rows = [row(1, 'a'), row(2, 'b'), row(null, 'removed-inside'), row(3, 'c'), row(null, 'removed-after'), row(4, 'd')];
  assert.deepEqual(rowsInLineRange(rows, { start: 2, end: 3 }).map((r) => r.id), ['b', 'removed-inside', 'c']);
});

test('shiftLineRangeAfterRestore follows the selection when a restored block changes the line count', () => {
  const range = { start: 5, end: 8 };
  const restore = (newStart: number, newDeleteCount: number, oldCount: number) =>
    shiftLineRangeAfterRestore(range, { newStart, newDeleteCount, oldLines: Array(oldCount).fill('x') });
  assert.deepEqual(restore(0, 1, 3), { start: 7, end: 10 }, 'block before the range shifts it');
  assert.deepEqual(restore(5, 1, 3), { start: 5, end: 10 }, 'block inside the range resizes it');
  assert.deepEqual(restore(4, 4, 0), { start: 5, end: 5 }, 'the range never ends before it starts');
  assert.deepEqual(restore(8, 1, 3), range, 'block after the range leaves it');
});
