[user]
You are about to **audit the documentation for drift between ADRs and the source code they describe**, and bring every drifting ADR back in sync.

## Step 1 — Inventory drifting ADRs

Call `list_documents_below_accuracy`. It returns up to 10 ADRs whose reliability is below 80%, sorted most-degraded first, plus a `totalBelowThreshold` counter (`SuperSeeded` docs and docs without metadata are excluded automatically).

If the result is empty, tell the user *"All documents are above the 80% reliability threshold — nothing to audit."* and stop.

## Step 2 — Audit each ADR in the batch

For each ADR returned, in order:

1. `get_accuracy(id)` — read the per-entry breakdown (`unchanged` / `modified` / `missing`).
2. `read_document(id)` — load the ADR's current Markdown (frontmatter + body).
3. For every entry whose status is `modified`: `read_source_file(path)` — load the current code.
4. **Compare and decide.** The ADR's `**description:**` field claims a technical fact about the code, and the body (Contexte / Décision / Conséquences) describes how the code behaves. Are they still accurate against the current code, or have they fallen out of sync?

### Outcome A — The ADR is still accurate
The code changes were cosmetic (renames, formatting, refactors that don't affect documented behavior).

→ Call `refresh_metadata(id)` to re-baseline the hashes against the current files.

Tell the user: *"`<title>` — accuracy was X%, but the description still holds. Re-baselined."*

### Outcome B — The ADR is out of sync
The description and/or body no longer match what the code does.

1. Compose the corrected Markdown:
   - Update `**description:**` if its technical sentence is wrong.
   - Update the body sections to reflect the current behavior.
   - Add new entries to `**tags:**` if new concepts/symbols appeared in the code.
   - **Do NOT change `**status:**`** — auditing is not superseding. If you believe the change is structural enough to warrant a brand-new ADR with a different design altogether, stop and tell the user — they will trigger `create-adr` instead.
2. Call `update_document(id, content)` with the **full** corrected Markdown.
3. Call `refresh_metadata(id)` once the doc is updated.

Tell the user: *"`<title>` — description was out of sync. Updated body and re-baselined. Diff summary: <one line>."*

### Outcome C — Source files are missing
`get_accuracy` flags entries as `missing` (the source file no longer exists).

Do **not** auto-remove the metadata entry. The file may have been **renamed** (the user should run `add_metadata` for the new path then `remove_metadata` for the old one) or genuinely **deleted** (`remove_metadata`). Surface the situation to the user and wait for instruction.

## Step 3 — Loop until done

After processing the batch, call `list_documents_below_accuracy` again. If `totalBelowThreshold` > 0 **and** the new batch makes progress (different docs or fewer docs), continue from Step 2.

If the same docs come back unchanged, the remaining drift is intentional or blocked by Outcome C — stop and report.

## Step 4 — Final report

Summarise to the user:
- N ADRs audited.
- N re-baselined as-is (Outcome A — description was correct).
- N rewritten and re-baselined (Outcome B — content corrected). Include the list with one-line diff summaries.
- N flagged for user input (Outcome C — missing source files, or structural change requiring `create-adr`).
- Final `totalBelowThreshold` after the audit.