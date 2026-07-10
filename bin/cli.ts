#!/usr/bin/env node

import { Command } from "commander";
import path from "node:path";
import fs from "node:fs";
import { createInterface } from "node:readline/promises";
import { startServer } from "../src/server";
import { readConfig, isOkfMigrated } from "../src/lib/config";
import { migrateDocsFolder } from "../src/lib/migrate";
import { validateOkfBundle } from "../src/lib/okf/validate";

// Handle SIGTERM gracefully so V8 flushes NODE_V8_COVERAGE (used by c8 in tests).
// Also good hygiene — without this, process exits with code 143 and Express sockets
// may be dropped mid-flight. process.exit(0) runs pending exit handlers.
process.once("SIGTERM", () => process.exit(0));

const program = new Command();
const CONFIG_FILENAME = ".living-doc.json";
type InitLanguage = "en" | "fr";
type InitInstructionFile = {
  sourcePath: string;
  copyPath: string;
  aiLinkPath: string;
  aiLinkTarget: string;
};

function parseInitLanguage(value: string): InitLanguage | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "en" || normalized === "fr") {
    return normalized;
  }
  return null;
}

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

function docsFolderReference(docsPath: string): string {
  const projectRoot = path.dirname(docsPath);
  return path.relative(projectRoot, docsPath).split(path.sep).join("/") || ".";
}

function replaceDocsFolderPlaceholders(rootPath: string, docsFolder: string): void {
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      replaceDocsFolderPlaceholders(fullPath, docsFolder);
      continue;
    }
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".md") {
      continue;
    }
    const content = fs.readFileSync(fullPath, "utf-8");
    if (!content.includes("DOCS_FOLDER")) {
      continue;
    }
    fs.writeFileSync(fullPath, content.split("DOCS_FOLDER").join(docsFolder), "utf-8");
  }
}

function validateRelativeFolder(folder: string): void {
  if (path.isAbsolute(folder) || folder.startsWith("~")) {
    console.error(
      `\nError: The docs folder must be a relative path (got: ${folder}).\n` +
        `  Example: npx living-ai-documentation ./mydocs\n` +
        `  Absolute paths are rejected so .living-doc.json stays portable across machines.\n`,
    );
    process.exit(1);
  }
}

function scaffoldStarter(docsPath: string, initLanguage: InitLanguage): void {
  const starterDir = initLanguage === "fr" ? "starter-doc-fr" : "starter-doc";
  const starterDocPath = path.join(__dirname, "..", starterDir);
  if (!fs.existsSync(starterDocPath)) {
    console.error(`\nError: Starter template not found: ${starterDir}\n`);
    process.exit(1);
  }
  copyDir(starterDocPath, docsPath);
  console.log(`\nInitialized ${initLanguage} documentation project in ${docsPath}\n`);
}

function initInstructionFiles(docsPath: string): InitInstructionFile[] {
  const projectRoot = path.dirname(docsPath);
  const aiPath = path.join(docsPath, "AI");
  return [
    {
      sourcePath: path.join(docsPath, "AI", "default", "AGENTS.md"),
      copyPath: path.join(projectRoot, "AGENTS.md"),
      aiLinkPath: path.join(aiPath, "AGENTS.md"),
      aiLinkTarget: path.relative(aiPath, path.join(projectRoot, "AGENTS.md")),
    },
    {
      sourcePath: path.join(docsPath, "AI", "default", "CLAUDE.md"),
      copyPath: path.join(projectRoot, "CLAUDE.md"),
      aiLinkPath: path.join(aiPath, "CLAUDE.md"),
      aiLinkTarget: path.relative(aiPath, path.join(projectRoot, "CLAUDE.md")),
    },
    {
      sourcePath: path.join(docsPath, "AI", "default", "MEMORY.md"),
      copyPath: path.join(projectRoot, "memory", "MEMORY.md"),
      aiLinkPath: path.join(aiPath, "MEMORY.md"),
      aiLinkTarget: path.relative(aiPath, path.join(projectRoot, "memory", "MEMORY.md")),
    },
  ];
}

