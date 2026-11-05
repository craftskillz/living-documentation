import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { previewFile, MAX_TEXT_BYTES } from '../../src/lib/filePreview';
import { isExecutableFile, resolveOtherFile } from '../../src/lib/otherFiles';
import { isLocalRequest } from '../../src/lib/localRequest';

const local = { remoteAddress: '127.0.0.1', host: 'localhost:4321' };

function tempDir(): string {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-other-files-')));
}

function write(dir: string, name: string, content: string | Buffer = 'x', mode = 0o644): string {
  const abs = path.join(dir, name);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, { mode });
  return abs;
}

test('a request is local only when its socket, Host and Origin are all loopback', () => {
  assert.equal(isLocalRequest(local), true);
  assert.equal(isLocalRequest({ remoteAddress: '::1', host: '[::1]:4321' }), true);
  assert.equal(isLocalRequest({ remoteAddress: '::ffff:127.0.0.1', host: '127.0.0.1:4321' }), true);
  assert.equal(isLocalRequest({ ...local, origin: 'http://localhost:4321' }), true);
  // Vite dev proxy keeps the browser Host.
  assert.equal(isLocalRequest({ ...local, host: 'localhost:5174', origin: 'http://localhost:5174' }), true);

  assert.equal(isLocalRequest({ ...local, remoteAddress: '192.168.1.20' }), false, 'LAN client');
  assert.equal(isLocalRequest({ ...local, remoteAddress: undefined }), false, 'unknown socket');
  assert.equal(isLocalRequest({ ...local, host: 'evil.example:4321' }), false, 'DNS rebinding');
  assert.equal(isLocalRequest({ ...local, host: undefined }), false, 'no Host');
  assert.equal(isLocalRequest({ ...local, origin: 'http://evil.example' }), false, 'other site');
  assert.equal(isLocalRequest({ ...local, origin: 'http://localhost:3000' }), false, 'other local app');
  assert.equal(isLocalRequest({ ...local, origin: 'null' }), false, 'sandboxed page');
});

test('previewFile classifies text, image, video and binary files', () => {
  const dir = tempDir();
  const rawUrl = '/raw';
  assert.deepEqual(previewFile(write(dir, '.env', 'A=1'), rawUrl), {
    type: 'text', content: 'A=1', language: 'plaintext', truncated: false,
  });
  assert.equal(previewFile(write(dir, 'a.py', 'print(1)'), rawUrl).language, 'python');
  assert.deepEqual(previewFile(write(dir, 'a.PNG'), rawUrl), { type: 'image', url: rawUrl });
  assert.deepEqual(previewFile(write(dir, 'a.mp4'), rawUrl), { type: 'video', url: rawUrl });
  assert.deepEqual(previewFile(write(dir, 'blob', Buffer.from([65, 0, 66])), rawUrl), { type: 'binary' });
});

test('previewFile treats documents and archives as binary even without a NUL byte', () => {
  const dir = tempDir();
  for (const name of ['a.pdf', 'a.docx', 'a.xlsx', 'a.pptx', 'a.zip', 'a.DOCX']) {
    assert.deepEqual(previewFile(write(dir, name, '%PDF-1.4 only ascii'), '/raw'), { type: 'binary' }, name);
  }
});

test('previewFile reads at most MAX_TEXT_BYTES of a large text file and flags it', () => {
  const dir = tempDir();
  const preview = previewFile(write(dir, 'big.log', 'a'.repeat(MAX_TEXT_BYTES + 10)), '/raw');
  assert.equal(preview.truncated, true);
  assert.equal(preview.content?.length, MAX_TEXT_BYTES);
});

test('resolveOtherFile confines paths to the non-Markdown files of the docs folder', () => {
  const root = tempDir();
  const docs = path.join(root, 'docs');
  const file = write(docs, 'sub/report.pdf');
  write(docs, 'sub/guide.md');
  write(docs, '.git/config');
  write(docs, '.DS_Store');
  const outside = write(root, 'secret.pdf');
  fs.symlinkSync(outside, path.join(docs, 'link.pdf'));

  assert.equal(resolveOtherFile(docs, 'sub/report.pdf'), file);
  for (const rel of ['', '../secret.pdf', 'sub/../../secret.pdf', outside, 'link.pdf', 'sub/guide.md', '.git/config', '.DS_Store', 'node_modules/a.js', 'sub', 'missing.pdf']) {
    assert.equal(resolveOtherFile(docs, rel), null, rel);
  }
});

test('isExecutableFile refuses executables by extension or permission bit', () => {
  const dir = tempDir();
  for (const name of ['a.exe', 'a.APP', 'a.pkg', 'a.dmg', 'a.msi', 'a.bat', 'a.command', 'a.jar', 'a.desktop', 'a.webloc', 'a.exe.', 'a.exe ']) {
    assert.equal(isExecutableFile(write(dir, name)), true, name);
  }
  if (process.platform !== 'win32') {
    assert.equal(isExecutableFile(write(dir, 'tool', 'x', 0o755)), true, 'exec bit');
  }
  for (const name of ['a.pdf', 'a.docx', 'a.zip', 'noext']) {
    assert.equal(isExecutableFile(write(dir, name)), false, name);
  }
});
