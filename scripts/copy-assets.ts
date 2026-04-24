#!/usr/bin/env ts-node
// Copies frontend assets (HTML, vendor) into the dist/ directory after tsc compile

import fs from 'fs';
import path from 'path';

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const src = path.join(__dirname, '..', 'src', 'frontend');
const dest = path.join(__dirname, '..', 'dist', 'src', 'frontend');

copyDir(src, dest);
console.log(`Copied frontend assets → dist/src/frontend/`);

const startingDocSrc = path.join(__dirname, '..', 'starting-doc');
const startingDocDest = path.join(__dirname, '..', 'dist', 'starting-doc');

copyDir(startingDocSrc, startingDocDest);
console.log(`Copied starting-doc → dist/starting-doc/`);
