#!/usr/bin/env ts-node
// Post-build asset copy. The frontend is built by Vite (→ dist/frontend-svelte);
// this script only copies the bundled starter docs into dist/.

import fs from "node:fs";
import path from "node:path";

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