function tryLstat(filePath: string): fs.Stats | null {
  try {
    return fs.lstatSync(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function isMissingOrEmptyFile(filePath: string): boolean {
  const stat = tryLstat(filePath);
  if (!stat) {
    return true;
  }
  return stat.isFile() && stat.size === 0;
}

function validateInitInstructionTargets(docsPath: string, instructionFiles: InitInstructionFile[]): void {
  const projectRoot = path.dirname(docsPath);
  const memoryPath = path.join(projectRoot, "memory");
  if (fs.existsSync(memoryPath) && !fs.lstatSync(memoryPath).isDirectory()) {
    console.error(`\nError: Cannot create memory/MEMORY.md because memory is not a directory: ${memoryPath}\n`);
    process.exit(1);
  }

  for (const { copyPath } of instructionFiles) {
    if (!isMissingOrEmptyFile(copyPath)) {
      console.error(
        `\nError: Cannot initialize because ${path.relative(projectRoot, copyPath)} already exists and is not empty.\n` +
          `  Move it, empty it, or choose another project root before running the initializer.\n`,
      );
      process.exit(1);
    }
  }
}

function createInitInstructionFiles(instructionFiles: InitInstructionFile[]): void {
  for (const { sourcePath, copyPath, aiLinkPath, aiLinkTarget } of instructionFiles) {
    fs.mkdirSync(path.dirname(copyPath), { recursive: true });
    if (tryLstat(copyPath)) {
      fs.unlinkSync(copyPath);
    }
    fs.copyFileSync(sourcePath, copyPath);

    if (tryLstat(aiLinkPath)) {
      fs.unlinkSync(aiLinkPath);
    }
    fs.symlinkSync(aiLinkTarget, aiLinkPath, "file");
  }
}

function removeStarterDefaults(docsPath: string): void {
  fs.rmSync(path.join(docsPath, "AI", "default"), { recursive: true, force: true });
}

function hasLivingDocConfig(folderPath: string): boolean {
  return fs.existsSync(path.join(folderPath, CONFIG_FILENAME));
}

function findOneLevelDocumentationFolders(cwd: string): string[] {
  return fs
    .readdirSync(cwd, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => hasLivingDocConfig(path.join(cwd, name)))
    .sort((a, b) => a.localeCompare(b));
}

async function confirmExistingDocumentation(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(message);
    const normalized = answer.trim().toLowerCase();
    return ["y", "yes", "o", "oui"].includes(normalized);
  } finally {
    rl.close();
  }
}

async function findExistingDocumentationFolder(): Promise<string | null> {
  const cwd = process.cwd();
  if (hasLivingDocConfig(cwd)) {
    const shouldLaunch = await confirmExistingDocumentation(
      "An existing version of Living Documentation was found in the current folder. Do you want to launch it? (y/n) ",
    );
    if (shouldLaunch) {
      return ".";
    }
  }

  for (const folder of findOneLevelDocumentationFolders(cwd)) {
    const shouldLaunch = await confirmExistingDocumentation(
      `An existing version of Living Documentation was found in ./${folder}. Do you want to launch it? (y/n) `,
    );
    if (shouldLaunch) {
      return `./${folder}`;
    }
  }

  return null;
}

async function runInitWizard(
  options: { starterLanguage?: string; port: string; open: boolean },
  presetFolder?: string,
): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const folder = presetFolder
      ? presetFolder.trim()
      : (
          await rl.question(
            "Documentation folder to create / Dossier de documentation à créer: ",
          )
        ).trim();
    if (!folder) {
      console.error("\nError: Documentation folder is required.\n");
      process.exit(1);
    }

    validateRelativeFolder(folder);
    const docsPath = path.resolve(process.cwd(), folder);
    let shouldCreateDocsPath = false;

    if (options.starterLanguage && !parseInitLanguage(options.starterLanguage)) {
      console.error("\nError: Invalid init language. Expected en or fr.\n");
      process.exit(1);
    }

    if (fs.existsSync(docsPath)) {
      const stat = fs.statSync(docsPath);
      if (!stat.isDirectory()) {
        console.error(`\nError: Not a directory: ${docsPath}\n`);
        process.exit(1);
      }
      const existing = fs.readdirSync(docsPath);
      if (existing.length > 0) {
        console.error(`\nError: Folder is not empty: ${docsPath}\n`);
        process.exit(1);
      }
    } else {
      shouldCreateDocsPath = true;
    }
    validateInitInstructionTargets(docsPath, initInstructionFiles(docsPath));

    let initLanguage = options.starterLanguage ? parseInitLanguage(options.starterLanguage) : null;
    if (!initLanguage && !process.stdin.isTTY) {
      initLanguage = "en";
    }
    while (!initLanguage) {
      const answer = await rl.question(
        "Choose starter language / Choisissez la langue du starter [en/fr] (en): ",
      );
      initLanguage = answer.trim() === "" ? "en" : parseInitLanguage(answer);
      if (!initLanguage) {
        console.log("Please answer en or fr.");
      }
    }

    if (shouldCreateDocsPath) {
      fs.mkdirSync(docsPath, { recursive: true });
    }

    scaffoldStarter(docsPath, initLanguage);
    replaceDocsFolderPlaceholders(docsPath, docsFolderReference(docsPath));
    const instructionFiles = initInstructionFiles(docsPath);
    createInitInstructionFiles(instructionFiles);
    removeStarterDefaults(docsPath);

    // Make the freshly scaffolded starter a conformant OKF bundle and stamp the
    // migration flag, so the new project opens without hitting the startup gate.
    migrateDocsFolder(docsPath);

    const port = parseInt(options.port, 10);
    if (Number.isNaN(port) || port < 1 || port > 65535) {
      console.error("\nError: Invalid port number\n");
      process.exit(1);
    }

    await startServer({ docsPath, port, openBrowser: options.open ?? false });
  } finally {
    rl.close();
  }
}

