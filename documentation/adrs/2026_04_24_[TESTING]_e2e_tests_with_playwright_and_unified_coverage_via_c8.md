---
`🗄️ ADR : 2026_04_24_[TESTING]_e2e_tests_with_playwright_and_unified_coverage_via_c8.md`
**date:** 2026-04-24
**status:** Pending Validation
**description:** Adopt Playwright as the sole test runner (E2E + API + unit), spawn a real CLI child process per test for isolation, and consolidate server-side coverage via c8 + NODE_V8_COVERAGE across both the runner and spawned processes. Adds a SIGTERM handler in bin/cli.ts so V8 flushes coverage on graceful shutdown.
**tags:** testing, e2e, playwright, coverage, c8, v8-native-coverage, ci, github-actions, fixtures, sigterm, node-v8-coverage, test-isolation, dependabot
---

## Context

Before this ADR the project had **no automated tests**. Every change was validated by hand through the admin panel, the viewer, and the MCP server — a workflow that scaled poorly as the surface grew (11 REST routes, 13 MCP tools, multiple editing flows, a diagram editor, annotations, metadata drift detection). Three recent changes made the gap more painful:

1. The 2026-04-24 switch to relative paths in `.living-doc.json` touched the CLI, the config library, four routes, the admin panel, and required a silent migration on first read. Validating that by hand across macOS/Linux/Windows-slash scenarios was risky.
2. We added Dependabot (hebdo npm + mensuel GitHub Actions, with minor/patch grouping). Without a CI-enforced test suite, Dependabot PRs would either be merged blind or piled up as "to verify later" — both pathological.
3. Bugs kept slipping in when refactoring shared logic (e.g. the `PUT /api/config` palette validation accepted garbage strings because the allowed-key loop copied raw values before the validation branch, and the validation branch had no `else` to delete). These are the textbook regressions an e2e suite catches in seconds.

We needed:
- **End-to-end coverage** of the real HTTP + MCP surfaces (no mocks, spawn the real server).
- **Unit tests** on pure functions (`parser.ts`, etc.) that don't need a server.
- **Isolation** between tests so that file-system state (`.living-doc.json`, `.metadata.json`, `images/`, `files/`) from one test never bleeds into another.
- **Coverage reporting** that aggregates the code executed in multiple Node processes (the runner running unit tests + many short-lived server spawns running E2E).
- **A CI gate** so Dependabot and human PRs both run the suite automatically.

## Decision

### One runner: Playwright for everything

Playwright is used as the **sole test runner** for unit, API, and UI tests. The alternative — Vitest for units + Playwright for E2E — was considered and rejected:

