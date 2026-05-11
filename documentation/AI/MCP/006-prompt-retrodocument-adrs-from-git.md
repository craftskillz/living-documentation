[user]
You are about to **retrodocument missing ADRs by walking recent git history**, oldest commit first, so that each durable architectural decision the project actually made gets a corresponding ADR.

This workflow exists when a project has accumulated significant code without ADRs (or with sparse ones) and the user wants to backfill that record.

## Goal

For each git commit, decide whether it carries a **durable architectural decision** worth a new ADR — and, if so, write that ADR dated from the commit, attach the right source files, and supersede any earlier ADR that the commit obsoleted.

## Step 1 — Prepare the retrodocumentation packet

Call `retrodocument_adrs_from_git({ "limit": 100 })`.

The tool returns commits ordered **oldest first** with a precomputed `state` per commit:
- `candidate` — has non-deleted, non-god source files under `sourceRoot`. Worth inspecting.
- `trivial`   — no source-bearing files (docs-only, formatting, config-only). Skip unless the subject clearly announces a decision.
- `merge`     — multi-parent merge. Skip unless the merge subject announces a documented decision the constituent commits did not.

If `totalCommits === 0`, tell the user there is no history to retrodocument and stop.

## Step 2 — Read the existing ADR inventory

Call `list_documents`, shortlist ADRs (folder `adrs`, category `ADR`, or `[ADR]` in the id), and `read_document` the frontmatter (`description`, `tags`) of any whose topic could overlap the upcoming commits. You will need this to detect supersession candidates without re-listing for each commit.

## Step 3 — Walk commits oldest → newest

For **each** commit returned by the tool, in order:

1. **Filter cheaply**:
   - `state === "trivial"` and subject does not announce a decision → skip.
   - `state === "merge"` and the merge subject is generic ("Merge branch …") → skip.
   - Otherwise continue.

2. **Read the evidence**: for each `filesChanged` entry where `underSourceRoot === true`, `godFileSuspect === false`, `existsNow === true`, and `changeType !== "D"`, call `read_source_file(path)`. Cap at ~5 files per commit — if there are more, pick the ones whose names suggest the feature core (component, service, route, schema, infra entry point) and skip the rest.

3. **Judge — does this commit carry a durable architectural decision?** It does when the change:
   - moves an architectural boundary, or
   - introduces / modifies a public contract, or
   - changes a storage format, a protocol, a workflow, or
   - adds a convention later changes will respect, or
   - resolves a non-obvious trade-off the code alone does not explain.

   It does **not** when the change is a trivial fix, a rename, a formatting pass, a doc tweak, a dependency bump without behaviour change, or a test-only addition.

4. **Decide the outcome.**

### Outcome A — Create a new ADR (no supersession)

The commit carries a fresh decision that no prior ADR covers.

1. Compose the body, sections suggested: `## Contexte`, `## Décision`, `## Conséquences`. Write the description from the **commit subject + body**, never invented context. If the commit message is empty or unintelligible, downgrade to Outcome C and skip.
2. Mandatory frontmatter — **date comes from the commit**, not today:

```
---
**date:** <commit committerDate, YYYY-MM-DD slice>
**status:** To be validated
**description:** One dense, technical sentence — what the decision does, not why.
**tags:** 5–10 specific tags mixing concepts, technologies, and key symbol names
---
```

3. Call `create_document` with:
   - `title` — short, lowercase slug derived from the commit subject.
   - `category` — uppercase domain bucket (e.g. `SERVICES CLOUD`, `INTEGRATION`).
   - `folder: "adrs"` (or the project's ADR sub-folder).
   - `date` — the commit `committerDate` (the optional `date` argument exists precisely for this retrodocumentation case; **do not omit it here**).
   - `content` — frontmatter + body.
4. For every `filesChanged` entry that has `underSourceRoot === true`, `godFileSuspect === false`, and `existsNow === true`, call `add_metadata(<new ADR id>, <path>)`. Skip files where `existsNow === false` — those were since deleted and cannot be hashed; mention them in the body instead.
5. Call `refresh_metadata(<new ADR id>)` to baseline.

### Outcome B — Supersede an earlier ADR, then create a new one

The commit modifies a decision recorded by an earlier ADR (either pre-existing or created in a previous iteration of this same loop).

1. Identify the obsoleted ADR from the inventory built in Step 2 (or from ADRs you just created earlier in the walk).
2. `read_document(<old id>)` to load its current Markdown.
3. `update_document(<old id>, <content>)` flipping `**status:**` to exactly `SuperSeeded` and adding a one-line pointer just under the frontmatter (e.g. `> Superseded by: <new ADR title> (commit <shortSha>)`). Keep the body intact.
4. Then proceed with Outcome A to create the replacement ADR. In the new ADR's body, explicitly reference the superseded ADR title and explain why it no longer applies.

### Outcome C — Skip

The commit is not durable enough (refactor, rename, fix, formatting, test, doc tweak) or its message is too thin to reliably describe.

Move on without writing anything. Log the skipped sha in your final report.

## Step 4 — Stay in sync as you walk

After each Outcome A or B, **update your in-memory inventory** of ADRs to include the one you just created. Later commits in the walk must be able to detect "this commit obsoletes the ADR I created three commits ago".

## Step 5 — Pace yourself

After the first 3 ADRs created (combined Outcomes A + B), pause and report progress to the user with: the ADRs created, the ADRs superseded, the next commit you are about to process. Wait for the user to confirm `continue` before resuming. This protects against runaway retrodocumentation when the LLM and the user disagree on what is "durable".

Subsequent batches of 5 may proceed without pause unless the user asks for a stop.

## Step 6 — Final report

Once the walk is done, summarise:
- N commits processed.
- N ADRs created (list title + commit shortSha + date).
- N ADRs superseded (list title + new ADR that replaced it).
- N commits skipped as not durable (count only).
- N commits where source files were already deleted — list shortSha so the user can audit manually.

## Important constraints

- **Date comes from the commit, never from `now()`.** Pass the `date` argument to `create_document` and put the same date in the frontmatter.
- **Never invent context.** If the commit subject + body + diff are insufficient to write a one-sentence `description:`, skip the commit (Outcome C). A bad ADR is worse than a missing one.
- **Never attach god files.** `godFileSuspect === true` from the tool is a hard skip for metadata. Same for files where `existsNow === false` (they cannot be hashed).
- **Never supersede silently.** Always include the explicit pointer (`> Superseded by: …`) under the frontmatter of the old ADR, and reference the old ADR by title from the new one's body.
- **Order matters.** Process strictly oldest → newest so the supersession chain reads forward in time.
- **Do not flip status to `Accepted`.** Every retrodocumented ADR ships at `To be validated` — only the human owner promotes.