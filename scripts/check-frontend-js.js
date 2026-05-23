#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const { readdirSync } = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const frontendRoot = path.join(projectRoot, "src", "frontend");

function collectJavaScriptFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectJavaScriptFiles(fullPath);
      return entry.isFile() && entry.name.endsWith(".js") ? [fullPath] : [];
    })
    .sort();
}

const files = collectJavaScriptFiles(frontendRoot);
let failures = 0;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });
  if (result.status === 0) continue;

  failures += 1;
  console.error(`\nSyntax check failed: ${path.relative(projectRoot, file)}`);
  if (result.stdout) console.error(result.stdout.trimEnd());
  if (result.stderr) console.error(result.stderr.trimEnd());
}

if (failures > 0) {
  console.error(`\nFrontend JavaScript syntax check failed in ${failures} file(s).`);
  process.exit(1);
}

console.log(`Checked ${files.length} frontend JavaScript file(s).`);
