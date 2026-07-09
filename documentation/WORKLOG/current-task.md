---
**date:** 2026-07-08
**status:** In progress
**description:** Point de reprise du chantier d'alignement natif OKF — ticket courant et prochaines actions.
**tags:** worklog, okf, current-task, migration, yaml-frontmatter
---

# Current task — Chantier OKF (alignement natif)

> Le contenu précédent de ce fichier (tâche « documentation utilisateur », 30/06) est
> conservé dans l'historique git. Ce fichier suit désormais le chantier OKF.

## Statut courant

Chantier **Alignement natif OKF** en cours. Backlog : `documentation/WORKLOG/ROADMAP.md`.
Décision cadre : ADR `2026_07_08_18_19_[OKF]_align_livingdocumentation_natively_...` (Accepted).
Autonomie accordée : avancer sur tous les tickets sans demander, sauf besoin réel
(commit avant bindings ADR, vraie décision produit, MCP/serveur down).

## Progression

- [x] **T01** — Audit de conformance & mapping figé. Livrable : `documentation/AI/2026_07_08_19_22_[OKF]_okf_v01_conformance_audit_...`. Trace WORKLOG : `2026_07_08_19_23_[WORKLOG]_ticket_01_...`. 4 fichiers-preuve liés (accuracy 1).
- [ ] **T02** — Lecteur frontmatter dual (YAML + legacy). **EN COURS**.

## T02 — état

Surface réelle repérée (lecteurs dual partiels déjà présents, à centraliser) :
- `src/lib/metadata.ts` → `getFrontmatterField` (lit déjà YAML `key: value` **et** `**key:** value`).
- `src/lib/status.ts` → `parseDocStatus` (regex `**status:**|status:`).
- `src/lib/documentLanguage.ts` → `LANGUAGE_LINE_RE` (tolère les deux).
- Écritures legacy (hors scope lecture) : `src/routes/workspace.ts` (agent-run), MCP `create_document`, `src/routes/context.ts` (règles, déjà YAML-ish).

Décisions T02 :
- Ajout de la dépendance **`yaml`** (pas de parser YAML maison sur 106 docs). Lock régénéré via `just lock` (npm 10.8.2 ; npm 11 casse `npm ci`).
- Nouveau module `src/lib/frontmatter.ts` : `parseFrontmatter(content) → { data, body, format, raw }`, détection legacy vs YAML, parse listes ; + `getField` et `serializeFrontmatter` (ce dernier servira T04).
- Migrer `status.ts`, `metadata.ts:getFrontmatterField`, `documentLanguage.ts` (lecture) vers `frontmatter.ts`.

## Prochaine action

Écrire `src/lib/frontmatter.ts`, router les 3 lecteurs dessus, ajouter les tests, typecheck+build, puis trace WORKLOG T02 + cocher la ROADMAP. Ensuite **T03** (ADR de convention — ratifie §7 de l'audit).
