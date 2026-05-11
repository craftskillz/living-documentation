[user]
You are about to record an **ADR (Architecture Decision Record)** for a feature that has just been implemented or modified.

Identify in one sentence what was implemented or changed — that sentence becomes the ADR `description:`.

## Step 1 — Search for an ADR to supersede

1. Call `list_documents`.
2. Shortlist ADRs whose title or category looks topically related to the feature (cheap — just title + category strings).
3. `read_document` on the shortlisted ADRs and inspect their frontmatter (`description`, `tags`).
4. If an existing ADR is **made obsolete** by this feature:
   - `read_document(id)` to load its current Markdown.
   - Modify only the frontmatter: flip `**status:**` to `SuperSeeded` and add a one-line pointer just under the frontmatter (e.g. `> Superseded by: <new ADR title>`). Keep the body intact — supersede is a status flip, not a delete.
   - `update_document(id, content)` with the modified Markdown. Do **not** use `create_document` for this — it does not overwrite and will reject a colliding filename.
5. If no ADR is superseded, proceed.

## Step 2 — Write the new ADR

Mandatory frontmatter at the very top of `content`:

```
---
**date:** 2026-05-11
**status:** To be validated
**description:** One dense, technical sentence — what the decision does, not why.
**tags:** 5–10 specific tags mixing concepts, technologies, and key symbol names
---
```

Rules (re-stated, do not skip):
- `status:` is **always** `To be validated`. The human owner promotes to `Accepted` later — you do not.
- `description:` is one sentence, factual, technical. The "why" goes in the body.
- `tags:` are the primary search signal. Be specific: library names (`stripe`, `amplify`), domain concepts (`workflow`, `moderation`), symbol names where relevant (`useAdScheduler`, `presigned-url`).
- Body sections (suggested): `## Contexte`, `## Décision`, `## Conséquences`.

Call `create_document` with:
- `title` — short, lowercase, becomes the filename slug (e.g. `ajout ressource storage s3`).
- `category` — domain bucket in the filename pattern, **uppercase**, e.g. `SERVICES CLOUD`, `INTEGRATION`, `ALGORITHMES`.
- `folder: "adrs"` (or the project's ADR sub-folder).
- `content` — frontmatter + body.

## Step 3 — Bind the source files

For **each** source file that materially carries the feature's logic, call `add_metadata(<new ADR id>, <relative path>)`.

Determine which source files materially carry this feature's logic (component, hook, service, route, schema, infra config). Exclude god files.

**Do NOT attach god files** — they would produce false-positive drift signals across many ADRs. Excluded by default:
- Lock and manifest files: `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `tsconfig.json`, `requirements.txt`, `Cargo.lock`, `go.sum`.
- Central re-export / barrel files, root routers, root stores, top-level app entry files (unless the ADR is about that file).
- Auto-generated files (build outputs, codegen).

Rule of thumb: if a routine modification of the file would NOT reflect a semantic change of *this* feature, do not attach it.

## Step 4 — Report

Tell the user:
- The id and title of the new ADR (status `To be validated`, awaiting their review).
- Whether any prior ADR was superseded — and which.
- The list of source files attached as metadata.