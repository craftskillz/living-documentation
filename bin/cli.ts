#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { startServer } from '../src/server';

const program = new Command();

program
  .name('living-documentation')
  .description('Serve a local Markdown documentation viewer')
  .version('1.0.0')
  .argument('[folder]', 'Path to documentation folder', '.')
  .option('-p, --port <number>', 'Port to listen on', '4321')
  .option('-o, --open', 'Open browser automatically')
  .action(async (folder: string, options: { port: string; open: boolean }) => {
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

    const port = parseInt(options.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error('\nError: Invalid port number\n');
      process.exit(1);
    }

    await startServer({ docsPath, port, openBrowser: options.open ?? false });
  });

program.parse();
