---
`🗄️ ADR : 2026_03_22_[STYLE]_always_dark_syntax_highlighting.md`
**date:** 2026-03-22
**status:** Accepted
**description:** Always use the github-dark highlight.js theme regardless of light/dark mode, removing the light stylesheet entirely.
**tags:** style, syntax-highlighting, dark-mode, highlight.js, frontend, github-dark, prose
---

## Context

The viewer previously loaded two highlight.js stylesheets — `github.min.css` (light) and `github-dark.min.css` (dark) — and toggled between them using the `disabled` attribute when the user switched themes. The light theme rendered code blocks with a white background that blended into the page background, making them hard to distinguish from regular prose.

## Decision

Remove the light stylesheet entirely. Always load `github-dark.min.css` regardless of the current theme (light or dark mode). The `pre` background is hardcoded to `#0d1117` (the github-dark background) via the Tailwind `prose-pre:bg-[#0d1117]` utility.

## Consequences

### PROS

- Code blocks have a consistently dark, high-contrast appearance in both light and dark mode.
- The dark block visually separates code from prose in both modes, improving scanability.
- The JS dark-mode toggle no longer needs to manipulate any stylesheet `disabled` flags, simplifying `applyDarkMode` and `setupDarkToggle`.

### CONS

- This is an intentional UX trade-off: code readability is prioritised over strict theme consistency (light mode has dark code blocks).
