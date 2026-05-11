[user]
You are about to **review the relevance of one specific ADR against the source files bound in its metadata**.

The user wants to review ADR id: `2026_04_11_12_55_[General]_premiers_pas`.

## Goal

Decide whether the ADR still accurately describes the current source code.

This is a semantic judgement. The MCP tool prepares the factual report, but you must read the ADR and the changed source files before deciding.

## Step 1 — Prepare the ADR review packet

Call `review_adr_relevance({ "id": "2026_04_11_12_55_[General]_premiers_pas" })`.

If the tool rejects the document as non-ADR, tell the user that this workflow only applies to ADRs and stop.

Interpret the returned `state`:

- `no_metadata`: the ADR has no source metadata, so there is no hash-based review to perform. Tell the user to attach source files with `add_metadata` first.
- `metadata_current`: the accuracy is already 100 %. Tell the user no hash refresh is needed. Only continue with a semantic review if the user explicitly asks.
- `already_superseeded`: the ADR is already superseded. Tell the user and do not refresh it as an active decision unless they explicitly ask.
- `needs_llm_review`: continue below.

## Step 2 — Read source files

For every item in `metadata.sourceFilesToReread`:

- if `status === "modified"`, call `read_source_file(path)`;
- if `status === "missing"`, do not invent a replacement path. Tell the user the file is missing and ask whether it was renamed or deleted. Do not refresh metadata in this case.

## Step 3 — Compare

Compare:

- the ADR `document.description`;
- the body of `document.content`;
- the current contents of the modified source files.

Decide whether the ADR still describes the code.

## Outcome A — ADR still matches the code

If the ADR description and body still match the source files:

1. Call `refresh_metadata(id)`.
2. Tell the user that the ADR remains relevant and that the metadata hashes were refreshed back to 100 %.
3. Mention the files that were reviewed.

## Outcome B — ADR contradicts the code

If the ADR description or body contradicts the source files:

1. Tell the user exactly what no longer matches.
2. Ask the user whether they want to supersede the ADR.
3. Wait for the user's answer.

If the user accepts:

1. Call `read_document(id)` if you need the current Markdown again.
2. Call `update_document(id, content)` with the full Markdown, changing the frontmatter status to exactly `SuperSeeded` and adding a short supersession note under the frontmatter.
3. Tell the user the ADR has been superseded.

If the user refuses:

Tell the user that they must perform the verification themselves and call `refresh_metadata(id)` only when they are satisfied the ADR is aligned with the code.

## Important constraints

- Never call `refresh_metadata` before you have compared the ADR to the source files.
- Never supersede without explicit user confirmation.
- Do not rewrite the ADR into a new accepted state in this workflow. Supersession is a status flip plus a note; a replacement decision should be recorded separately with `create-adr`.