program
  .name("living-ai-documentation")
  .description("Serve a local Markdown documentation viewer over HTTP on your machine.")
  .version("1.0.0")
  .argument(
    "[folder]",
    "Relative path to an existing documentation folder. Omit it to start the interactive initializer.",
  )
  .option("--starter-language <language>", "Starter language for the interactive initializer: en or fr")
  .option("-p, --port <number>", "HTTP port to listen on (1-65535)", "4321")
  .option("-o, --open", "Open the viewer in the default browser after startup")
  .addHelpText(
    "after",
    `
Examples:
  $ npx living-ai-documentation                         Detect an existing project nearby or create one interactively
  $ npx living-ai-documentation ./mydocs                Serve existing docs at http://localhost:4321
  $ npx living-ai-documentation ./mydocs -p 5000 -o     Serve on port 5000 and open the browser

Notes:
  - The folder argument must be a relative path. Absolute paths (/abs/...) and ~-expansion are rejected
    so .living-doc.json can be checked into git and shared across machines.
  - When no folder is provided, the CLI first offers to launch a project found in the current folder
    or one level below it, then falls back to the initializer.
  - When a folder is provided but has no .living-doc.json yet, the initializer uses that folder
    as the target project.
  - The initializer copies AGENTS.md, CLAUDE.md and memory/MEMORY.md to the parent
    of the documentation folder, then exposes them in <folder>/AI/ through symbolic links.
    If one already exists with content, initialization stops instead of overwriting it.
  - Configuration is persisted to <folder>/.living-doc.json. Edit it via the admin panel at /admin.
`,
  )
  .action(async (folder: string | undefined, options: { starterLanguage?: string; port: string; open: boolean }) => {
    let folderToServe = folder;
    if (!folderToServe) {
      folderToServe = (await findExistingDocumentationFolder()) ?? undefined;
      if (!folderToServe) {
        await runInitWizard(options);
        return;
      }
    }

    validateRelativeFolder(folderToServe);
    const docsPath = path.resolve(process.cwd(), folderToServe);

    if (!hasLivingDocConfig(docsPath)) {
      console.log(`\nNo .living-doc.json found in ${folderToServe}. Starting initialization wizard.\n`);
      await runInitWizard(options, folderToServe);
      return;
    }

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
    if (Number.isNaN(port) || port < 1 || port > 65535) {
      console.error("\nError: Invalid port number\n");
      process.exit(1);
    }

    // OKF startup gate — refuse to open a project that has not been migrated to
    // the Open Knowledge Format YAML frontmatter.
    if (!isOkfMigrated(readConfig(docsPath))) {
      console.error(
        `\nThis project is not migrated to the Open Knowledge Format (OKF).\n` +
          `living-documentation now aligns natively with Google's OKF, so the docs\n` +
          `folder must be migrated (a deterministic, one-time conversion) before it\n` +
          `can be opened.\n`,
      );
      let doMigrate = false;
      if (process.stdin.isTTY) {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const answer = await rl.question(`Migrate "${folderToServe}" now? [y/N] `);
        rl.close();
        doMigrate = ["y", "yes", "o", "oui"].includes(answer.trim().toLowerCase());
      }
      if (!doMigrate) {
        console.error(`Run:  npx living-ai-documentation migrate ${folderToServe}\n`);
        process.exit(1);
      }
      const result = migrateDocsFolder(docsPath);
      if (result.errors.length) {
        console.error(`\nMigration failed:\n${result.errors.map((e) => `  ! ${e}`).join("\n")}\n`);
        process.exit(1);
      }
      console.log(`\nMigrated ${result.changed} document(s) to OKF YAML. Continuing…\n`);
    }

    await startServer({ docsPath, port, openBrowser: options.open ?? false });
  });

