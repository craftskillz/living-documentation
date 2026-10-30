import { test, expect } from '../helpers/ld-fixture';

test('footnote links scroll to the note and back below the sticky document header', async ({ page, request, ld }) => {
  await request.put(`${ld.baseURL}/api/config`, { data: { language: 'fr' } });
  const id = '2026_01_01_10_00_[General]_intro';
  const content = '# Footnotes\n\n[Aller à la section](#section-cible)\n\n## Section cible\n\nDans le format ouvert **Agent Skills**[^1].\n\n'
    + 'A paragraph to separate the reference and its note.\n\n'.repeat(40)
    + '[^1]: Agent Skills est un **format ouvert**. [Présentation](https://agentskills.io/home)\n';
  const save = await request.put(`${ld.baseURL}/api/documents/${encodeURIComponent(id)}`, { data: { content } });
  expect(save.ok()).toBe(true);
  const documentLoads: string[] = [];
  page.on('request', request => {
    if (decodeURIComponent(new URL(request.url()).pathname) === `/api/documents/${id}`) documentLoads.push(request.url());
  });
  await page.goto(`${ld.baseURL}/?doc=${encodeURIComponent(id)}`);
  const reference = page.locator('#ld-fn-ref-1');
  const note = page.locator('#ld-fn-1');
  await expect(reference).toHaveText('1');
  await expect(page.locator('section[data-footnotes] > h2')).toHaveText('Notes de bas de page');
  await expect(note.locator('a[href="#ld-fn-ref-1"]')).toHaveAccessibleName('Retour à l’appel de note');
  await expect(note.locator('strong')).toHaveText('format ouvert');
  await expect(note.getByRole('link', { name: 'Présentation' })).toHaveAttribute('href', 'https://agentskills.io/home');
  const styles = await note.evaluate(el => {
    const section = el.closest('section');
    const content = el.closest('#doc-content');
    if (!section || !content) throw new Error('Missing footnote section');
    return {
      font: parseFloat(getComputedStyle(section).fontSize),
      bodyFont: parseFloat(getComputedStyle(content).fontSize),
      lineWidth: parseFloat(getComputedStyle(section, '::before').width),
      sectionWidth: section.getBoundingClientRect().width,
      lineColor: getComputedStyle(section, '::before').backgroundColor,
      labelHeight: section.querySelector('h2')?.getBoundingClientRect().height,
    };
  });
  expect(styles.font).toBeLessThan(styles.bodyFont);
  expect(styles.lineWidth).toBeGreaterThan(0);
  expect(styles.lineWidth).toBeLessThan(styles.sectionWidth);
  expect(styles.lineColor).toBe('rgb(156, 163, 175)');
  expect(styles.labelHeight).toBe(1);
  await reference.click();
  await expect(note).toBeInViewport();
  await expect(note).toBeFocused();
  const scroller = page.locator('#home-content-area');
  const noteScroll = await scroller.evaluate(el => el.scrollTop);
  expect(noteScroll).toBeGreaterThan(0);
  await note.locator('a[href="#ld-fn-ref-1"]').click();
  await expect(reference).toBeInViewport();
  await expect(reference).toBeFocused();
  expect(await scroller.evaluate(el => el.scrollTop)).toBeLessThan(noteScroll);
  const header = await page.locator('#home-doc-header').boundingBox();
  const refBox = await reference.boundingBox();
  if (!header || !refBox) throw new Error('The document header and reference must have a layout box');
  expect(refBox.y).toBeGreaterThanOrEqual(header.y + header.height);
  await page.getByRole('link', { name: 'Aller à la section' }).click();
  const section = page.locator('#section-cible');
  await expect(section).toBeInViewport();
  const sectionBox = await section.boundingBox();
  if (!sectionBox) throw new Error('The anchor target must have a layout box');
  expect(sectionBox.y).toBeGreaterThanOrEqual(header.y + header.height);
  expect(documentLoads).toHaveLength(1);
  expect(new URL(page.url()).hash).toBe('');
  const saved = await (await request.get(`${ld.baseURL}/api/documents/${encodeURIComponent(id)}`)).json();
  expect(saved.content).toContain(content);
});
