import { test, expect } from '@playwright/test';
import { parseFilename } from '../../dist/src/lib/parser';

test.describe('parseFilename', () => {
  test('parses the default pattern (date + time + category + title)', () => {
    const meta = parseFilename('2026_01_15_09_30_[DevOps]_deploy_pipeline.md');
    expect(meta.category).toBe('DevOps');
    expect(meta.title).toBe('Deploy Pipeline');
    expect(meta.date).toBe('2026-01-15T09:30');
    expect(meta.formattedDate).toMatch(/January 15, 2026 09:30/);
  });

  test('supports [Category] placed before the date', () => {
    const meta = parseFilename(
      '[DevOps]_2026_01_15_09_30_deploy_pipeline.md',
      '[Category]_YYYY_MM_DD_HH_mm_title',
    );
    expect(meta.category).toBe('DevOps');
    expect(meta.title).toBe('Deploy Pipeline');
    expect(meta.date).toBe('2026-01-15T09:30');
  });

  test('supports a date-only pattern (no category)', () => {
    const meta = parseFilename('2026_01_15_meeting_notes.md', 'YYYY_MM_DD_title');
    expect(meta.category).toBe('General');
    expect(meta.title).toBe('Meeting Notes');
    expect(meta.date).toBe('2026-01-15');
  });

  test('supports a category-only pattern (no date)', () => {
    const meta = parseFilename('[Guide]_quickstart.md', '[Category]_title');
    expect(meta.category).toBe('Guide');
    expect(meta.title).toBe('Quickstart');
    expect(meta.date).toBeNull();
  });

  test('falls back to date-only matching when the category does not match the default pattern', () => {
    // Default pattern expects [Category]; without one, the date-only branch catches it.
    const meta = parseFilename('2026_01_15_09_30_meeting_notes.md');
    expect(meta.category).toBe('General');
    expect(meta.date).toBe('2026-01-15T09:30');
    expect(meta.title).toBe('Meeting Notes');
  });

  test('falls back to raw filename when nothing matches', () => {
    const meta = parseFilename('readme.md');
    expect(meta.category).toBe('General');
    expect(meta.title).toBe('Readme');
    expect(meta.date).toBeNull();
  });

  test('encodes special characters in the URL-safe id', () => {
    const meta = parseFilename('2026_01_15_09_30_[Guide]_foo.md');
    expect(meta.id).toBe('2026_01_15_09_30_%5BGuide%5D_foo');
  });
});
