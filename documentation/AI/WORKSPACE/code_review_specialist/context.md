---
type: Technical Doc
title: Context
---

Reviewed build_context MCP tool feature (src/lib/git.ts: gitStatusPorcelain/gitDiff; src/mcp/tools/context.ts; src/mcp/server.ts registration; tests/api/mcp.spec.ts + new mcp-build-context.spec.ts).
Verdict: Commit after minor fixes.
Key findings given: (1) maxDiffChars has no upper clamp (unlike maxFiles/maxFileBytes) - risk of huge payloads. (2) rename/copy parsing in gitStatusPorcelain untested. (3) source.files[].truncated field always false/dead code. (4) gitDiff called once per changed file (N subprocess spawns) instead of batched. (5) server.ts is a growing "god file" causing unrelated ADR drift (observation only, dogfooding signal from build_context's own output).
No further action needed unless new diff appears in next run.