import { spawn, ChildProcess } from 'child_process';
import { createServer } from 'net';
import path from 'path';

export async function pickFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close(() => (port ? resolve(port) : reject(new Error('No free port'))));
    });
  });
}

export interface SpawnOptions {
  cwd: string;
  docsArg: string;
  port: number;
}

// Start the built CLI as a child process; resolve once the server prints its boot banner.
// The child inherits stdout/stderr capture so test failures include server logs.
export async function spawnLD(opts: SpawnOptions): Promise<ChildProcess> {
  const cliPath = path.resolve(__dirname, '../../dist/bin/cli.js');
  const proc = spawn('node', [cliPath, opts.docsArg, '--port', String(opts.port)], {
    cwd: opts.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test' },
  });

  let stderr = '';
  proc.stderr!.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  return new Promise((resolve, reject) => {
    const timeoutMs = 15_000;
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`Server start timeout after ${timeoutMs}ms. stderr: ${stderr}`));
    }, timeoutMs);

    const needle = `Local:   http://localhost:${opts.port}`;
    let stdout = '';
    proc.stdout!.on('data', (chunk) => {
      stdout += chunk.toString();
      if (stdout.includes(needle)) {
        clearTimeout(timer);
        resolve(proc);
      }
    });
    proc.once('exit', (code) => {
      clearTimeout(timer);
      reject(
        new Error(
          `Server exited early with code ${code}.\nstdout: ${stdout}\nstderr: ${stderr}`,
        ),
      );
    });
  });
}

export async function killLD(proc: ChildProcess): Promise<void> {
  if (proc.exitCode !== null) return;
  proc.kill('SIGTERM');
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      resolve();
    }, 3_000);
    proc.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
