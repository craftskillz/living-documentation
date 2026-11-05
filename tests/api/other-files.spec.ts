import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../helpers/ld-fixture';

const contentUrl = (base: string, rel: string) => `${base}/api/other-files/content?path=${encodeURIComponent(rel)}`;
const rawUrl = (base: string, rel: string) => `${base}/api/other-files/raw?path=${encodeURIComponent(rel)}`;

function put(docsAbs: string, rel: string, content: string | Buffer = 'x', mode = 0o644) {
  const abs = path.join(docsAbs, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, { mode });
}

test('GET content returns a text file of the docs folder, dot files included', async ({ request, ld }) => {
  put(ld.docsAbs, 'conf/.env', 'TOKEN=1');
  const res = await request.get(contentUrl(ld.baseURL, 'conf/.env'));
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ type: 'text', content: 'TOKEN=1', language: 'plaintext', truncated: false });
});

test('GET content points images at the raw route, which serves them safely', async ({ request, ld }) => {
  put(ld.docsAbs, '.assets/a.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const body = await (await request.get(contentUrl(ld.baseURL, '.assets/a.svg'))).json();
  expect(body).toEqual({ type: 'image', url: '/api/other-files/raw?path=.assets%2Fa.svg' });

  const raw = await request.get(`${ld.baseURL}${body.url}`);
  expect(raw.status()).toBe(200);
  expect(raw.headers()['x-content-type-options']).toBe('nosniff');
  expect(raw.headers()['content-security-policy']).toContain('sandbox');
});

test('GET raw only serves images and videos', async ({ request, ld }) => {
  put(ld.docsAbs, 'page.html', '<script>alert(1)</script>');
  expect((await request.get(rawUrl(ld.baseURL, 'page.html'))).status()).toBe(415);
});

test('paths outside the docs folder, Markdown and tool folders are refused', async ({ request, ld }) => {
  fs.writeFileSync(path.join(ld.parent, 'outside.txt'), 'secret');
  put(ld.docsAbs, 'guide.md', '# G');
  put(ld.docsAbs, '.git/config', 'x');
  for (const rel of ['../outside.txt', 'guide.md', '.git/config', 'missing.txt']) {
    expect((await request.get(contentUrl(ld.baseURL, rel))).status(), rel).toBe(404);
  }
});

test('every route refuses a request that is not same-origin on loopback', async ({ request, ld }) => {
  put(ld.docsAbs, '.env', 'TOKEN=1');
  put(ld.docsAbs, 'a.pdf', 'pdf');
  put(ld.docsAbs, 'a.png', 'png');
  const url = contentUrl(ld.baseURL, '.env');
  expect((await request.get(url, { headers: { Host: 'evil.example' } })).status()).toBe(403);
  expect((await request.get(url, { headers: { Origin: 'http://evil.example' } })).status()).toBe(403);
  expect((await request.get(rawUrl(ld.baseURL, 'a.png'), { headers: { Host: 'evil.example' } })).status()).toBe(403);
  const post = await request.post(`${ld.baseURL}/api/other-files/open`, {
    data: { path: 'a.pdf' },
    headers: { Origin: 'http://evil.example' },
  });
  expect(post.status()).toBe(403);
  expect(ld.openedFiles()).toEqual([]);
});

test('POST open hands a binary file to the OS, without an auto-commit', async ({ request, ld }) => {
  put(ld.docsAbs, 'docs dir/rep ort.pdf', 'pdf');
  const res = await request.post(`${ld.baseURL}/api/other-files/open`, { data: { path: 'docs dir/rep ort.pdf' } });
  expect(res.status()).toBe(200);
  expect(res.headers()['x-living-doc-git-message']).toBeUndefined();
  expect(ld.openedFiles()).toEqual([fs.realpathSync(path.join(ld.docsAbs, 'docs dir/rep ort.pdf'))]);
});

test('POST open never runs a shell on the file name', async ({ request, ld }) => {
  const name = 'a"; touch pwned; ".pdf';
  put(ld.docsAbs, name, 'pdf');
  const res = await request.post(`${ld.baseURL}/api/other-files/open`, { data: { path: name } });
  expect(res.status()).toBe(200);
  expect(ld.openedFiles()).toEqual([fs.realpathSync(path.join(ld.docsAbs, name))]);
  expect(fs.existsSync(path.join(ld.parent, 'pwned'))).toBe(false);
});

test('POST open refuses executables, text and media files', async ({ request, ld }) => {
  put(ld.docsAbs, 'setup.exe', Buffer.from([77, 90, 0]));
  put(ld.docsAbs, 'tool', Buffer.from([0, 1]), 0o755);
  put(ld.docsAbs, 'run.command', '#!/bin/sh');
  put(ld.docsAbs, 'a.png', 'png');
  const open = (rel: string) => request.post(`${ld.baseURL}/api/other-files/open`, { data: { path: rel } });

  expect((await open('setup.exe')).status()).toBe(403);
  expect((await open('tool')).status()).toBe(403);
  expect((await open('run.command')).status()).toBe(403);
  expect((await open('a.png')).status()).toBe(400);
  expect((await open('../x.pdf')).status()).toBe(404);
  expect(ld.openedFiles()).toEqual([]);
});

test('POST open reports the failure of the OS', async ({ request, ld }) => {
  put(ld.docsAbs, 'fail-open.pdf', 'pdf');
  const res = await request.post(`${ld.baseURL}/api/other-files/open`, { data: { path: 'fail-open.pdf' } });
  expect(res.status()).toBe(502);
});
