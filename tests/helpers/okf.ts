import { expect } from '@playwright/test';
import { parse } from 'yaml';
import { defined } from './assert';

// Inspect the wire format independently of the production normalizer.
export function readOkf(content: string): { fields: Record<string, unknown>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n(?:\r?\n)?/.exec(content);
  expect(match, 'document must have YAML frontmatter').not.toBeNull();
  const frontmatter = defined(match, 'YAML frontmatter');
  const fields = parse(frontmatter[1]) as Record<string, unknown>;
  expect(fields).toEqual(expect.objectContaining({ type: expect.any(String), title: expect.any(String) }));
  expect(String(fields.type).trim()).not.toBe('');
  expect(String(fields.title).trim()).not.toBe('');
  return { fields, body: content.slice(frontmatter[0].length) };
}
