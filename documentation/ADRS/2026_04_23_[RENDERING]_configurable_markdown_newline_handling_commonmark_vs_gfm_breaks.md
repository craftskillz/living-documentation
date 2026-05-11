---
`🗄️ ADR : 2026_04_23_[RENDERING]_configurable_markdown_newline_handling_commonmark_vs_gfm_breaks.md`
**date:** 2026-04-23
**status:** Pending Validation
**description:** Expose `markdownSoftBreaks` as an Admin option (default `false`) that toggles marked's `breaks` flag server-side — when off, the CommonMark rule applies (single newline = space, two-space-then-newline or `<br/>` force a break) ; when on, every single newline is rendered as a real `<br>`. The flag is read on every request, so no restart is needed, and it is honoured in both the live viewer and the HTML/Notion/Confluence export paths so rendered output stays consistent.
**tags:** rendering, markdown, marked, breaks, soft-breaks, hard-breaks, commonmark, gfm, configuration, admin, documents, export, html, notion, confluence, i18n
---

## Context

The documentation viewer renders `.md` files through the `marked` library in two places:

- `src/routes/documents.ts` — `GET /api/documents/:id`, two branches (extra files and documents inside `docsPath`).
- `src/routes/export.ts` — `POST /api/export/html` (Notion + Confluence ZIP modes).

`marked` was called with no options, so it used CommonMark defaults. Under those defaults, a single `\n` between two text lines is rendered as a single space: the lines merge into one paragraph. To force a `<br>` without leaving a blank line, authors must either end the previous line with **two spaces** followed by a newline, or use an explicit `<br/>` tag.

This is correct CommonMark behaviour, but it confuses authors who type markdown in a "chat" style, where every Enter press is expected to produce a visible line break — as it does in GitHub comments, Discord, Slack, and most issue trackers.

The user wanted both behaviours to be available per project, not a hardcoded choice. They also wanted the Admin UI to explain the two modes clearly so anyone opening the option understands what changes, including the "two spaces + newline" escape hatch of the default mode.

## Decision

### 1. New config flag

Added `markdownSoftBreaks: boolean` to `LivingDocConfig` (`src/lib/config.ts`), default `false` (CommonMark). Whitelisted in the `PUT /api/config` safelist (`src/routes/config.ts`). No extra validation needed — it is a plain boolean, and the type system already rejects non-booleans via `as Partial<LivingDocConfig>`.

### 2. Wire-up to marked — per-request, not global

Two design choices:

- **Read the flag on every request** via `readConfig(docsPath)` inside the handlers, rather than caching it in memory at server startup. This costs one disk read per document load but means toggling the flag in Admin takes effect immediately, without a server restart. Given the local-only nature of the tool, the I/O cost is irrelevant.
- **Pass options per call** via `marked.parse(src, { breaks: !!markdownSoftBreaks })`, not via `marked.setOptions(...)`. This avoids any shared mutable state between concurrent requests and matches marked v12's recommended API.

All three `marked.parse(...)` call sites were updated to receive a `markedOpts = { breaks: !!markdownSoftBreaks }` object computed once at the top of each handler:

- `src/routes/documents.ts:255` — extra-files branch, wrapped in `decorateFileLinks(...)`.
- `src/routes/documents.ts:289` — standard document branch.
- `src/routes/export.ts:237` — HTML export body.

The `/api/export/markdown` route was not changed — it serialises raw `.md` files, so it never calls `marked`.

### 3. Admin UI

A checkbox "Treat every newline as a line break" in the *Appearance & Metadata* card of `src/frontend/admin.html`, placed just below the *Code block max height* field. Bound to `#field-soft-breaks`. Loaded in `loadConfig()` via `cfg.markdownSoftBreaks`, written in `saveConfig()` inside the existing PUT payload.

The hint underneath is deliberately verbose and uses `data-i18n-html` because it has to mix `<strong>`, `<code>`, and `<br/>`:

- **Unchecked (CommonMark, default):** single newline → space, two lines merge. To force a break without a blank line, end the previous line with `two spaces` + newline, or use `<br/>`.
- **Checked (GitHub-flavoured):** every single newline becomes a real line break. Convenient for chat-style writing, but hard-wrapping long paragraphs in the source will show visible breaks in the rendered view.

This dual-mode explanation in-context is important because most authors do not know about the "two spaces" trick and would otherwise toggle the flag without understanding the trade-off.

### 4. i18n

Four new keys in both `en.json` and `fr.json`:

- `admin.appearance.soft_breaks_label` — short checkbox label.
- `admin.appearance.soft_breaks_hint` — the bilingual explanation above, with inline HTML.

## Consequences

### PROS

- **Both mental models supported** — authors who respect CommonMark (hard-wrap source, rely on blank lines / `<br/>`) keep the current behaviour ; authors used to chat-style markdown get their line breaks without typing two invisible spaces.
- **Per-project, not per-user** — the flag lives in `.living-doc.json`, so everyone browsing the same documentation sees the same rendering. No divergence between a contributor writing and a reader loading the same doc.
- **No restart required** — per-request read means the admin can flip the switch and reload a doc to see the effect instantly.
- **Viewer and export stay in sync** — the same flag drives `GET /api/documents/:id` and `POST /api/export/html`, so a doc exported to Notion/Confluence looks exactly like the in-app rendering.
- **Minimal invasive change** — three call-site updates in two files, plus a typed config field. No custom marked plugin, no renderer override, no frontend rendering logic touched.
- **In-context education** — the Admin hint explicitly teaches the "two spaces" escape hatch, so the default mode becomes practically usable rather than just technically correct.

### CONS

- **Repeated `readConfig` reads** — every document load reads `.living-doc.json` from disk. Acceptable for a local tool, but if this was ever deployed as a multi-tenant service, we would want to cache the config with invalidation on write.
- **`breaks: true` loses source hard-wrap freedom** — once enabled, authors cannot break long paragraphs across multiple lines in the source file without the breaks appearing in the rendered output. A pre-existing doc that was hard-wrapped to 80 columns will look visually different after the flag is flipped. No migration tool is provided.
- **Markdown export unaffected** — `/api/export/markdown` copies `.md` files verbatim, so a doc written in soft-breaks mode, when opened in a strict CommonMark viewer elsewhere, will revert to the merged-line rendering. This is intentional (the source is the source) but worth documenting.
- **Uses the legacy `marked.parse(src, opts)` option-passing form** — marked v12 still supports it, but the library is moving towards per-instance renderers (`new Marked(options)`). If we adopt that pattern later, all call sites will need another pass.
- **Potential conflict with future plugins** — a custom renderer or extension added later would need to be aware of the `breaks` flag ; marked merges options correctly, but anyone writing a token transformer should check both modes.
