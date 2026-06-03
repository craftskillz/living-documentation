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

# ── Release ─────────────────────────────────────────────────────────────────
# Publish a new version: just publish patch|minor|major
publish level:
    @case "{{level}}" in patch|minor|major) ;; *) echo "Error: level must be patch, minor or major (got '{{level}}')"; exit 1 ;; esac
    npm version {{level}}
    git push
    git push --tags
