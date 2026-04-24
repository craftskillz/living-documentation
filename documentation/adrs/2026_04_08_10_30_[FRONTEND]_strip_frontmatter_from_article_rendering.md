---
`🗄️ ADR : 2026_04_08_10_30_[FRONTEND]_strip_frontmatter_from_article_rendering.md`
**date:** 2026-04-08
**status:** Accepted
**description:** Strip the leading frontmatter block (---...---) from markdown content before rendering to HTML, so metadata fields are not visible in the article view.
**tags:** frontend, frontmatter, rendering, marked, documents, metadata, adr
---

## Context

ADRs (and potentially any markdown file) may contain a frontmatter block delimited by `---` at the top of the file, holding metadata fields such as `description`, `tags`, `date`, and `status`. These fields are intended for tooling (context loading, supersession detection) and not for human reading in the article view.

When `marked.parse(content)` was called directly on the raw file content, the frontmatter block was rendered as visible markdown — producing a horizontal rule, bold key/value lines, and another horizontal rule at the top of every article, cluttering the reading experience.

## Decision

Add a `stripFrontmatter(content: string): string` helper in `src/routes/documents.ts` that removes the leading `---…---` block before passing content to `marked.parse()`:

```ts
function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return content;
  return content.slice(end + 4).replace(/^\n/, "");
}
```

The function is applied only to the `html` field returned by the API. The raw `content` field is left untouched, so the edit textarea still shows the full frontmatter and the file on disk is never modified.

## Consequences

### PROS

- Frontmatter metadata is invisible in the rendered article view — no visual clutter.
- Edit mode still shows the full raw content including frontmatter, so it remains editable.
- The fix is applied in one place (`documents.ts`) and covers both regular docs and extra files.
- Files without frontmatter are unaffected (`startsWith("---")` guard).

### CONS

- Frontmatter is a convention — any file starting with `---` followed by a closing `---` will have that block stripped, even if it was intentional content. This is an acceptable trade-off for a local documentation tool.
