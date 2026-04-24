#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import fs from "fs";
import { startServer } from "../src/server";

// Handle SIGTERM gracefully so V8 flushes NODE_V8_COVERAGE (used by c8 in tests).
// Also good hygiene — without this, process exits with code 143 and Express sockets
// may be dropped mid-flight. process.exit(0) runs pending exit handlers.
process.once("SIGTERM", () => process.exit(0));

const program = new Command();

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

program
  .name("living-documentation")
  .description("Serve a local Markdown documentation viewer over HTTP on your machine.")
  .version("1.0.0")
  .argument(
    "[folder]",
    "Relative path to the documentation folder (must be relative — e.g. ./mydocs or ../shared/docs — so the stored .living-doc.json stays portable across machines). Defaults to the current directory.",
    ".",
  )
  .option("-i, --init", "Scaffold a demo project in an empty folder (sample docs + .living-doc.json)")
  .option("-p, --port <number>", "HTTP port to listen on (1-65535)", "4321")
  .option("-o, --open", "Open the viewer in the default browser after startup")
  .addHelpText(
    "after",
    `
Examples:
  $ npx living-documentation ./mydocs                Serve existing docs at http://localhost:4321
  $ npx living-documentation ./mydocs -p 5000 -o     Serve on port 5000 and open the browser
  $ npx living-documentation ./newdocs --init        Scaffold a demo project into an empty folder

Notes:
  - The folder argument must be a relative path. Absolute paths (/abs/...) and ~-expansion are rejected
    so .living-doc.json can be checked into git and shared across machines.
  - Configuration is persisted to <folder>/.living-doc.json. Edit it via the admin panel at /admin.
`,
  )
  .action(async (folder: string, options: { init?: boolean; port: string; open: boolean }) => {
    if (path.isAbsolute(folder) || folder.startsWith("~")) {
      console.error(
        `\nError: The docs folder must be a relative path (got: ${folder}).\n` +
          `  Example: npx living-documentation ./mydocs\n` +
          `  Absolute paths are rejected so .living-doc.json stays portable across machines.\n`,
      );
      process.exit(1);
    }

    const docsPath = path.resolve(process.cwd(), folder);

    if (!fs.existsSync(docsPath)) {
      console.error(`\nError: Folder not found: ${docsPath}\n`);
      process.exit(1);
    }

    const stat = fs.statSync(docsPath);
    if (!stat.isDirectory()) {
      console.error(`\nError: Not a directory: ${docsPath}\n`);
      process.exit(1);
    }

    if (options.init) {
      const existing = fs.readdirSync(docsPath);
      if (existing.length > 0) {
        console.error(`\nError: Folder is not empty: ${docsPath}\n`);
        process.exit(1);
      }
      const startingDocPath = path.join(__dirname, "..", "starting-doc");
      copyDir(startingDocPath, docsPath);
      console.log(`\nInitialized demo project in ${docsPath}\n`);
    }

    const port = parseInt(options.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error("\nError: Invalid port number\n");
      process.exit(1);
    }

    await startServer({ docsPath, port, openBrowser: options.open ?? false });
  });

program.parse();
