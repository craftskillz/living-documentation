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

- [x] **T01** — Audit + mapping figé. `documentation/AI/2026_07_08_19_22_[OKF]_...` (4 preuves, accuracy 1). WORKLOG `..._ticket_01_...`.
- [x] **T02** — Lecteur frontmatter dual. `src/lib/frontmatter.ts` (+ `metadata/status/documentLanguage` migrés), dép `yaml@2.5.1` + lock npm10, `tests/unit/frontmatter.test.ts` (5/5), `npm run test:unit`. WORKLOG `2026_07_09_19_35_[WORKLOG]_ticket_02_...`.
- [x] **T03** — Modèle de concept OKF & dérivation du `type` (ADR convention) : `documentation/ADRS/2026_07_09_19_36_[OKF]_okf_concept_model_...`. Décisions figées : vocabulaire `type` (table déterministe), `tags` liste YAML, `title` toujours émis, `timestamp` ISO 8601 UTC, bloc `sources` list-of-objects (détail T11).
- [ ] **T04** — Écriture YAML via MCP + flip de statut. **PROCHAIN**.

## État git / commits

Arbre **sale** (non commité) : `src/lib/frontmatter.ts`, `metadata.ts`, `status.ts`, `documentLanguage.ts`, `package.json`, `package-lock.json`, `tests/unit/...`, + docs (`documentation/**`, `ROADMAP.md`, ce fichier).
Aucun binding ADR en attente pour l'instant (T03 est forward-looking, sans preuve).
**Demander un commit à l'utilisateur avant de créer l'ADR d'implémentation de T04/T05** (l'ADR liera le writer + la moulinette ; `add_metadata` exige un HEAD propre).

## T04 — cadrage (prochain)
- Faire émettre du **YAML** par : MCP `create_document`/`update_document` (localiser le template frontmatter côté serveur MCP), `setDocumentLanguage` (`documentLanguage.ts`), `workspace.ts` (agent-run), et le flip de statut (bouton Valider).
- Implémenter la **dérivation du `type`** (fonction déterministe, table de T03) + l'ordre de clés canonique.
- Réutiliser `serializeFrontmatter` (T02). Lecture legacy conservée jusqu'à la migration T05.
- Vérifs : un ADR créé via MCP a un frontmatter YAML valide (`type` présent) lisible par le viewer et par un parseur YAML tiers.
