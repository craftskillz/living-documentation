---
**date:** 2026-07-08
**status:** To Be Validated
**description:** Réalisation du Ticket 01 — audit de conformance OKF v0.1 et table de mapping figée, sans code.
**tags:** worklog, ticket-01, okf, conformance-audit, mapping
---

# Ticket 01 — Audit de conformance OKF & mapping figé

## Contexte
Premier ticket du chantier d'alignement natif OKF (voir `documentation/WORKLOG/ROADMAP.md`,
et l'[ADR de décision](?doc=ADRS%252F2026_07_08_18_19_%255BOKF%255D_align_livingdocumentation_natively_with_google_open_knowledge_format_okf)).
Objectif : figer, sans écrire de code, la correspondance living-doc ↔ OKF et tracer chaque exigence OKF à une décision.

## Réalisation
- Rédigé le document de référence [Audit de conformance OKF & mapping figé](?doc=AI%252F2026_07_08_19_22_%255BOKF%255D_okf_v01_conformance_audit_and_frozen_field_mapping_ticket_01) dans `documentation/AI/`.
- Checklist des 16 exigences OKF v0.1 → état actuel → gap → ticket cible.
- Table de mapping figée des champs (`type`, `title`, `description`, `tags`, `timestamp`, `resource`, + clés custom `status`, `sources`, `language`).
- Décision de format frontmatter (YAML, exemple avant/après) et règle de dérivation du `type` (proposée, à ratifier en T03).
- Stratégie de liens (`?doc=` ↔ bundle-relatif) et rappel migration déterministe / garde CLI.

## Choix retenus
- Alignement **natif** (living-doc = sur-ensemble d'un bundle OKF conforme), pas un simple pont — cf. l'ADR de décision.
- Deux seuls gaps bloquants identifiés : frontmatter `**gras**` → YAML, et `type` requis. Le reste est additif.
- `status`, `sources`, `language` conservés comme **clés custom** (préservées par OKF).
- Les décisions durables (vocabulaire `type`, schéma `sources`, précision `timestamp`) sont **explicitement renvoyées au Ticket 03** (ADR de convention), pour ne pas les figer prématurément dans un document de référence.

## Vérifications
- Document créé via le MCP Living Documentation ; 4 fichiers-preuve de l'état actuel attachés (`documentLanguage.ts`, `parser.ts`, `documents.ts`, `export.ts`) — `refresh_metadata` : accuracy **1/1**, commit `812d32e`.
- Aucun code modifié (scope T01).

## Suites éventuelles
- T02 (lecteur frontmatter dual) démarre l'implémentation ; T03 ratifiera les décisions de §7 de l'audit en ADR de convention.
- Le document d'audit dérivera volontairement pendant la migration (ses fichiers-preuve vont changer) : c'est un signal attendu de progression, à ne pas confondre avec une dérive à corriger.

## Documents liés
- Backlog : `documentation/WORKLOG/ROADMAP.md`
- [ADR — Align living-documentation natively with OKF](?doc=ADRS%252F2026_07_08_18_19_%255BOKF%255D_align_livingdocumentation_natively_with_google_open_knowledge_format_okf)
- [Audit de conformance OKF & mapping figé (livrable T01)](?doc=AI%252F2026_07_08_19_22_%255BOKF%255D_okf_v01_conformance_audit_and_frozen_field_mapping_ticket_01)
