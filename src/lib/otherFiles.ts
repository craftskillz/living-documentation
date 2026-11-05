// The non-Markdown files the explorer lists: which ones a request may reach, and
// which ones may be handed to the application the OS associates with them.
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { isListedDir, isOtherFileName } from "./explorerEntries";

const ANY_EXECUTE_BIT = 0o111;

const EXECUTABLE_EXTS = new Set([
  // macOS
  ".app", ".pkg", ".mpkg", ".dmg", ".command", ".tool", ".terminal", ".workflow", ".action", ".osx",
  ".scpt", ".scptd", ".applescript", ".webloc", ".inetloc", ".fileloc", ".dylib",
  // Windows
  ".exe", ".msi", ".msix", ".msp", ".bat", ".cmd", ".com", ".scr", ".pif", ".cpl", ".dll", ".hta",
  ".ps1", ".vbs", ".vbe", ".wsf", ".wsh", ".reg", ".lnk", ".url", ".gadget",
  // Linux and cross-platform
  ".sh", ".run", ".bin", ".appimage", ".deb", ".rpm", ".desktop", ".so", ".jar", ".apk",
]);

/**
 * The real path of a file the explorer lists under `docsPath`, or null. Symlinks
 * are followed before the check, so one cannot lead outside the docs folder.
 */
export function resolveOtherFile(docsPath: string, relPath: string): string | null {
  if (!relPath) return null;
  let root: string;
  let abs: string;
  try {
    root = fs.realpathSync(docsPath);
    abs = fs.realpathSync(path.resolve(docsPath, relPath));
    if (!fs.statSync(abs).isFile()) return null;
  } catch {
    return null;
  }
  const rel = path.relative(root, abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  const segments = rel.split(path.sep);
  const name = segments.pop() as string;
  return segments.every(isListedDir) && isOtherFileName(name) ? abs : null;
}

/** Windows ignores trailing dots and spaces: `a.exe.` still runs as `a.exe`. */
export function isExecutableFile(abs: string): boolean {
  const name = path.basename(abs).replace(/[. ]+$/, "");
  if (EXECUTABLE_EXTS.has(path.extname(name).toLowerCase())) return true;
  return process.platform !== "win32" && (fs.statSync(abs).mode & ANY_EXECUTE_BIT) !== 0;
}

function osOpenCommand(abs: string): [string, string[]] {
  if (process.platform === "darwin") return ["open", [abs]];
  // `start` is a cmd.exe builtin and would need a shell.
  if (process.platform === "win32") return ["rundll32", ["url.dll,FileProtocolHandler", abs]];
  return ["xdg-open", [abs]];
}

/** Opens an absolute path with its associated application, without any shell. */
export function openWithOs(abs: string): Promise<void> {
  const [command, args] = osOpenCommand(abs);
  return new Promise((resolve, reject) => {
    execFile(command, args, (error) => (error ? reject(error) : resolve()));
  });
}
