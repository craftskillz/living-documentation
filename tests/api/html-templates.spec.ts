import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

function writeDoc(docsAbs: string, name: string, content: string) {
  fs.writeFileSync(path.join(docsAbs, `${name}.md`), content);
}

const SHEET = [
  '---', 'title: Fiche', 'language: fr', 'html_template: interview-sheet', '---', '',
  '# Grand titre', '', '## Première', '', 'Texte **gras**', '', '## Seconde', '', '<script>alert(1)</script>', '',
].join('\n');

test('GET /api/html-templates lists the library with the interview sheet', async ({ request, ld }) => {
  const { folders } = await (await request.get(`${ld.baseURL}/api/html-templates`)).json();
  expect(folders).toContainEqual({ id: 'interviews', templateIds: ['interview-sheet'] });
});

test('render presents the Markdown content in the template chosen by the document', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'fiche', SHEET);
  const response = await request.get(`${ld.baseURL}/api/html-templates/render?doc=fiche`);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/html');
  expect(response.headers()['content-security-policy']).toContain("default-src 'none'");
  const html = await response.text();
  expect(html).toContain('<html lang="fr">');
  expect(html).toContain('<title>Grand titre</title>');
  expect(html).toContain('<section class="ld-section" id="premiere">');
  expect(html).toContain('<a href="#seconde">Seconde</a>');
  expect(html).toContain('<strong>gras</strong>');
  expect(html).not.toContain('html_template');
  expect(html).not.toContain('{{');
});

test('render reflects the current content of the document', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'fiche', SHEET);
  writeDoc(ld.docsAbs, 'fiche', SHEET.replace('Première', 'Modifiée'));
  const html = await (await request.get(`${ld.baseURL}/api/html-templates/render?doc=fiche`)).text();
  expect(html).toContain('id="modifiee"');
});

test('render answers 404 without a known template and 403 outside the docs folder', async ({ request, ld }) => {
  writeDoc(ld.docsAbs, 'sans', '# Sans template');
  writeDoc(ld.docsAbs, 'inconnu', '---\nhtml_template: ../../secret\n---\n\n# Inconnu');
  const status = async (doc: string) =>
    (await request.get(`${ld.baseURL}/api/html-templates/render?doc=${encodeURIComponent(doc)}`)).status();
  expect(await status('sans')).toBe(404);
  expect(await status('inconnu')).toBe(404);
  expect(await status('absent')).toBe(404);
  expect(await status('../secret')).toBe(403);
  expect(await status('/etc/passwd')).toBe(403);
});

test('render finds a document in a subfolder from the id given by the documents API', async ({ request, ld }) => {
  fs.mkdirSync(path.join(ld.docsAbs, 'Sous dossier'));
  writeDoc(path.join(ld.docsAbs, 'Sous dossier'), 'fiche été', SHEET);
  const docs: { id: string; filename: string }[] = await (await request.get(`${ld.baseURL}/api/documents`)).json();
  const doc = docs.find((candidate) => candidate.filename.includes('fiche été'));
  expect(doc).toBeDefined();
  const response = await request.get(`${ld.baseURL}/api/html-templates/render?doc=${encodeURIComponent(doc?.id ?? '')}`);
  expect(response.status()).toBe(200);
});
