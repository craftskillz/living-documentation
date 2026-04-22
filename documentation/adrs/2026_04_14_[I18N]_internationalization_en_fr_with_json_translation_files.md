---
`🗄️ ADR : 2026_04_14_[I18N]_internationalization_en_fr_with_json_translation_files.md`
**date:** 2026-04-14
**status:** Pending Validation
**description:** Add full internationalization support to all three pages (index.html, admin.html, diagram.html) via a shared i18n.js loader, two JSON translation files (en.json, fr.json), and four data attributes (data-i18n, data-i18n-title, data-i18n-placeholder, data-i18n-html). Language is persisted in config as "en" | "fr" and selected from the Admin panel. Updated 2026-04-22: dynamically rendered content must await initI18n before its first render to avoid raw keys being displayed (diagram sidebar bootstrap fix).
**tags:** i18n, internationalization, language, translation, en, fr, json, data-i18n, i18n.js, config, admin, frontend, index, diagram, window.t, applyI18n, initI18n, bootstrap, loadDiagramList, dynamic-rendering
---

## Context

All user-visible strings in the three frontend pages (index.html, admin.html, diagram.html) were hardcoded in English directly in the HTML and JavaScript. As the application grew, adding a second language became necessary without requiring a build step or a JS framework.

The constraints were:
- No build step — all three pages use Tailwind and highlight.js via CDN; adding a bundler was not acceptable.
- The solution must work uniformly across all three pages with a single shared mechanism.
- Language preference must be persisted server-side (in `.living-doc.json`) so all pages load in the correct language on the first render, without a flash of untranslated content.

## Decision

### i18n.js — shared loader

A plain IIFE script `src/frontend/i18n.js` exposes three globals:

- **`window.t(key)`** — returns the translation for `key`, or the key itself as fallback (so untranslated keys degrade gracefully).
- **`window.initI18n(lang)`** — fetches `/i18n/<lang>.json` and populates the internal dictionary. Called once at page load, after `/api/config` resolves the configured language.
- **`window.applyI18n()`** — walks the DOM and applies translations using four data attributes (see below). Called after `initI18n` resolves.

The script is a regular `<script>` (not an ES module) so it loads identically in all three pages without import coordination.

### Translation files

Two JSON files under `src/frontend/i18n/`:
- `en.json` — English (default)
- `fr.json` — French

Each file is a flat key→string map. Keys are namespaced by domain, e.g. `nav.diagram`, `admin.config.title`, `diagram.toolbar.save`. Served statically by Express at `/i18n/*.json`.

### Data attributes

| Attribute | Sets | Use case |
|---|---|---|
| `data-i18n` | `el.textContent` | Labels, button text, headings |
| `data-i18n-title` | `el.title` | Tooltip titles |
| `data-i18n-placeholder` | `el.placeholder` | Input/textarea placeholders |
| `data-i18n-html` | `el.innerHTML` | Strings containing HTML markup |

HTML elements keep their original English text as a pre-`applyI18n` fallback, so the page is readable even if the JSON fetch fails.

### Config field

`language: "en" | "fr"` added to `LivingDocConfig` with default `"en"`. Validated server-side in `PUT /api/config` — only `"en"` and `"fr"` are accepted, any other value is silently dropped.

### Admin panel selector

A `<select id="field-language">` in the Admin panel lets users switch language. The change is saved via `PUT /api/config` and takes effect on next page load.

### Page integration pattern

Each page follows the same boot sequence:

```js
const cfg = await fetch('/api/config').then(r => r.json());
await window.initI18n(cfg.language || 'en');
window.applyI18n();
```

With a fallback to `'en'` if the config fetch fails.

### Update 2026-04-22 — dynamic renderers must await initI18n

`applyI18n()` handles static DOM nodes, but JS-rendered content calls `window.t()` inline. If that render runs **before** `initI18n()` resolves, the dictionary is still empty and `t(key)` returns the raw key (e.g. `diagram.sidebar.empty` shown literally in the diagram sidebar).

Rule: any dynamic renderer that depends on `window.t()` for its first paint must be invoked from the same IIFE that awaits `initI18n()`, **after** `applyI18n()`. In `diagram.html`, `loadDiagramList()` was moved out of `diagram/main.js` (where it ran at module-load time, racing `initI18n`) into the inline bootstrap IIFE, after `window.applyI18n()`.

Pattern for future pages:

```js
(async () => {
  const cfg = await fetch('/api/config').then(r => r.json());
  await window.initI18n(cfg.language || 'en');
  window.applyI18n();
  // Dynamic renderers that call window.t() go here:
  loadDiagramList();
})();
```

## Consequences

### PROS

- Zero build step — translation files are plain JSON fetched at runtime.
- Single shared mechanism across all pages — one `i18n.js`, same four attributes everywhere.
- Graceful degradation — missing keys display the key itself; a failed JSON fetch leaves the English fallback text intact.
- Language is server-persisted — no flash of wrong language across page navigations.
- Adding a new language requires only a new JSON file and an extra `<option>` in the admin selector.

### CONS

- `applyI18n()` runs after the DOM is painted — there is a brief moment where the English fallback text is visible before translations are applied (no true SSR).
- Dynamically rendered HTML (e.g. sidebar items built by JS) must call `window.t()` inline at render time; `applyI18n()` only applies to elements present in the DOM at call time.
- Dynamic renderers must be invoked after `initI18n()` resolves, otherwise `t(key)` returns the raw key — race condition fixed on 2026-04-22 for the diagram sidebar.
- All strings added to the codebase must be manually added to both JSON files — there is no compile-time check for missing keys.
