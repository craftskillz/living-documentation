import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '../helpers/ld-fixture';

test('GET /api/context/orientation returns user-added instructions and rules', async ({
  request,
  ld,
}) => {
  fs.mkdirSync(path.join(ld.docsAbs, 'AI'), { recursive: true });
  fs.writeFileSync(path.join(ld.docsAbs, 'AI', 'AGENTS.md'), '# Agent rules\n', 'utf-8');

  const rulesDir = path.join(ld.docsAbs, 'AI', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.writeFileSync(
    path.join(rulesDir, 'no-magic-numbers.md'),
    [
      '---',
      'id: no-magic-numbers',
      'title: Avoid magic numbers',
      'severity: warning',
      'description: Name constants with domain meaning.',
      'tags: ["code-quality", "maintainability"]',
      'appliesTo: ["src/**/*.ts"]',
      '---',
      '',
      'Numeric constants with domain meaning should be named.',
      '',
    ].join('\n'),
    'utf-8',
  );

  const res = await request.get(`${ld.baseURL}/api/context/orientation`);
  expect(res.ok()).toBe(true);
  const body = await res.json();

  expect(body.instructions).toContainEqual(expect.objectContaining({
    path: 'AI/AGENTS.md',
    root: 'docsFolder',
    exists: true,
    type: 'file',
  }));
  expect(body.rules).toContainEqual(expect.objectContaining({
    id: 'no-magic-numbers',
    title: 'Avoid magic numbers',
    severity: 'warning',
    tags: ['code-quality', 'maintainability'],
  }));
  expect(body.adrs).toBeUndefined();
  expect(body.commands).toBeUndefined();
  expect(body.roots).toBeUndefined();
  expect(body.sourceRoot).toBe(ld.parent);
  expect(body.rulesFolder).toBe('AI/rules');
});

test('POST /api/context/rules creates an AI rule markdown file under docs', async ({
  request,
  ld,
}) => {
  const res = await request.post(`${ld.baseURL}/api/context/rules`, {
    data: {
      title: 'Avoid magic numbers',
      severity: 'warning',
      description: 'Name constants with domain meaning.',
      tags: ['code-quality'],
      appliesTo: ['src/**/*.ts'],
      body: 'Numeric constants with domain meaning should be named.',
    },
  });

  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body).toMatchObject({
    id: 'avoid-magic-numbers',
    path: 'AI/rules/avoid-magic-numbers.md',
  });

  const rulePath = path.join(ld.docsAbs, 'AI', 'rules', 'avoid-magic-numbers.md');
  expect(fs.readFileSync(rulePath, 'utf-8')).toContain('title: Avoid magic numbers');

  const orientation = await request.get(`${ld.baseURL}/api/context/orientation`);
  const orientationBody = await orientation.json();
  expect(orientationBody.rules).toContainEqual(expect.objectContaining({
    id: 'avoid-magic-numbers',
    title: 'Avoid magic numbers',
  }));
});

test('POST /api/context/instructions links a Markdown file into AI so it appears as a document', async ({
  request,
  ld,
}) => {
  const sourcePath = path.join(ld.parent, 'CLAUDE.md');
  fs.writeFileSync(sourcePath, '# Claude instructions\n', 'utf-8');

  const res = await request.post(`${ld.baseURL}/api/context/instructions`, {
    data: { path: sourcePath },
  });

  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body).toMatchObject({
    path: 'AI/CLAUDE.md',
    root: 'docsFolder',
    exists: true,
    type: 'file',
  });
  const linkedPath = path.join(ld.docsAbs, 'AI', 'CLAUDE.md');
  expect(fs.lstatSync(linkedPath).isSymbolicLink()).toBe(true);
  expect(fs.readFileSync(linkedPath, 'utf-8')).toContain('# Claude instructions');
  fs.writeFileSync(sourcePath, '# Updated Claude instructions\n', 'utf-8');
  expect(fs.readFileSync(linkedPath, 'utf-8')).toContain('# Updated Claude instructions');

  const docsRes = await request.get(`${ld.baseURL}/api/documents`);
  const docs = (await docsRes.json()) as Array<{ filename: string; folder: string[] | null; title: string }>;
  expect(docs).toContainEqual(expect.objectContaining({
    filename: 'AI/CLAUDE.md',
    folder: ['AI'],
    title: 'CLAUDE',
  }));
});

test('DELETE /api/context/instructions/:filename removes the linked AI document only', async ({
  request,
  ld,
}) => {
  const aiDir = path.join(ld.docsAbs, 'AI');
  const sourcePath = path.join(ld.parent, 'AGENTS.md');
  fs.mkdirSync(aiDir, { recursive: true });
  fs.writeFileSync(sourcePath, '# Agent rules\n', 'utf-8');
  fs.symlinkSync(path.relative(aiDir, sourcePath), path.join(aiDir, 'AGENTS.md'), 'file');

  const res = await request.delete(`${ld.baseURL}/api/context/instructions/AGENTS.md`);
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ deleted: 'AI/AGENTS.md' });
  expect(fs.existsSync(path.join(aiDir, 'AGENTS.md'))).toBe(false);
  expect(fs.existsSync(sourcePath)).toBe(true);

  const orientation = await request.get(`${ld.baseURL}/api/context/orientation`);
  const orientationBody = await orientation.json();
  expect(orientationBody.instructions).not.toContainEqual(expect.objectContaining({
    path: 'AI/AGENTS.md',
  }));

  const docsRes = await request.get(`${ld.baseURL}/api/documents`);
  const docs = (await docsRes.json()) as Array<{ filename: string }>;
  expect(docs).not.toContainEqual(expect.objectContaining({ filename: 'AI/AGENTS.md' }));
});
