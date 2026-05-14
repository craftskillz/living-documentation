---
**date:** 2026-05-14
**status:** Idle
**description:** Point de reprise partagé entre assistants IA pour suivre la tâche courante, son statut, les fichiers touchés, les vérifications et la prochaine action.
**tags:** worklog, handoff, progression, reprise, agents-ia
---

# Current task

Ce document est le point de reprise entre assistants IA. Tout agent doit le lire avant de continuer une tâche et le mettre à jour avant de rendre la main.

## Statut courant

Idle

## Tâche courante

Aucune tâche d'implémentation applicative n'est en cours.

## Dernière action réalisée

Extension du guard SuperSeeded aux outils MCP (option 3 validée par l'utilisateur — helper partagé dans `lib/status.ts`) :

- [src/lib/status.ts](src/lib/status.ts) : ajout de la classe `DocumentSuperSeededError` (avec `code = "DOCUMENT_SUPERSEEDED"`) et de la fonction `assertNotSuperSeeded(docsPath, decodedDocId)` qui lit la config et throw si statut = SuperSeeded.
- [src/routes/metadata.ts](src/routes/metadata.ts) : `rejectIfSuperSeeded()` réécrit autour de `assertNotSuperSeeded`, map la `DocumentSuperSeededError` en 403. Comportement HTTP inchangé (12/12 tests API verts).
- [src/mcp/tools/metadata.ts](src/mcp/tools/metadata.ts) : `assertNotSuperSeeded` appelé en première ligne de `toolAddMetadata`, `toolRemoveMetadata`, `toolRefreshMetadata`. Le wrapper MCP de `src/mcp/server.ts:1789-1794` convertit déjà les throws en `{ isError: true, content: [{ text: "Error: ..." }] }` — aucune modif nécessaire.
- [tests/api/mcp.spec.ts](tests/api/mcp.spec.ts) : 4 tests nouveaux dans un nouveau describe « metadata MCP tools are read-only on SuperSeeded documents » (list reste ouvert ; add/remove/refresh rejette + état non altéré).
- ADR `2026_05_14_12_29_[METADATA]_read_only_metadata_for_superseeded_documents` mis à jour via MCP `update_document` : section « Contexte » mentionne explicitement la double surface (HTTP + MCP), nouvelles décisions 1 et 3 décrivent la centralisation et le guard MCP, le CONS « pas d'équivalent côté MCP » a été supprimé et remplacé par un PRO sur la défense en profondeur. ADR enrichi de 2 fichiers source supplémentaires (`src/mcp/tools/metadata.ts` + `tests/api/mcp.spec.ts`), accuracy 1 après `refresh_metadata`.

Total tests : 34 verts (12 HTTP metadata + 18 MCP metadata + 4 E2E ; les anciens 8 E2E sont inchangés).

## Prochaine action recommandée

Aucune action automatique. L'utilisateur peut enchaîner sur une autre feature.

## Fichiers ou zones concernés

- `src/lib/status.ts` (helper centralisé + classe d'erreur)
- `src/routes/metadata.ts` (consomme le helper)
- `src/mcp/tools/metadata.ts` (consomme le helper)
- `tests/api/metadata.spec.ts` (tests HTTP inchangés, 4 SuperSeeded)
- `tests/api/mcp.spec.ts` (4 nouveaux tests SuperSeeded)
- `documentation/ADRS/2026_05_14_12_29_[METADATA]_read_only_metadata_for_superseeded_documents.md` (mis à jour pour refléter HTTP + MCP)

## Vérifications récentes

- `npm run build` : OK.
- `npx playwright test tests/api/metadata.spec.ts` : 12/12 verts (pas de régression côté HTTP).
- `npx playwright test tests/api/mcp.spec.ts -g "metadata MCP tools"` : 18/18 verts dont 4 nouveaux pour le guard SuperSeeded.
- `npx playwright test tests/e2e/metadata.spec.ts tests/e2e/validate.spec.ts` : 8/8 verts (régressions UI ok).
- ADR mis à jour via MCP, 6 fichiers source attachés, accuracy 1 après refresh.

## Notes de reprise

Convention rappel : ce worklog n'est pas un ADR. Y consigner uniquement l'état opérationnel.

Pattern réutilisable pour de futures guards de cycle de vie (par exemple `Deprecated`) : ajouter un helper `assertNotXxx` dans `src/lib/status.ts` et appeler les deux callers (routes HTTP + tools MCP). La séparation `lib/status.ts` ↔ `lib/metadata.ts` reste : le statut frontmatter est un concept de cycle de vie, pas un détail de stockage.
