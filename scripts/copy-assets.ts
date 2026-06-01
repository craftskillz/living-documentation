#!/usr/bin/env ts-node
// Copies frontend assets (HTML, vendor aka wordcloud2.js) into the dist/ directory after tsc compile

import fs from "fs";
import path from "path";

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

function copyFreshDir(src: string, dest: string): void {
  fs.rmSync(dest, { recursive: true, force: true });
  copyDir(src, dest);
}

const src = path.join(__dirname, "..", "src", "frontend");
const dest = path.join(__dirname, "..", "dist", "src", "frontend");

copyFreshDir(src, dest);
console.log(`Copied frontend assets → dist/src/frontend/`);

for (const legacyStarterName of ["starting-doc", "starting-doc-fr"]) {
  fs.rmSync(path.join(__dirname, "..", "dist", legacyStarterName), {
    recursive: true,
    force: true,
  });
}

for (const starterName of ["starter-doc", "starter-doc-fr"]) {
  const starterDocSrc = path.join(__dirname, "..", starterName);
  const starterDocDest = path.join(__dirname, "..", "dist", starterName);

  if (fs.existsSync(starterDocSrc)) {
    copyFreshDir(starterDocSrc, starterDocDest);
    console.log(`Copied ${starterName} → dist/${starterName}/`);
  }
}
