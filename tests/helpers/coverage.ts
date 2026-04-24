import fs from 'fs';
import path from 'path';

// When COVERAGE=1, each spawned Node process writes its V8 coverage JSON into coverage/tmp/
// via the NODE_V8_COVERAGE env var (a Node.js native feature). c8 then aggregates all JSONs.
// Using the env var directly avoids wrapping spawns with `c8 node ...` (shorter stack traces,
// same end result).
export function coverageEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env = { ...process.env, ...extra };
  if (process.env.COVERAGE === '1') {
    const dir = path.resolve(process.cwd(), 'coverage/tmp');
    fs.mkdirSync(dir, { recursive: true });
    env.NODE_V8_COVERAGE = dir;
  }
  return env;
}