program
  .command("migrate [folder]")
  .description("Convert a docs folder's frontmatter to canonical OKF YAML (deterministic, no AI).")
  .option("--dry-run", "Report what would change without writing any file")
  .action((folder: string | undefined, options: { dryRun?: boolean }) => {
    const target = folder ?? "documentation";
    validateRelativeFolder(target);
    const docsPath = path.resolve(process.cwd(), target);
    if (!fs.existsSync(docsPath)) {
      console.error(`\nError: Folder not found: ${docsPath}\n`);
      process.exit(1);
    }
    const r = migrateDocsFolder(docsPath, { dryRun: options.dryRun });
    console.log(`${options.dryRun ? "[dry-run] " : ""}OKF frontmatter migration — ${docsPath}`);
    console.log(
      `  scanned: ${r.scanned}  ${options.dryRun ? "would change" : "changed"}: ${r.changed}  unchanged: ${r.unchanged}  errors: ${r.errors.length}`,
    );
    for (const e of r.errors) console.error(`  ! ${e}`);
    if (r.errors.length) process.exit(1);
  });

program
  .command("validate [folder]")
  .description("Check that a docs folder is a conformant OKF bundle (read-only). Exits 1 on any violation.")
  .action((folder: string | undefined) => {
    const target = folder ?? "documentation";
    validateRelativeFolder(target);
    const docsPath = path.resolve(process.cwd(), target);
    if (!fs.existsSync(docsPath)) {
      console.error(`\nError: Folder not found: ${docsPath}\n`);
      process.exit(1);
    }
    const r = validateOkfBundle(docsPath);
    console.log(`OKF conformance — ${docsPath}`);
    console.log(`  checked: ${r.checked}  errors: ${r.errors}  warnings: ${r.warnings}`);
    for (const v of r.violations) {
      const line = `  ${v.severity === "error" ? "✗" : "⚠"} ${v.file} [${v.rule}] ${v.message}`;
      if (v.severity === "error") console.error(line);
      else console.warn(line);
    }
    if (!r.ok) process.exit(1);
    console.log("  ✓ bundle is OKF-conformant");
  });

program.parseAsync().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nError: ${message}\n`);
  process.exit(1);
});
