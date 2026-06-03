#!/usr/bin/env node

const { spawn } = require("child_process");

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

// Vite dev server for the unified Svelte frontend.
const svelteApp = run(npmCommand, [
  "exec",
  "--",
  "vite",
  "--config",
  "src/frontend-svelte/vite.config.ts",
]);

// Backend (Express API + MCP) via nodemon. Only the backend is watched;
// the frontend is handled by Vite HMR.
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
  "--ignore",
  "src/frontend-svelte",
  "--ext",
  "ts",
  "--exec",
  execCommand,
]);

svelteApp.once("exit", exitFromChild);
server.once("exit", exitFromChild);
