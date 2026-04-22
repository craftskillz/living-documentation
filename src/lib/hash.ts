import fs from "fs";
import crypto from "crypto";

export function sha256File(absPath: string): string | null {
  try {
    const buf = fs.readFileSync(absPath);
    return crypto.createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}
