---
date: 2026-04-27
status: Pending Validation
description: Pass `dotfiles: 'allow'` to every `res.sendFile()` and `express.static()` call so the npx cache path (~/.npm/_npx/...) no longer trips send v1.x's dotfile guard and 404s every frontend asset.
tags: [PACKAGING, NPX, EXPRESS, SEND, STATIC_ASSETS, DOTFILES, BUGFIX, SERVER]
---

## Context

When the package is run via `npx living-ai-documentation@latest ./starting-doc`, the boot banner appears normally but every frontend route (`/`, `/admin`, `/diagram`) and every static asset (`/i18n/en.json`, JS modules, CSS, etc.) returns a `404 NotFoundError` from `send/index.js`. The exact same code in `npm run dev` mode works perfectly.

Root cause: `send` v1.x (used internally by Express 5's `res.sendFile()` and `express.static()`) defaults `dotfiles` to `'ignore'`, which returns 404 as soon as **any segment of the absolute disk path** starts with a dot. The npx cache lives at `~/.npm/_npx/<hash>/node_modules/living-ai-documentation/dist/src/frontend/...` — the `.npm` segment trips the guard. In `npm run dev` the project lives under a clean path with no dotfile segments, so the bug is invisible.

This affects 100% of npx users on macOS/Linux (the cache is always under `~/.npm/_npx/...`). E2E tests don't catch it because Playwright fixtures live in `os.tmpdir()` (`/var/folders/...` on macOS, `/tmp/...` on Linux) — neither contains a dotfile segment.

The dotfile in our case is in the **OS path prefix we control**, not in a user-facing URL, so allowing it is safe — there is no traversal risk introduced.

## Decision

Pass `{ dotfiles: 'allow' }` to all `res.sendFile()` and `express.static()` calls in `src/server.ts`:

- `app.use(express.static(frontendPath, { dotfiles: 'allow' }))`
- `app.use('/images', express.static(path.join(docsPath, 'images'), { dotfiles: 'allow' }))`
- `app.use('/files', express.static(path.join(docsPath, 'files'), { dotfiles: 'allow' }))`
- `res.sendFile(path.join(frontendPath, 'index.html'), { dotfiles: 'allow' })`
- `res.sendFile(path.join(frontendPath, 'admin.html'), { dotfiles: 'allow' })`
- `res.sendFile(path.join(frontendPath, 'diagram.html'), { dotfiles: 'allow' })`

A short comment on the first occurrence documents the why (npx cache path containing `.npm`) so future readers don't accidentally remove the option.

Verified by patching the npx cache copy of `server.js` and curling each endpoint:

- `/admin` → HTTP 200 (was 404)
- `/` → HTTP 200 (was 404)
- `/i18n/en.json` → HTTP 200 (was 404)
- `/diagram` → HTTP 301 (normal redirect)

A patch release (7.30.1) is required to ship the fix to npx users.

Alternatives considered:

- **Symlink/copy the package out of `~/.npm/`** — non-starter, can't control where npx installs.
- **Switch `sendFile` to `fs.createReadStream` + `res.write`** — bypasses send entirely but loses ETag, Range, MIME negotiation, etc.
- **Pin send to v0.x** — Express 5 mandates send v1.x; pinning would force Express 4.

## Consequences

### PROS

- One-line option per call, minimal blast radius.
- Restores `npx` install path for every user — was effectively broken before.
- No behavioral change in dev mode (dev paths have no dotfile segment, so the option is a no-op there).
- No security regression: the dotfile is in an OS path prefix the operator controls, not in any user-supplied URL — `serve-static`'s URL-level traversal guards (`UP_PATH_REGEXP`) remain active.

### CONS

- Tightly coupled to a quirk of `send` v1.x; if upstream changes the default to `'allow'` the option becomes redundant (harmless, just dead code).
- Existing E2E suite cannot reproduce the bug since Playwright fixtures live in `os.tmpdir()` (no dotfile in path). A regression test would require running the CLI from a directory with a `.something` segment in its absolute path — kept out of scope for this ADR; tracked as future work.
- Anyone reading the code without the comment may wonder why the option is there — mitigated by the inline comment.