- Two runners means two coverage mechanisms to merge (Istanbul-style from Vitest vs V8 coverage from Playwright's spawn), which would require `lcov-result-merger` or equivalent.
- Two sets of helpers and conventions to maintain.
- Two CI steps.
- The speed advantage of Vitest on pure unit tests (~5 ms vs Playwright's ~10 ms) is invisible at this scale (7 unit tests out of 115 total).

Unit tests live under `tests/unit/` and use Playwright's `test` + `expect` imports directly, without instantiating a browser or a server. They import the compiled module from `dist/`:

```ts
import { test, expect } from '@playwright/test';
import { parseFilename } from '../../dist/src/lib/parser';
```

The suite tree:

```
tests/
├── unit/               Pure functions (parser.ts for now)
├── api/                REST + MCP routes via Playwright's request context
├── e2e/                UI flows (sidebar, editor, accuracy gauge)
├── helpers/            fixture.ts, server.ts, ld-fixture.ts, mcp.ts, coverage.ts
├── fixtures/           Directory trees (minimal/, with-diagrams/, with-annotations/,
│                       with-metadata/, with-subfolders/, legacy-abs-paths/)
├── tsconfig.json       Extends root config; scopes TS type-checking to tests/**/*.ts
└── playwright.config.ts
```

### Isolation: per-test spawn + tempdir + random port

Every test starts from a clean slate. A Playwright fixture (`test.extend`) does the following on setup:

1. Copy a named fixture directory from `tests/fixtures/<name>/` into a freshly created `os.tmpdir()/ld-test-<random>/`.
2. `fs.realpathSync` on the tempdir to canonicalise macOS `/var/folders/...` vs `/private/var/folders/...` — without this, server-side path comparisons (`isReservedAtDocsRoot`, `safeFilePath`) fail intermittently.
3. Pick a free port with a throwaway `net.createServer().listen(0)`.
4. Spawn `node dist/bin/cli.js ./testdocs --port <port>` as a child process, with `cwd` set to the tempdir parent so the relative-path requirement of the post-7.25 CLI is satisfied.
5. Wait on stdout for the `Local: http://localhost:<port>` boot banner before returning.
6. On test completion (success or failure), SIGTERM the child (then SIGKILL after 3 s grace), and `rm -rf` the tempdir.

This model makes the full suite **trivially parallelisable** — Playwright's default `fullyParallel: true` runs tests in multiple workers without conflicts, because every test owns its own port and temp directory. 115 tests run in ~13 s wall time.

### Fixtures are directory trees, not SQL dumps

Each fixture under `tests/fixtures/<name>/` is a real subtree with `testdocs/.living-doc.json` and whatever additional JSON (`.metadata.json`, `.diagrams.json`, `.annotations.json`) or sibling folders (`src/` for metadata fixtures) the test needs.

For `.metadata.json` entries, the literal string `"__FRESH__"` in the `hash` field triggers on-the-fly SHA-256 re-baselining against the current source file at setup time. This lets `with-metadata` assert `status: unchanged` without committing a hash that would drift the moment the fixture file changes.

Callers opt into a fixture per describe block:

```ts
test.describe('diagrams', () => {
  test.use({ fixtureName: 'with-diagrams' });
  test('list', async ({ request, ld }) => { ... });
});
```

### Coverage: one mechanism, two process types

The project needed coverage from **two distinct Node process families**:

- **The Playwright runner** — where unit tests execute by importing `dist/src/lib/*.js` directly.
- **Spawned CLI child processes** — where routes, MCP tools, the config library, and the server itself execute.

Both are instrumented via V8's native coverage, exposed as a plain environment variable: **`NODE_V8_COVERAGE=<dir>`**. When set, V8 writes one JSON file per process (`coverage-<PID>-<timestamp>.json`) to that directory on graceful exit. c8 then aggregates all JSONs into a unified report.

The `test:coverage` npm script sets the env var at two levels:

```json
"test:coverage": "rm -rf coverage && npm run build && mkdir -p coverage/tmp && COVERAGE=1 NODE_V8_COVERAGE=coverage/tmp playwright test && c8 report"
```

- `NODE_V8_COVERAGE=coverage/tmp` on the playwright command → the runner process (unit tests) writes its coverage JSON there.
- `COVERAGE=1` is a sentinel read by `tests/helpers/coverage.ts`, which injects `NODE_V8_COVERAGE=coverage/tmp` into the `env` of every spawned child (both `spawnLD` for servers and `spawnSync` for CLI tests). Without this flag, normal runs (`npm run test:e2e`) pay zero coverage overhead.

`.c8rc.json` scopes the report to applicative code:

```json
{
  "all": true,
  "include": ["dist/src/**", "dist/bin/**"],
  "exclude": ["dist/src/frontend/**", "**/*.d.ts", "**/*.map", "scripts/**"],
  "reporter": ["text", "html", "lcov"],
  "temp-directory": "coverage/tmp"
}
```

The result is **one unified report** covering both unit tests and E2E, with line-accurate mapping back to the TypeScript source via the `.map` files already emitted by `tsc`.

### SIGTERM handler — the hidden tax without which coverage lies

V8 only writes `NODE_V8_COVERAGE` files **on graceful exit**. SIGTERM with the default handler is *not* graceful — Node exits with code 143 and V8 drops the coverage.

Since our fixture tears down servers with SIGTERM (then SIGKILL fallback), without special handling every server process would contribute zero coverage. Routes that are exhaustively tested would show 3% covered.

Fix in [bin/cli.ts:11](bin/cli.ts#L11):

```ts
process.once("SIGTERM", () => process.exit(0));
```

`process.exit(0)` is a graceful path: it runs pending cleanup handlers, V8 flushes coverage, then the process exits. This bumped `src/routes/config.ts` from 3% → 63% → ultimately 90% once the test suite was filled out. It's also good hygiene unrelated to tests — the server now handles termination cleanly instead of dropping inflight sockets on a deploy signal.

### CI: GitHub Actions on every PR

`.github/workflows/e2e.yml` runs on `pull_request` to `main` and on direct pushes to `main`:

- `actions/setup-node@v4` with npm cache.
- `npm ci` + `npm run build`.
- `actions/cache@v4` for Playwright's `~/.cache/ms-playwright` (browser binaries).
- `npx playwright install --with-deps chromium` (hits the cache on subsequent runs).
- `npx playwright test` — fails the workflow on any test failure.
- `actions/upload-artifact@v4` uploads `playwright-report/` on failure only, for post-mortem.

Dependabot PRs now hit this gate automatically — a minor bump that breaks anything on the request path or the MCP handler will be flagged before merge.

### Bug found and fixed in the process

While writing `tests/api/config-validation.spec.ts`, the test
*"PUT /api/config silently ignores a non-array diagramEdgePalette"* failed because the route was happily persisting the raw string `"not-an-array"` as the palette. Root cause: the handler's allowed-key loop copied raw values into `safe` before the validation branch, and the validation branch only *set* the value on valid input — it didn't *delete* on invalid.

Fixed by adding `else { delete (safe as Record<string, unknown>).diagramNodePalette; }` to both the node and edge palette branches in `src/routes/config.ts`. A concrete example of the value of e2e coverage on existing surfaces: the test was written as an assumption about behaviour, caught a real defect.

## Consequences

### PROS

- **Zero-friction test-writing loop**: one import, one command (`npm run test:e2e`), 13 s to green.
- **Real confidence before merging**: spawn is the real CLI, the real server, the real MCP stack — no mocks, no stubs that drift from production behaviour.
- **Parallel isolation by design**: per-test tempdir + random port mean tests never clash. Running in 2+ workers on CI is safe.
- **Unified coverage** across all test categories (unit, API, E2E, CLI) via one mechanism — no merging LCOV from multiple tools.
- **Dependabot unlocked**: the suite is the gate. Bumps that break request handling are caught.
- **Bug-catching by writing tests**: the palette-persistence defect is exactly the kind of thing that rots silently without coverage.
- **Coverage at 75% overall** after the first focused iteration (bin/cli.ts 100%, src/routes/config.ts 90%, annotations.ts 98%, diagrams.ts 98%, browse.ts 98%) — a usable baseline with concrete hotspots visible in `coverage/index.html`.
- **No new build step for tests**: Playwright handles TS natively, tests share the same `tsconfig` scope via `tests/tsconfig.json`.
- **Docs aligned**: README has a "Tests" section for external contributors, CLAUDE.md has the architecture details and the SIGTERM gotcha for future maintainers.

### CONS

- **Per-test spawn cost**: ~1 s of startup CLI overhead per test (bootstrap + Express listen). At 115 tests the wall time is still ~13 s thanks to parallelism, but a shared-server model would be a few seconds faster. Chose isolation over speed because file-system state is messy to reset between tests.
- **macOS symlink footgun**: `/var/folders/...` vs `/private/var/folders/...` silently broke path comparisons on first run. Fixed with `fs.realpathSync`, but the same class of issue will bite Windows someday if we don't add a canonical-path helper.
- **V8 coverage is line-accurate but branch-coverage is weaker** than Istanbul instrumentation. For our routes this is usually fine (branches usually correspond to separate lines), but some dense ternary-heavy code reports pessimistic branch percentages.
- **Playwright's TS-transform layer masks `dist/` files from V8 coverage** when a spec imports them directly (e.g. `import { parseFilename } from '../../dist/src/lib/parser'`). Tests pass and assertions succeed, but c8 reports 0 executions on non-happy-path branches of the imported module. A standalone Node script requiring the same file tracks coverage correctly at 98%. This stalled `parser.ts` at 72% until we switched to exercising it via the spawned CLI + fixture (filenames crafted to hit each parser branch via `GET /api/documents`), which jumped coverage to **100%**. **Takeaway**: for any `src/lib/*` module, write tests that exercise the module through the route that calls it rather than importing from `dist/` in a spec — the CLAUDE.md "Tests" section documents this pattern. Unit-spec imports are kept only for correctness/readability, not coverage.
- **`@playwright/test` + `c8` + browser install add ~250 MB to `node_modules`** in dev. Published artifact (`dist/`) is unaffected — tests and fixtures are not shipped to npm.
- **Two "modes" of running the suite** (`test:e2e` normal, `test:coverage` with env vars). Mitigated by documenting both in README/CLAUDE.md and making `COVERAGE=1` the only mental overhead. A shared `playwright.config.ts` setup could unify them later if it becomes painful.
- **7 npm vulnerabilities reported at install time** (3 low, 1 moderate, 3 high) via `@playwright/test` transitive deps. None in production deps; they're test-time only. Should still be reviewed as part of routine dependency audits.
