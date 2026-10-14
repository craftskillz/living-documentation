---
type: Worklog
title: Ticket 04 - Canonical YAML frontmatter on every write
description: Réalisation du Ticket 04 — normalisation déterministe du frontmatter en YAML canonique à chaque écriture de document, réutilisable par la migration T05.
tags:
  - worklog
  - ticket-04
  - okf
  - yaml
  - normalize
  - type-derivation
  - writers
timestamp: 2026-07-09T20:17:00Z
status: To Be Validated
---

# Ticket 04 — Écriture YAML + dérivation du type

## Contexte
Faire produire du **frontmatter YAML conforme** à tous les chemins d'écriture, en s'appuyant
sur le lecteur dual T02 et la convention T03. Voir `documentation/WORKLOG/ROADMAP.md`.

## Réalisation
- **Cœur** — `src/lib/okf.ts` :
  - `normalizeFrontmatter(content, relPath, { title? })` : transform **déterministe** (aucune IA) legacy/YAML → YAML canonique. `date`→`timestamp` ISO 8601 UTC (minute depuis le nom de fichier), `tags` liste, `type` dérivé si absent, `title` injecté si fourni, clés custom (`sources`) préservées, ordre de clés canonique. **Idempotent**.
  - `deriveType(relPath)` : table T03 (ADR / Worklog / Rule / Technical Doc / Document).
- **Branchement des écrivains** vers `normalizeFrontmatter` :
  - HTTP `src/routes/documents.ts` : POST (création) + PUT (fichier normal et extra).
  - MCP `src/mcp/tools/documents.ts` : `toolCreateDocument` + `toolUpdateDocument`.
  - Agent-run `src/routes/workspace.ts` (nouveau doc de run).
  - Flip de statut client `docStatus.ts` : **déjà** format-agnostique (`status:` / `**status:**`) → inchangé ; la conversion YAML se fait au PUT.
  - Langue `setDocumentLanguage` : inchangée (émet `**language:**`) mais son résultat est sauvé via PUT → normalisé.
- **Tests** — `tests/unit/okf.test.ts` (5) : dérivation type, legacy→YAML, timestamp depuis nom de fichier, idempotence, ordre canonique. **10/10** avec frontmatter. tsc + build OK.

## Choix retenus
- Un **seul transform** (`normalizeFrontmatter`) pour l'écriture (T04) ET la migration (T05).
- **Normalisation à la frontière d'écriture** : tout doc sauvé/créé devient YAML canonique (migration opportuniste), sans dépendre du guide agent (celui-ci est **T15**).
- `title` non inventé par le transform : injecté par l'appelant (nom de fichier / args).

## Vérifications
- 10/10 unit, `tsc` propre, `npm run build` OK.
- Client : `replaceStatus`/`getDocStatus` déjà dual → pas de régression sur le flip.

## À finaliser (dépend d'un commit)
- **ADR d'implémentation T04** (contrat « normalize-on-write ») à créer **après commit du code** (bindings `add_metadata` : `okf.ts`, `routes/documents.ts`, `mcp/tools/documents.ts`, `routes/workspace.ts` → HEAD propre requis).

## Documents liés
- [ADR de convention T03](?doc=ADRS%252F2026_07_09_19_36_%255BOKF%255D_okf_concept_model_and_deterministic_type_derivation_convention)
- [Audit T01](?doc=AI%252F2026_07_08_19_22_%255BOKF%255D_okf_v01_conformance_audit_and_frozen_field_mapping_ticket_01)
- Backlog : `documentation/WORKLOG/ROADMAP.md`
