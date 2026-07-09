// Standalone runner for the deterministic OKF frontmatter migration.
// The logic lives in src/lib/migrate.ts (shared with the CLI `migrate` command).
//
//   npx ts-node scripts/migrate-frontmatter-to-okf.ts [docsPath] [--dry-run]
import fs from "node:fs";
import path from "node:path";
import { migrateDocsFolder, OKF_VERSION } from "../src/lib/migrate";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const docsPath = path.resolve(args.find((a) => !a.startsWith("--")) ?? "documentation");

if (!fs.existsSync(docsPath)) {
  console.error(`Docs folder not found: ${docsPath}`);
  process.exit(1);
}

const r = migrateDocsFolder(docsPath, { dryRun });
console.log(`${dryRun ? "[dry-run] " : ""}OKF frontmatter migration — ${docsPath}`);
console.log(`  scanned:   ${r.scanned}`);
console.log(`  ${dryRun ? "would change" : "changed"}: ${r.changed}`);
console.log(`  unchanged: ${r.unchanged}`);
console.log(`  errors:    ${r.errors.length}`);
if (r.changed && r.changed <= 40) for (const p of r.changedList) console.log(`    ~ ${p}`);
for (const e of r.errors) console.error(`  ! ${e}`);
if (!dryRun && r.errors.length === 0) {
  console.log(`  flag:      okfMigration.version = ${OKF_VERSION} written to .living-doc.json`);
}
if (r.errors.length) process.exit(1);
