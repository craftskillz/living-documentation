#!/usr/bin/env bash
#
# check-readme-sync.sh — verify that README.md and README.fr.md are touched
# together. They are bilingual mirrors, so any change to one must be paired
# with a change to the other (or you've broken the contract).
#
# Usage:
#   ./scripts/check-readme-sync.sh                  # pre-commit: compare the index against HEAD
#   ./scripts/check-readme-sync.sh origin/main      # CI: compare HEAD against a base ref
#   ./scripts/check-readme-sync.sh HEAD~1           # local: against the previous commit
#
# Exit codes:
#   0 — both touched together, or neither touched
#   1 — only one of the two was touched (violation)
#
set -euo pipefail

against="${1:---cached}"

# `--name-only -- <path>` filters the diff to a single file. The grep -c
# normalises the output: 1 if the file is in the diff, 0 otherwise.
en_changed=$(git diff "$against" --name-only -- README.md    | grep -c '^README\.md$'    || true)
fr_changed=$(git diff "$against" --name-only -- README.fr.md | grep -c '^README\.fr\.md$' || true)

if [ "$en_changed" -gt 0 ] && [ "$fr_changed" -eq 0 ]; then
  cat >&2 <<'EOF'

  ✗ README.md was modified but README.fr.md was not.

    The two READMEs are bilingual mirrors. Update README.fr.md to reflect
    the same change (or revert the README.md edit), then stage both.

    Bypass with: git commit --no-verify   (only if you're 100% sure)

EOF
  exit 1
fi

if [ "$fr_changed" -gt 0 ] && [ "$en_changed" -eq 0 ]; then
  cat >&2 <<'EOF'

  ✗ README.fr.md was modified but README.md was not.

    The two READMEs are bilingual mirrors. Update README.md to reflect
    the same change (or revert the README.fr.md edit), then stage both.

    Bypass with: git commit --no-verify   (only if you're 100% sure)

EOF
  exit 1
fi

exit 0
