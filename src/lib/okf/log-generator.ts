// Generates the OKF reserved `log.md` changelog from the Git history of the docs
// folder. Autocommit messages are uniform ("docs: update living documentation"),
// so entries are described by the concepts that were *added* at each date, which
// is far more useful than the raw messages. Grouped by date, most recent first.
// Falls back to a minimal log when the folder is not a Git repo.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseFilename } from "../parser";
import { isReservedOkfFile } from "../okf";

// One added-concept entry: date (YYYY-MM-DD) → list of concept titles.
function collectAddedByDate(docsPath: string): Map<string, string[]> {
  const byDate = new Map<string, string[]>();
  let out: string;
  try {
    // `\x01<isoDate>` marks each commit; `--diff-filter=A --name-only` lists the
    // files added by that commit, path relative to the repo root.
    out = execFileSync(
      "git",
      ["-C", docsPath, "log", "--diff-filter=A", "--name-only", "--format=%x01%aI", "--", "."],
      { encoding: "utf-8", maxBuffer: 32 * 1024 * 1024 },
    );
  } catch {
    return byDate; // not a repo / git unavailable
  }

  let date = "";
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith("\x01")) {
      date = line.slice(1, 11); // YYYY-MM-DD from the ISO datetime
      continue;
    }
    if (!line.trim() || !date) continue;
    const base = line.split("/").pop() ?? "";
    if (!base.toLowerCase().endsWith(".md") || isReservedOkfFile(base)) continue;
    const title = parseFilename(base).title;
    const list = byDate.get(date) ?? [];
    if (!list.includes(title)) list.push(title);
    byDate.set(date, list);
  }
  return byDate;
}

/** Write the OKF `log.md` at the bundle root; returns false when nothing to log. */
export function generateOkfLogFile(docsPath: string): boolean {
  const byDate = collectAddedByDate(docsPath);
  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a)); // newest first

  let md = "# Changelog\n";
  if (dates.length === 0) {
    md += "\n_No history available._\n";
  } else {
    for (const date of dates) {
      md += `\n## ${date}\n\n`;
      for (const title of byDate.get(date) ?? []) md += `* **Added**: ${title}\n`;
    }
  }
  fs.writeFileSync(path.join(docsPath, "log.md"), md, "utf-8");
  return dates.length > 0;
}
