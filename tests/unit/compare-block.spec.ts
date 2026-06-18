import { test, expect } from '@playwright/test';
import { renderMarkdownWithCompareBlocks } from '../../dist/src/lib/compareBlock';

test.describe('renderMarkdownWithCompareBlocks', () => {
  test('renders a simple :::compare block into a two-column ld-compare div', () => {
    const md = [
      ':::compare',
      '```javascript',
      'const x = 1;',
      '```',
      ':::',
    ].join('\n');

    const html = renderMarkdownWithCompareBlocks(md);

    expect(html).toContain('class="ld-compare"');
    expect(html).toContain('class="ld-compare-source"');
    expect(html).toContain('class="ld-compare-render"');
    expect(html).not.toContain(':::compare');
    expect(html).not.toContain('LD_COMPARE_BLOCK');
  });

  // Regression: a code sample containing a blank line used to terminate the
  // injected HTML block early, which corrupted the rendered column AND cascaded
  // into the rest of the document (subsequent headings became plain text, later
  // compare blocks were left as raw HTML, etc.).
  test('a blank line inside the inner code block does not corrupt the document', () => {
    const md = [
      '## TypeScript',
      '',
      ':::compare',
      '```typescript',
      'interface DocSummary {',
      '  id: string;',
      '}',
      '',
      'async function loadDocs(): Promise<DocSummary[]> {',
      '  return fetch("/api/docs").then((r) => r.json());',
      '}',
      '```',
      ':::',
      '',
      '## Bash',
      '',
      'Text after.',
    ].join('\n');

    const html = renderMarkdownWithCompareBlocks(md);

    // The heading AFTER the compare block must survive as a real <h2>.
    expect(html).toMatch(/<h2[^>]*>Bash<\/h2>/);
    // Exactly one compare block, fully rendered (no raw markers left behind).
    expect((html.match(/class="ld-compare"/g) || []).length).toBe(1);
    expect(html).not.toContain(':::compare');
    expect(html).not.toContain('LD_COMPARE_BLOCK');
    // The render column keeps the code as a real code block (not flattened text).
    expect(html).toContain('<pre><code class="language-typescript">');
    expect(html).toContain('async function loadDocs');
  });

  test('multiple compare blocks each render independently', () => {
    const md = [
      ':::compare',
      '```js',
      'a();',
      '',
      'b();',
      '```',
      ':::',
      '',
      ':::compare',
      '```js',
      'c();',
      '```',
      ':::',
    ].join('\n');

    const html = renderMarkdownWithCompareBlocks(md);
    expect((html.match(/class="ld-compare"/g) || []).length).toBe(2);
    expect(html).not.toContain('LD_COMPARE_BLOCK');
  });
});
