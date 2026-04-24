import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface FixtureContext {
  parent: string; // OS temp dir hosting the fixture
  docsArg: string; // path passed to the CLI (always relative, e.g. "./testdocs")
  docsAbs: string; // absolute path to the docs folder
}

function copyRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function sha256File(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

// Fixtures with .metadata.json may use the sentinel "__FRESH__" for hash values
// to mean "compute this against the current source file at setup time".
function rebaselineMetadata(docsAbs: string): void {
  const metaPath = path.join(docsAbs, '.metadata.json');
  if (!fs.existsSync(metaPath)) return;
  const raw = fs.readFileSync(metaPath, 'utf-8');
  const store = JSON.parse(raw) as Record<string, Array<{ path: string; hash: string }>>;
  const configRaw = fs.readFileSync(path.join(docsAbs, '.living-doc.json'), 'utf-8');
  const config = JSON.parse(configRaw) as { sourceRoot?: string | null };
  const sourceRoot = path.resolve(docsAbs, config.sourceRoot || '..');

  let dirty = false;
  for (const docId of Object.keys(store)) {
    for (const entry of store[docId]) {
      if (entry.hash === '__FRESH__') {
        entry.hash = sha256File(path.resolve(sourceRoot, entry.path));
        dirty = true;
      }
    }
  }
  if (dirty) {
    fs.writeFileSync(metaPath, JSON.stringify(store, null, 2), 'utf-8');
  }
}

export async function setupFixture(name: string): Promise<FixtureContext> {
  const fixtureSrc = path.resolve(__dirname, '../fixtures', name);
  if (!fs.existsSync(fixtureSrc)) {
    throw new Error(`Fixture not found: ${fixtureSrc}`);
  }
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'ld-test-'));
  copyRecursive(fixtureSrc, parent);
  const docsArg = './testdocs';
  const docsAbs = path.join(parent, 'testdocs');
  rebaselineMetadata(docsAbs);
  return { parent, docsArg, docsAbs };
}

export async function teardownFixture(ctx: FixtureContext): Promise<void> {
  await fs.promises.rm(ctx.parent, { recursive: true, force: true });
}
