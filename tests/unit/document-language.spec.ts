import { test, expect } from '@playwright/test';
import {
  getDocumentLanguage,
  normalizeDocumentLanguage,
  setDocumentLanguage,
} from '../../dist/src/lib/documentLanguage';

test.describe('document language frontmatter helpers', () => {
  test('normalizes supported language aliases', () => {
    expect(normalizeDocumentLanguage('en-US')).toBe('en');
    expect(normalizeDocumentLanguage('anglais')).toBe('en');
    expect(normalizeDocumentLanguage('fr-FR')).toBe('fr');
    expect(normalizeDocumentLanguage('français')).toBe('fr');
    expect(normalizeDocumentLanguage('de')).toBeNull();
  });

  test('reads bold and yaml language fields from frontmatter', () => {
    expect(getDocumentLanguage('---\n**language:** fr\n---\n\n# Titre')).toBe('fr');
    expect(getDocumentLanguage('---\nlang: en-US\n---\n\n# Title')).toBe('en');
    expect(getDocumentLanguage('# No frontmatter')).toBeNull();
  });

  test('adds language after date when the frontmatter has no language yet', () => {
    const next = setDocumentLanguage('---\n**date:** 2026-06-27\n**status:** Draft\n---\n\n# Title', 'fr');
    expect(next).toBe('---\n**date:** 2026-06-27\n**language:** fr\n**status:** Draft\n---\n\n# Title');
  });

  test('updates an existing language field without rewriting the rest', () => {
    const next = setDocumentLanguage('---\nlang: en\nstatus: Draft\n---\n\n# Title', 'fr');
    expect(next).toBe('---\nlang: fr\nstatus: Draft\n---\n\n# Title');
  });
});
