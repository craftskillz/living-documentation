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
- [x] **T04** — Écriture YAML + dérivation `type`. **CODE + BRANCHEMENT FAITS, prouvé live** (un doc créé via MCP sort en YAML canonique, `type` dérivé). Écrivains branchés : HTTP POST/PUT, MCP create/update, agent-run ; flip statut client déjà dual ; langue via PUT. Tests 10/10, build OK. WORKLOG `2026_07_09_20_17_[WORKLOG]_ticket_04_...`.
  - **RESTE : ADR d'implémentation T04** à créer **après le commit code** → bindings `add_metadata` : `src/lib/okf.ts`, `src/routes/documents.ts`, `src/mcp/tools/documents.ts`, `src/routes/workspace.ts`.
- [ ] **T05** — Moulinette de migration déterministe (réutilise `normalizeFrontmatter`). **PROCHAIN.**

### T04 — cœur livré (testé)
`src/lib/okf.ts` : `normalizeFrontmatter(content, relPath)` = transform déterministe
legacy→YAML canonique (idempotent), `deriveType` (table T03), `date`→`timestamp`
ISO depuis le nom de fichier, `tags` liste, préserve `sources` & clés custom, ordre
canonique. Tests `tests/unit/okf.test.ts` (5) — **10/10** au total avec frontmatter. tsc OK.
> `normalizeFrontmatter` est LE transform partagé T04 (écriture) **et** T05 (migration en masse).

### T04 — branchement restant (TODO)
Router les écrivains vers `normalizeFrontmatter` (ou `serializeFrontmatter`) :
1. `src/routes/documents.ts` — normaliser `content` avant `writeFileSync` dans **PUT** (:375/:391) et le **POST** (création). Le `relPath` = `id` décodé + `.md`.
2. MCP `create_document`/`update_document` — trouver le vrai write (probablement `src/mcp/tools/*` ou `server.ts`) ; normaliser à l'écriture. **Ne pas** confondre avec le *guide* (templates `**gras**` de `server.ts`) qui est **T15**.
3. `src/routes/workspace.ts` (`agentRunMarkdown`, ~:1083/1172) — émettre YAML.
4. `src/lib/documentLanguage.ts` `setDocumentLanguage` — après set, passer par normalize (ou l'écriture documents.ts s'en charge si ça passe par PUT).
5. Client flip statut `src/frontend-svelte/src/lib/home/docStatus.ts` `replaceStatus` — le rendre **format-agnostique** (matcher `status:` ET `**status:**`) ; la conversion YAML se fait à l'enregistrement serveur.
- **Attention viewer** : le strip frontmatter est format-agnostique et les pills lisent en dual (T02) → un doc YAML s'affiche déjà ; T06 polira.
- Titre : `normalizeFrontmatter` n'invente pas de `title` ; l'injecter depuis le nom de fichier au niveau de l'appelant (writer/migration) — à câbler en T04/T05.

## État git / commits
Arbre code **sale** (non commité) : `src/lib/okf.ts`, `tests/unit/okf.test.ts` (T04 cœur) — le reste de T02 est déjà commité.
Docs auto-committées par l'intégration Git (« docs: update living documentation »).
**Demander un commit code à l'utilisateur avant l'ADR d'implémentation T04/T05** (bindings `add_metadata` → HEAD propre).
