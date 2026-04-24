---
`🗄️ ADR : 2026_04_23_[EDITOR]_image_paste_name_live_sanitization_lowercase_ascii_only.md`
**date:** 2026-04-23
**status:** Validated
**description:** When the user pastes an image in the markdown editor, sanitize the proposed image filename live as they type — NFD-decompose diacritics so `é → e` / `à → a` / `ç → c`, lowercase everything, and replace any non `[a-z0-9]` character by `_`. The caret position is preserved because the sanitizer is length-preserving, and a final safety pass runs on confirm in case the DOM was bypassed.
**tags:** editor, image-paste, clipboard, filename, sanitization, slug, diacritics, nfd, normalize, ascii, lowercase, input-filter, ux, frontend, images-upload
---

## Context

When a user pastes an image (`Cmd/Ctrl+V` with image data in the clipboard) inside the document editor, a modal asks them to name the file before it is uploaded to `DOCS_FOLDER/images/`. Until now the modal accepted any characters the user typed. Two recurring issues followed:

1. **Accented / non-ASCII characters in filenames** — `café.png`, `résumé_annuel.png`, emojis, spaces, parentheses. These survive to disk and to markdown links. URL encoding, shell copy-paste, and cross-platform sync (macOS NFD vs. Linux NFC) all become awkward. We had already seen at least one case where a user copied the markdown link into a terminal and the accented filename broke a shell command.
2. **Inconsistency with the rest of the asset pipeline** — file attachments (`files/upload`) already produce server-generated slugified names. Diagram PNG saves produce timestamped names. Only the image paste flow let arbitrary text land on disk.

`src/routes/images.ts` already applied a server-side regex `[^a-z0-9_\-]/gi` to the received `name`, so _in theory_ bad characters were already neutralized at upload. But:

- The user had no visual feedback: they typed `café`, hit Enter, and discovered `caf_` later when looking at the URL.
- The server regex was lenient compared to what the user wanted (`A-Z` allowed, `-` allowed).
- The default proposed name was `Date.now().toString()`, so users often replaced it entirely and re-introduced the problem.

The user asked for a **strict input filter, live as they type**, with these exact rules:

- Special characters become `_`.
- Accented letters lose their diacritic (`é → e`, `à → a`, …).
- Everything becomes lowercase.
- Only `[a-z0-9]` are allowed in the final name.

## Decision

### 1. Sanitization function (`src/frontend/image-paste.js`)

A single helper `_sanitizeImageName(s)` performs the four-step pipeline:

```js
const _LD_DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");
function _sanitizeImageName(s) {
  return (s || "")
    .normalize("NFD") // é → e + combining-acute
    .replace(_LD_DIACRITICS_RE, "") // strip every combining mark
    .toLowerCase() // café → cafe
    .replace(/[^a-z0-9]/g, "_"); // everything else → "_"
}
```

The NFD decomposition is the canonical way to strip diacritics without building an ad-hoc `é → e` map. The combining-marks regex is constructed via `new RegExp("[\\u0300-\\u036f]", "g")` rather than a literal `/[̀-ͯ]/` to avoid any ambiguity in the source encoding (combining marks are otherwise invisible when read in an editor).

**Length preservation is intentional.** Every step returns the same number of UTF-16 code units as it consumed (after NFD + strip, a precomposed `é` net-produces one `e` — identity on length ; non-accented bytes pass through ; the regex replacement is 1-char-for-1-char). This means the input caret stays at the correct offset — no remapping logic needed.

### 2. Live input filtering — `_wireImageNameSanitizer()`

One-shot wiring (guarded by `input.dataset.ldSanitizerWired === "1"` to avoid stacking listeners across reopens of the modal). On every `input` event:

- Read current caret position.
- Recompute a sanitized value.
- If it differs, replace `input.value` and restore the caret with `setSelectionRange(pos, pos)`.

Called from `handleEditorPaste` each time the modal opens — idempotent thanks to the dataset guard.

### 3. Confirm-time safety net — `imgPasteConfirm`

Even though the input listener catches every keystroke, a malicious or programmatic DOM mutation could set `input.value` without firing `input`. The confirm handler re-applies the sanitizer:

```js
const raw = document.getElementById("img-paste-name").value.trim();
const name = _sanitizeImageName(raw) || Date.now().toString();
```

If the user somehow pastes only forbidden characters and the result is empty after sanitization, we fall back to the timestamp default — we never send an empty name to `/api/images/upload`.

### 4. Default name

The default proposed name (`Date.now().toString()`) is already numeric and therefore passes the sanitizer untouched. It is nonetheless routed through `_sanitizeImageName` before being set into the input, so future changes to the default (e.g. adding a prefix like `screenshot_`) cannot accidentally break the invariant.

### 5. Backend untouched

`src/routes/images.ts` keeps its broader regex `[^a-z0-9_\-]/gi`. It still protects the filesystem from anything the client might forget to sanitize (e.g. a custom MCP client that calls `/api/images/upload` directly). The front-end contract is strictly stricter than the backend's ; the client pipeline is the stricter one by design — if the user wanted the same strictness server-side we can align it in a follow-up, but it is _out of scope_ for this change.

## Consequences

### PROS

- **Predictable filenames** — every image saved via paste has a name that is safe for URLs, shells, rsync, Confluence/Notion exports, Windows filesystems, and case-insensitive lookups.
- **Live visual feedback** — the user sees the cleaned-up filename as they type. No surprise at upload time.
- **Diacritics are semantic** — `résumé` becomes `resume`, not `r_sum_`. Users who expected `_` for "every weird character" still get that, but accented Latin letters produce a readable ASCII form instead of losing meaning.
- **Zero caret surprises** — because the sanitizer is length-preserving, the input caret does not jump. Typing feels native.
- **Defence in depth** — live filter + confirm-time re-sanitization + backend regex. Any one of them is enough on its own.
- **No extra dependency** — uses the `String.prototype.normalize("NFD")` built-in and a regex literal. Works in every browser Living Documentation already targets.
- **Small, localized change** — all logic lives in one file (`image-paste.js`) and one function. Easy to lift into the file-attachment or diagram-image flows later if we want to unify naming.

### CONS

- **Drops ligatures and non-Latin scripts silently** — `œ` (no NFD decomposition), Arabic, Hebrew, Chinese, Cyrillic letters all collapse to `_`. A user typing a Greek filename sees it turn into underscores. Acceptable given the rule ("only a-z / 0-9"), but worth documenting in case we later want script-aware slugification.
- **Backend regex slightly looser than the client** — `A-Z`, `-` and `_` are accepted server-side but not by the live filter. An API-only client could still upload a name the viewer-produced UI would never generate. Low severity (the server further wraps the basename and controls the path), but there is a small divergence.
- **Emoji and 4-byte characters become multiple underscores** — a rocket `🚀` (2 UTF-16 units) becomes `__`. Visually noisy but still length-preserving.
- **Final name can start/end with `_` or contain long runs `___`** — we did _not_ collapse consecutive underscores or trim edge underscores, on purpose (user spec: "special chars become `_`" — no explicit collapse request). If we later want a more slug-like output we can add `.replace(/_+/g, "_").replace(/^_|_$/g, "")` with a re-think of caret preservation.
- **Render differs from raw markdown** — if a user copy-pastes markdown from an external document with existing image filenames containing `CAPS` or `-`, the old links still work (they are just text in the markdown buffer). The sanitizer only affects _new_ paste flows.
