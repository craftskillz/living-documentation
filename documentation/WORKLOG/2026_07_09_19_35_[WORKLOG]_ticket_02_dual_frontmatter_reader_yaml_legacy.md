---
**date:** 2026-07-09
**status:** To Be Validated
**description:** Réalisation du Ticket 02 — module frontmatter.ts unifié (lit YAML et legacy **gras**), centralisation des lecteurs, ajout de la dépendance yaml et tests unitaires.
**tags:** worklog, ticket-02, okf, frontmatter, yaml, dual-reader
---

# Ticket 02 — Lecteur frontmatter dual (YAML + legacy)

## Contexte
Premier ticket **code** du chantier OKF (`documentation/WORKLOG/ROADMAP.md`). Fonde toute
la migration : un lecteur qui comprend l'ancien format `**clé:** valeur` **et** le YAML OKF,
sans rien casser. S'appuie sur le mapping figé en T01.

## Réalisation
- Nouveau module `src/lib/frontmatter.ts` :
  - `parseFrontmatter(content) → { data, body, format, raw }` — détecte le legacy (`**clé:**`) **avant** de tenter YAML (sinon le parseur YAML mal-lit les `**`), fallback lenient si YAML invalide ;
  - `getField` / `getFirstField` (lecture case-insensitive, listes jointes) ;
  - `serializeFrontmatter` (émission YAML — servira T04).
- Centralisation des lecteurs dispersés sur ce module :
  - `src/lib/metadata.ts` `getFrontmatterField` → délègue à `getField` ;
  - `src/lib/status.ts` `parseDocStatus` → `getField(content, "status")` ;
  - `src/lib/documentLanguage.ts` `getDocumentLanguage` → `getFirstField(["language","lang","locale","langue"])`.
  - Les **écrivains** (setDocumentLanguage, workspace agent-run, MCP create_document) restent inchangés (T04).
- Dépendance **`yaml@2.5.1`** ajoutée (`package.json`) ; lockfile régénéré via `just lock` (npm 10.8.2).
- Tests : `tests/unit/frontmatter.test.ts` (`node:test`, zéro dép) + script `npm run test:unit`.

## Choix retenus
- **Pas de parseur YAML maison** : la lib `yaml` gère correctement l'échappement (descriptions avec `:`, `#`, quotes) — hand-rolling sur 106 docs était trop risqué.
- **Détection legacy en premier** : un bloc `**gras**` n'est jamais passé au parseur YAML.
- `frontmatter.ts` devient le **contrat unique** de lecture/écriture du frontmatter ; la convention de modèle sera formalisée en **T03** (ADR).
- Lecture seule pour T02 ; l'écriture YAML bascule en T04.

## Vérifications
- `npm run test:unit` → **5/5** (legacy, YAML+liste+`:` quoté, case-insensitive, round-trip caractères spéciaux, none).
- `tsc --noEmit` propre ; `npm run build` OK (serveur + front).
- Comportement préservé : mêmes champs lus, dans les deux formats (parité couverte par les tests).

## Suites éventuelles
- Le doc d'audit T01 est lié à `documentLanguage.ts` (entre autres) que T02 a modifié → dérive **attendue** (signal de progression), à ne pas rebaseliner.
- T03 : ADR de convention (vocabulaire `type`, schéma `sources`, forme `tags`, précision `timestamp`).
- T04 : écriture YAML via `serializeFrontmatter` + flip de statut.

## Documents liés
- Backlog : `documentation/WORKLOG/ROADMAP.md`
- [Audit T01](?doc=AI%252F2026_07_08_19_22_%255BOKF%255D_okf_v01_conformance_audit_and_frozen_field_mapping_ticket_01)
- [ADR de décision OKF](?doc=ADRS%252F2026_07_08_18_19_%255BOKF%255D_align_livingdocumentation_natively_with_google_open_knowledge_format_okf)
