# PROJECT-USEFUL-COMMANDS - Template

This file describes the commands that are actually useful for working on the project. It must help an AI choose the right verification without guessing.

It must stay up to date. A wrong command is more costly than a missing command.

## Maintenance Rule

The AI must propose an update to this file when a task:

- adds, removes, or renames a development script;
- changes the package manager;
- changes the build, test, lint, or formatting command;
- introduces a required setup step;
- reveals that a documented command no longer works.

Before adding a command, verify that it really exists in `package.json`, a Makefile, a script, or the project documentation.

## Package Manager

State the expected package manager and the related rule.

```text
npm | pnpm | yarn | bun | other
```

If the project mandates a package manager, create or update a rule in `AI/rules/`.

## Installation

| Command | When to use it | Notes |
|---|---|---|
| `npm install` | After clone or dependency changes | Adapt to the real package manager. |

## Local Development

| Command | Effect | Notes |
|---|---|---|
| `npm run dev` | Starts the local server | Specify port and prerequisites. |

## Quality

| Command | Effect | When to run it |
|---|---|---|
| `npm run build` | Compiles or bundles the project | After typed code, build config, or copied asset changes. |
| `npm test` | Runs tests | After behavior changes. |
| `npm run lint` | Runs lint | If the project has linting. |
| `npm run format` | Formats code | If the project has formatting. |

## Focused Tests

Document commands that verify a limited scope without running the whole suite.

| Command | Scope |
|---|---|
| `npm test -- <pattern>` | Adapt to the real runner. |

## Initial Setup

List required steps after a clone or initialization.

```bash
# Example to replace
cp .env.example .env
npm install
```

## Dangerous Or Costly Commands

List commands that change the environment, delete data, deploy, or cost money.

| Command | Risk | Rule |
|---|---|---|
| `npm run deploy` | Real deployment | Ask for explicit validation before running. |

## Notes For AI

- Run the smallest useful verification before finishing.
- If a command fails, report the exact command, the symptom, and the most likely hypothesis.
- Do not invent scripts: if a command is missing, say so and propose adding it.
