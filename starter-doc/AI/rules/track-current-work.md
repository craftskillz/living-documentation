---
id: track-current-work
title: Track the current task in WORKLOG
severity: required
description: AI assistants must read and maintain the current-task worklog to enable reliable handoff between agents.
tags: ["worklog", "handoff", "ai-agents", "progress", "documentation"]
appliesTo: ["**/*"]
---

Before resuming or modifying the project, read `DOCS_FOLDER/WORKLOG/current-task.md` if the file exists.

When a task is started, interrupted, finished, or left with known follow-ups, update `DOCS_FOLDER/WORKLOG/current-task.md` with:

- the current status;
- the task in progress;
- the files or areas concerned;
- the verifications performed;
- the remaining verifications;
- the next recommended action.

For an MVP ticket that has actually started, create or update a dedicated document under `DOCS_FOLDER/WORKLOG/` if the tracking no longer fits clearly in `current-task.md`.

The worklog does not replace ADRs: it describes operational progress and resume points, not durable decisions.
