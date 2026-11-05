import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const OPENER_SCRIPT = `#!/bin/sh
case "$1" in
  *fail-open*) exit 1 ;;
esac
printf '%s\\n' "$1" >> "$LD_FAKE_OPENER_LOG"
`;

// Puts fake `open` and `xdg-open` first on the server PATH, so that no test ever
// launches a real application on the developer's machine.
export function installFakeOpener() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ld-fake-opener-'));
  const log = path.join(dir, 'opened.log');
  for (const name of ['open', 'xdg-open']) {
    fs.writeFileSync(path.join(dir, name), OPENER_SCRIPT, { mode: 0o755 });
  }
  return {
    env: { PATH: `${dir}${path.delimiter}${process.env.PATH ?? ''}`, LD_FAKE_OPENER_LOG: log },
    openedFiles: (): string[] => (fs.existsSync(log) ? fs.readFileSync(log, 'utf-8').split('\n').filter(Boolean) : []),
    remove: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}
