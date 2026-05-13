#!/usr/bin/env bash
#
# check-workflows.sh — audit GitHub Actions workflows with zizmor before
# they land in a commit. Catches script injection (interpolation of
# ${{ github.event.* }} into a `run:`), unpinned tags on third-party
# actions, overly broad permissions, and other Actions-specific footguns.
#
# Usage:
#   ./scripts/check-workflows.sh                  # pre-commit: only audit staged workflow files
#   ./scripts/check-workflows.sh --all            # audit the whole .github/ tree
#
# Exit codes:
#   0 — no workflow files staged, OR zizmor reports no findings, OR zizmor
#       is not installed (we degrade gracefully; the GH Action runs anyway)
#   1 — zizmor found at least one violation
#
set -euo pipefail

mode="${1:-staged}"

if ! command -v zizmor >/dev/null 2>&1; then
  cat >&2 <<'EOF'
  ⓘ zizmor not installed — skipping local workflow audit.

    Install with one of:
      brew install zizmor
      cargo install zizmor
      pipx install zizmor

    The GitHub Actions workflow .github/workflows/zizmor.yml will still
    audit your changes in CI, so this is a soft warning, not a block.

EOF
  exit 0
fi

if [ "$mode" = "--all" ]; then
  zizmor .github/
  exit $?
fi

# Pre-commit mode: only audit workflow / composite-action files that are staged.
# A staged delete shows up in --name-only with the path; we exclude those
# with --diff-filter=ACMR so we don't try to audit a file that no longer exists.
# (Avoids `mapfile` / `readarray` so we stay compatible with the macOS bash 3.2
#  that still ships as /bin/bash.)
staged=$(git diff --cached --name-only --diff-filter=ACMR \
            -- '.github/workflows/*.yml' '.github/workflows/*.yaml' \
               '.github/actions/**/*.yml' '.github/actions/**/*.yaml')

if [ -z "$staged" ]; then
  exit 0
fi

# Word-split on newlines for the zizmor invocation. Workflow filenames can't
# contain spaces by GitHub's own rules, so this is safe.
echo "$staged" | xargs zizmor
