---
type: Worklog
title: Ticket 15 - Switch docs, guide, instructions and starters to YAML frontmatter
description: Réalisation du Ticket 15 — bascule de toute la documentation d'amorçage vers YAML (guide serveur MCP, prompts, PROJECT-INSTRUCTIONS, templates, starters migrés + flag OKF) pour qu'un projet neuf naisse conforme, sans référence au format legacy gras.
tags:
  - worklog
  - ticket-15
  - okf
  - yaml-frontmatter
  - starters
  - mcp-guide
  - instructions
timestamp: 2026-07-10T22:51:00Z
status: To Be Validated
---

# Ticket 15 — Docs / guide / instructions / starters en YAML

## Réalisation
- **Starters conformes** : `migrate starter-doc` et `migrate starter-doc-fr` (18+18 concepts en YAML, `index.md`/`log.md` générés, **flag `okfMigration` posé** dans leurs `.living-doc.json`). Les deux valident à **0 erreur**.
- **Guide serveur MCP & prompts** (`src/mcp/server.ts`) : tous les templates/exemples de frontmatter ADR passés en YAML (`get_server_guide`, description `create_document`, exemple travaillé, prompts `create-adr` et `retrodocument-adrs-from-git`), mentions inline `**status:**` → `status:`, détection ADR-style en clés YAML. Note ajoutée : le serveur normalise en OKF YAML canonique à l'écriture (type/title/timestamp dérivés).
- **`src/mcp/tools/git.ts`** : commentaire `**date:**` → `timestamp:`.
- **`src/routes/workspace.ts`** : template de doc d'exécution d'agent émis en YAML.
- **PROJECT-INSTRUCTIONS** (starter EN, starter FR, et le réel `documentation/AI/`) : blocs frontmatter WORKLOG et ADR en YAML.
- **ADR guide serveur MCP** (`2026_05_11_15_40_[MCP]_server_guide...`) : corps révisé (frontmatter YAML), note historique « migré par le chantier OKF ».
- Seul reste volontairement le format gras : le **commentaire** de `src/lib/frontmatter.ts` qui documente le legacy que le parseur doit accepter, et les **documents historiques** (traces WORKLOG, ADR OKF, prompts MCP, runs d'agent) qui *discutent* le format — non réécrits (ne pas falsifier l'historique).

## Vérifications
- `npm run build` OK ; `npm run test:unit` **21/21** ; `lint:ci` exit 0.
- `validate` : starter-doc, starter-doc-fr et documentation → **0 erreur**.
- Aucun `**field:**` gras résiduel dans `src/` (hors commentaire `frontmatter.ts`).
- **Smoke init** : starter scaffoldé → `isOkfMigrated` **true** (garde passante), `validateOkfBundle` **ok, 0 erreur**. → un projet neuf naît conforme, flag posé, aucun blocage.

## Vigilance / suites
- Après commit : rebaseliner les ADR liées aux sources modifiées — `server.ts` (ADR guide serveur MCP), `git.ts` (ADR retrodocument), `workspace.ts` (ADR normalize-on-write T04).
- Suite consistance possible (hors T15) : docs `AI/MCP/*-prompt-*` décrivant les prompts pourraient être réalignées sur les prompts YAML.
- **T14** (visualiseur graphe) reste le seul ticket ouvert — **bonus**.

## Documents liés
- [ADR import bundle (T13)](?doc=ADRS%252F2026_07_10_22_23_%255BOKF%255D_import_an_external_okf_bundle_under_a_dedicated_imported_subfolder)
- [ADR guide serveur MCP (révisé)](?doc=ADRS%252F2026_05_11_15_40_%255BMCP%255D_server_guide_and_feature_workflow_for_the_mcp)
- Backlog : `documentation/WORKLOG/ROADMAP.md`
