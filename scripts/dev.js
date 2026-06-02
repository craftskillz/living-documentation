#!/usr/bin/env node

const { spawn, spawnSync } = require("child_process");

const workspaceTsconfig = "src/frontend/workspace/tsconfig.json";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const childProcesses = new Set();

function run(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    ...options,
  });
  childProcesses.add(child);
  child.once("exit", () => childProcesses.delete(child));
  return child;
}

function quoteShellArg(value) {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function stopAll(signal = "SIGTERM") {
  for (const child of childProcesses) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

function exitFromChild(code, signal) {
  stopAll(signal || "SIGTERM");
  process.exit(code ?? (signal ? 1 : 0));
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopAll(signal);
    process.exit(signal === "SIGINT" ? 130 : 143);
  });
}

const initialCompileWorkspace = spawnSync(
  npmCommand,
  ["exec", "--", "tsc", "-p", workspaceTsconfig],
  { stdio: "inherit" },
);

if (initialCompileWorkspace.status !== 0) {
  process.exit(initialCompileWorkspace.status || 1);
}

const workspaceWatcher = run(npmCommand, [
  "exec",
  "--",
  "tsc",
  "-p",
  workspaceTsconfig,
  "--watch",
  "--preserveWatchOutput",
]);

const blueprintWatcher = run(npmCommand, [
  "exec",
  "--",
  "vite",
  "--config",
  "src/frontend/blueprint/vite.config.ts",
]);

const cliArgs = process.argv.slice(2).map(quoteShellArg).join(" ");
const execCommand = ["ts-node", "bin/cli.ts", cliArgs].filter(Boolean).join(" ");
const server = run(npmCommand, [
  "exec",
  "--",
  "nodemon",
  "--watch",
  "src",
  "--watch",
  "bin",
  "--ext",
  "ts,html",
  "--exec",
  execCommand,
]);

workspaceWatcher.once("exit", exitFromChild);
blueprintWatcher.once("exit", exitFromChild);
server.once("exit", exitFromChild);
