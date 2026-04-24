---
`🗄️ ADR : 2026_04_22_[SNIPPET]_emojis_picker_with_bilingual_tag_search.md`
**date:** 2026-04-22
**status:** Accepted
**description:** Add an "Emojis" snippet type to the editor's snippet inserter. Presents ~300 common emojis grouped in 6 categories (smileys, gestures, hearts, objects, office, symbols) with a search field that activates at 2+ characters and filters by bilingual FR/EN tags embedded in a static data structure. Users click emojis to append them to a selection input; Insert drops the concatenated string at the cursor. Also prefixes every option in the snippet type dropdown with an inline Unicode icon so the list is scannable at a glance.
**tags:** snippet, emoji, emojis, picker, search, filter, tags, bilingual, i18n, editor, markdown, unicode, dropdown-icons, snippet-type-list, frontend, index.html, snippets.js
---

## Context

The snippet inserter (modal opened from the 🧩 Snippets button in the editor) already supported diagrams, tables, links, code blocks, colored sections, file attachments, etc. Users who wanted to insert an emoji had to either copy-paste from the system emoji picker (OS-dependent, disrupts flow) or type Unicode directly — awkward for a documentation tool where emojis are frequently used for visual cues (✅ ❌ ⚠️ 🚀 🎯).

Two complementary needs emerged:

1. A dedicated snippet to browse and insert emojis without leaving the editor.
2. Searchability — with ~300 candidate emojis, a flat grid is unusable; the user must be able to type "heart" / "coeur" / "rocket" / "fusee" and see only matching emojis.
3. Better scannability of the snippet type dropdown itself — 17 options of plain text are hard to parse; a leading glyph per option speeds recognition.

## Decision

### 1. New `emojis` snippet type

- Added `emojis` to `_SNIPPET_PANELS` and as a new `<option value="emojis">` in the snippet type `<select>`.
- New panel `#snip-panel-emojis` contains:
  - A free-form text input `#snip-emoji-string` holding the current selection (editable, so users can intercalate plain text).
  - A `Clear` button.
  - A search input `#snip-emoji-search` (activates filtering at 2+ characters).
  - A scrollable grid `#snip-emoji-grid` with a `max-h-64 overflow-y-auto` constraint.
- Clicking an emoji button appends it to `#snip-emoji-string` and refreshes the preview.
- `buildSnippetMarkdown()` returns the raw contents of `#snip-emoji-string` for the `emojis` case — no markdown transformation.
- `insertSnippet()` reuses the existing flow: the string replaces the editor selection at `_snippetSelStart`..\_snippetSelEnd`.

### 2. Tag-based search (bilingual, static)

The emoji dataset is a nested array in `snippets.js`:

```js
const _EMOJI_CATEGORIES = [
  { label: 'snippet.emoji_cat_smileys', emojis: [
    { e: '❤️', t: 'heart coeur red rouge love amour' },
    ...
  ]},
  ...
];
```

- Each entry pairs the emoji character (`e`) with a space-separated, lowercase, **bilingual FR+EN** tag string (`t`). No accents (so `coeur` matches a user typing without accents).
- `emojiFilter(query)`:
  - Under 2 characters → re-renders the full categorised view (`_renderEmojiCategories`).
  - 2+ characters → flat filtered view (`_renderEmojiSearch`) via `item.t.includes(q)` over all categories; "No match" message if empty.
- Category labels (`snippet.emoji_cat_*`) are i18n keys so headers switch with the UI language. Tag strings intentionally live inside the data (not i18n) to make bilingual search work regardless of the UI language setting.

### 3. Icons in the snippet type dropdown

`<select>` / `<option>` elements don't render HTML, so Font Awesome `<i>` tags cannot be used. Unicode glyphs were prepended directly to each translation value in `en.json` and `fr.json`:

- ◇ Diagram · ▸ Collapsible · 🔗 Link · 📄 Link to document · ⚓ Link to anchor · 🔢 Numbered · • Bullet · 💻 Code · ❝ Blockquote · ― Horizontal rule · 🖼 Image · ▦ Table · 🌳 Tree · 🎨 Colored section · 🖍 Colored text · 😀 Emojis · 📎 File attachment.

### 4. Bootstrap wiring

- `snippetTypeChanged()` now calls `emojiInit()` when `type === 'emojis'`.
- `emojiInit()` renders the categorised view, wires grid click-delegation and the search input listener once (`_emojiGridWired` guard), and resets the search input.
- On each render, every emoji button carries `data-emoji="<char>"` and a `title` attribute with the first 3 tags (native tooltip).

### 5. i18n

New keys added to both `en.json` and `fr.json`:

- `snippet.emojis` (option label with leading 😀)
- `snippet.emoji_selected_label`, `snippet.emoji_clear_btn`
- `snippet.emoji_cat_{smileys,gestures,hearts,objects,office,symbols}`
- `snippet.emoji_search_placeholder`, `snippet.emoji_no_results`

## Consequences

### PROS

- Users insert emojis without leaving the editor or relying on OS pickers.
- Search covers both languages by design (`coeur` and `heart` both return ❤️), matching the bilingual UI.
- Tag data is static and co-located with the emoji — easy to add a new emoji (one line) and immediately searchable. Trivial to extend with user requests (e.g. 🆕 / ♻️ added for "nouveau"/"existant").
- Icons in the snippet dropdown make the 17-entry list scannable at a glance, reducing reading cost for every snippet insertion.
- Click delegation on the grid + single-attach guard (`_emojiGridWired`) keeps the wiring lean — no memory leak from re-rendering.
- The selection input stays editable, so users can mix text and emojis in a single insert.

### CONS

- Tag authoring is manual: adding a new emoji requires thinking of its FR and EN keywords. No accent-insensitive matching — the data is stored un-accented, so a user typing `cœur` with ligature won't match (accepted compromise; users overwhelmingly type without accents on ASCII-only search inputs).
- The flat search result view loses the category grouping. Acceptable since search is used to locate a specific emoji, not to browse.
- Unicode glyphs in the snippet dropdown depend on the OS font for rendering (e.g. ▦ for Table): on rare platforms, fallback glyphs may look stylistically inconsistent. Font Awesome would have been richer but `<option>` can't render HTML.
- Search filter runs on every keystroke (no debounce). Fine for ~300 items; would warrant rethinking above ~5000.
- Dataset size (~300 entries with tags) adds ~10 KB to `snippets.js` — negligible versus CDN assets already loaded.
