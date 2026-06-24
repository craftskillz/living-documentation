# List available recipes
default:
    @just --list

dev:
    npm run dev -- ./documentation

build:
    npm run build

start:
    npm run start -- ./documentation

# ── Tests ───────────────────────────────────────────────────────────────────
# Every test recipe builds first (unit tests import dist/, e2e/api spawn the
# built CLI) — so a `just test*` run reproduces the CI conditions exactly.

# Full suite (api + unit + e2e), headless, like CI
test: build
    npx playwright test

# API tests only (HTTP against the spawned CLI), headless
test-api: build
    npx playwright test tests/api

# Pure unit tests (parser, shared shape constants)
test-unit: build
    npx playwright test tests/unit

# UI / e2e tests, headless (no browser window). Pass filters: just test-ui viewer
test-ui *args: build
    npx playwright test tests/e2e {{args}}

# UI / e2e tests, headed — watch the browser drive each test
test-ui-headed *args: build
    npx playwright test tests/e2e --headed {{args}}

# Interactive Playwright UI runner (watch mode, traces, replay)
test-ui-watch:
    npx playwright test --ui

# Record e2e tests to video (one .webm per test under test-results/) and build
# an HTML report. Pass filters: just test-video blueprint
# Runs serially so the recordings are clean and ordered.
test-video *args: build
    RECORD_VIDEO=1 npx playwright test tests/e2e --workers=1 --reporter=html {{args}}

# Open the last HTML report — each test embeds its playable video + trace.
test-video-show:
    npx playwright show-report

# Record then immediately open the report to watch the videos.
test-video-watch *args: (test-video args)
    npx playwright show-report

# Replay a Playwright trace (scrubbable, per-action snapshots).
# Pass the trace path: just test-show-trace test-results/<dir>/trace.zip
test-show-trace trace:
    npx playwright show-trace {{trace}}

# ── Security ────────────────────────────────────────────────────────────────
# Audit GitHub Actions workflows for security issues (supply-chain, injections…)
# Exit codes: 0 = clean, 13 = only suppressed/ignored, 14 = active findings.
audit:
    zizmor .github/workflows/

# Audit + apply all automatic fixes (pins actions to SHA, fixes injections, etc.)
# Requires a GitHub token to resolve action SHAs.
audit-fix:
    zizmor --fix=all --gh-token "$(gh auth token)" .github/workflows/
    @echo "Re-running audit to check remaining findings…"
    zizmor .github/workflows/ || true

# ── Release ─────────────────────────────────────────────────────────────────
# Publish a new version: just publish patch|minor|major
publish level: test
    @case "{{level}}" in patch|minor|major) ;; *) echo "Error: level must be patch, minor or major (got '{{level}}')"; exit 1 ;; esac
    npm version {{level}}
    git push
    git push --tags
