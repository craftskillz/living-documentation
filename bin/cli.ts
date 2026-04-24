#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import fs from "fs";
import { startServer } from "../src/server";

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
  .description("Serve a local Markdown documentation viewer")
  .version("1.0.0")
  .argument("[folder]", "Path to documentation folder", ".")
  .option("-i, --init", "Initialize a demo project")
  .option("-p, --port <number>", "Port to listen on", "4321")
  .option("-o, --open", "Open browser automatically")
  .action(async (folder: string, options: { init?: boolean; port: string; open: boolean }) => {
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
