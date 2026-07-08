---
**date:** 2026-07-08
**status:** To be validated
**description:** An optional "tau" visual skin, selected by a `siteTheme` config field orthogonal to light/dark, is applied as a `data-site-theme` attribute from a localStorage cache before mount and synced via the config observer; it overrides the `:root` design tokens plus a scoped graph-paper grid and Spectral serif on the document reading area, using three self-hosted SIL OFL fonts fetched by a reproducible script.
**tags:** siteTheme, tau, data-site-theme, siteTheme.ts, fetch-tau-fonts, self-hosted-fonts, SIL-OFL, notebook-grid, Spectral, Space-Grotesk, light-only, THIRD-PARTY-NOTICES
---

## Context

The base look is a clean SaaS UI (Inter, gray canvas, blue accent). Users wanted
an alternative "notebook / graph-paper" skin inspired by the MIT-licensed
`huggingface/tau` website. The whole app already themes through a small set of
`:root` CSS custom properties, which makes an alternative token set a clean,
low-risk reskin — but the document reading surface is Tailwind-based, so it needs
targeted overrides.

## Decision

### A `siteTheme` field, orthogonal to light/dark
`StoredConfig.siteTheme: "base" | "tau"` (default `base`) is independent of the
existing `theme` (light/dark/system). It is applied as a `data-site-theme`
attribute on `<html>` (same pattern as `data-blueprint`).

### Cached-boot application, no request, no flash
`siteTheme.ts` applies the skin **synchronously from a `localStorage` cache**
(`ld-site-theme`) before the app mounts — mirroring the dark-mode (`ld-dark`)
pattern — so tau never flashes the base theme and no extra `/api/config` request
is added. Config remains the source of truth: `syncSiteThemeFromConfig` is wired
to the shared config observer (see the
[Favorites ADR](?doc=ADRS%252F2026_07_08_10_32_%255BFRONTEND%255D_favorites_menu_pinned_documents_in_livingdocjson_with_drag_priority_and_autoopen))
so it re-syncs from the `/api/config` GET each page already makes. tau is
**light-only for now**: selecting it removes the `dark` class and hides Home's
dark toggle.

### Scoped CSS reskin
A `[data-site-theme="tau"]` block in `styles/app.css` overrides the `:root`
palette tokens and the chrome font (Space Grotesk). The **notebook graph-paper
grid** and **Spectral serif** are scoped to the document reading area
(`#home-content-area` and its `.prose`), with the grid painted via layered
`linear-gradient` backgrounds using `background-attachment: local` so it scrolls
with the content; `!important` is required there to beat the `background`
shorthand that the light code-block theme sets on the same element.

### Self-hosted fonts (offline, license-clean)
Because the tool runs locally/offline, the three fonts (Spectral, Space Grotesk,
JetBrains Mono — all **SIL Open Font License**) are self-hosted rather than
CDN-loaded. `scripts/fetch-tau-fonts.mjs` reproducibly downloads only the
`latin` + `latin-ext` woff2 subsets (latin-ext covers French accents) into
`public/fonts/tau/` and emits the matching `@font-face` CSS. `@font-face` rules
are declared globally but the files only download when tau is actually rendered.
Attribution is recorded in `THIRD-PARTY-NOTICES.md` (tau MIT © Alejandro AO + the
three OFL fonts).

### Admin
An Admin "Site theme" selector (with FR/EN i18n) switches `siteTheme` and applies
it live via `applySiteTheme`.

## Consequences

- tau is a token-driven skin: the hand-written chrome inherits it for free;
  Tailwind-styled surfaces (Home shell, doc prose) get explicit scoped overrides.
- Light-only for now; a dark tau palette can be added later without touching the
  selection mechanism.
- Bundling ~10 small woff2 subsets (~166 KB) is the cost of offline fidelity.

## Related

- Shared config observer + boot-cache pattern:
  [Favorites ADR](?doc=ADRS%252F2026_07_08_10_32_%255BFRONTEND%255D_favorites_menu_pinned_documents_in_livingdocjson_with_drag_priority_and_autoopen).
- Portable config field storage:
  [portable living-doc.json](?doc=ADRS%252F2026_04_24_%255BCONFIGURATION%255D_portable_living_doc_json_with_relative_paths).
