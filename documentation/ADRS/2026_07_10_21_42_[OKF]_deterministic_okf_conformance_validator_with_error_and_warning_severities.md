---
type: ADR
title: Deterministic OKF conformance validator with error and warning severities
description: A read-only, deterministic validator checks that a docs folder is a conformant OKF bundle (YAML frontmatter, known non-empty type, title, ISO timestamp, well-formed sources, reserved files), distinguishing errors from warnings so undated concepts don't fail CI, exposed as a CLI validate command and wired into the e2e CI gate.
tags:
  - okf
  - validator
  - conformance
  - ci
  - cli
  - ticket-12
  - severity
timestamp: 2026-07-10T21:42:00Z
status: To be validated
sources:
  - path: src/lib/okf/validate.ts
    hash: d24a26f58104a8b259731a19b9fd2fa62616ac18e7025655578d6a5a6b34fd4a
    commit: d04f130c5462e5b9578065ba45cd1c1d9bb81d85
    dirty: false
  - path: bin/cli.ts
    hash: 2c16bc01c76103483817a163093dec56ad092f4d59ca565c14bdacda8f36886c
    commit: d04f130c5462e5b9578065ba45cd1c1d9bb81d85
    dirty: false
---

# OKF conformance validator + CI gate

Ticket 12. Depends on the migration (T05), index (T09) and log (T10) work.

## Decision
`src/lib/okf/validate.ts` `validateOkfBundle(docsPath)` is a pure read-only
check (no AI, no writes). Per non-reserved concept it verifies: **YAML**
frontmatter (not legacy/none), a non-empty `type` within the closed vocabulary
(ADR / Worklog / Rule / Technical Doc / Document / Concept), a non-empty
`title`, an ISO-8601 `timestamp` when present, and a well-formed `sources` block
(list of `{path, hash}`). At bundle level it checks the reserved files: a root
`index.md` carrying `okf_version`, and `log.md`.

Each violation carries a **severity**: `ok` is true iff there are no
`error`-severity violations. A **missing** `timestamp` is a *warning* (undated
concepts such as rules or project docs are legitimate); an **unrecognized** (but
present, non-empty) `type` is a *warning* too — the OKF `type` vocabulary is
extensible, so imported bundles may carry their own (refined in T13). A
**malformed** `timestamp`, legacy frontmatter, an **empty** `type`, missing
`title`, malformed `sources` or a missing reserved file are *errors*.

Exposed as the CLI `validate [folder]` command (exit 1 on any error), the
`okf:validate` npm script (ts-node, no build needed) and the `okf-validate`
just recipe. Wired into `e2e.yml` (push/PR to main) as the "OKF bundle
conformance" step.

## Rationale
The bundle must stay OKF-conformant as the project evolves; a machine check in
CI is the enforcement point. The error/warning split keeps the gate strict on
what breaks OKF while tolerating optional metadata, so the migrated repo is
green today without silencing real regressions.

## Consequences
- CI turns red if a document regresses conformance (e.g. a hand-written legacy
  `**bold**` frontmatter or an unknown `type`).
- The validator shares `parseFrontmatter` and `isReservedOkfFile`, so its rules
  track the same definitions the write path and migration use.
- Undated concepts surface as warnings — a future T04 refinement could derive
  `timestamp` from the filename when no `date` field exists.
