# ADR 003 — Always-Dark Syntax Highlighting

**Date:** 2026-03-22
**Status:** Accepted

## Context

The viewer previously loaded two highlight.js stylesheets — `github.min.css` (light) and `github-dark.min.css` (dark) — and toggled between them using the `disabled` attribute when the user switched themes. The light theme rendered code blocks with a white background that blended into the page background, making them hard to distinguish from regular prose.

## Decision

Remove the light stylesheet entirely. Always load `github-dark.min.css` regardless of the current theme (light or dark mode). The `pre` background is hardcoded to `#0d1117` (the github-dark background) via the Tailwind `prose-pre:bg-[#0d1117]` utility.

## Consequences

Code blocks have a consistently dark, high-contrast appearance in both light and dark mode. This is an intentional UX trade-off: code readability is prioritised over strict theme consistency. The dark block visually separates code from prose in both modes, which improves scanability.

The JS dark-mode toggle no longer needs to manipulate any stylesheet `disabled` flags, simplifying the `applyDarkMode` and `setupDarkToggle` functions.
