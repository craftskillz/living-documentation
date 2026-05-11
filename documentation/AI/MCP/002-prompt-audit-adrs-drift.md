[user]
You are about to **audit ADR drift against the source code each ADR describes**, and bring every drifting ADR back to a clear state.

## Step 1 — Inventory drifting ADRs

Call `list_adrs_below_accuracy`. It returns up to 10 ADRs whose reliability is below 80%, sorted most-degraded first, plus a `totalBelowThreshold` counter. Non-ADR documents, `SuperSeeded` ADRs, and ADRs without metadata are excluded automatically.

If the result is empty, tell the user *"All ADRs are above the 80% reliability threshold — nothing to audit."* and stop.

## Step 2 — Audit each ADR in the batch

For each ADR returned, in order:

1. Call `review_adr_relevance(id)` — this validates the ADR and returns the ADR content, metadata accuracy, and `sourceFilesToReread`.
2. If `state` is `no_metadata`, `metadata_current`, or `already_superseeded`, report the state and move to the next ADR.
3. For every `sourceFilesToReread` entry whose status is `modified`: call `read_source_file(path)`.
4. For every entry whose status is `missing`: do **not** refresh. Tell the user the file is missing and ask whether it was renamed or deleted.
5. **Compare and decide.** The ADR's `document.description` and body describe a technical decision. Are they still accurate against the current source files, or have they fallen out of sync?

### Outcome A — The ADR is still accurate
The code changes were cosmetic (renames, formatting, refactors that don't affect documented behavior).

→ Call `refresh_metadata(id)` to re-baseline the hashes against the current files.

Tell the user: *"`<title>` — accuracy was X%, but the description still holds. Re-baselined."*

### Outcome B — The ADR contradicts the code
The description and/or body no longer match what the code does.

1. Tell the user exactly what no longer matches.
2. Ask whether they want to supersede the ADR.
3. Wait for the user's answer.

If the user accepts:
- Call `read_document(id)` if you need the current Markdown again.
- Call `update_document(id, content)` with the full Markdown, changing the frontmatter status to exactly `SuperSeeded` and adding a short supersession note under the frontmatter.
- Tell the user the ADR has been superseded.

If the user refuses:
- Tell the user that they must perform the verification themselves and call `refresh_metadata(id)` only when they are satisfied the ADR is aligned with the code.

### Outcome C — Source files are missing
`review_adr_relevance` flags entries as `missing` (the source file no longer exists).

Do **not** auto-remove the metadata entry. The file may have been **renamed** (the user should run `add_metadata` for the new path then `remove_metadata` for the old one) or genuinely **deleted** (`remove_metadata`). Surface the situation to the user and wait for instruction.

## Step 3 — Loop until done

After processing the batch, call `list_adrs_below_accuracy` again. If `totalBelowThreshold` > 0 **and** the new batch makes progress (different docs or fewer docs), continue from Step 2.

If the same docs come back unchanged, the remaining drift is intentional or blocked by Outcome C — stop and report.

## Step 4 — Final report

Summarise to the user:
- N ADRs audited.
- N re-baselined as-is (Outcome A — description was correct).
- N superseded after user confirmation (Outcome B).
- N flagged for user input (Outcome C — missing source files, refused supersession, or structural change requiring `create-adr`).
- Final `totalBelowThreshold` after the audit.