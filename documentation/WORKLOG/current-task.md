---
type: Worklog
title: Current task
description: Point de reprise du chantier d'alignement natif OKF — ticket courant et prochaines actions.
tags:
  - worklog
  - okf
  - current-task
  - migration
  - yaml-frontmatter
timestamp: 2026-07-08T00:00:00Z
status: In progress
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
  - ✅ ADR d'implémentation `2026_07_09_20_37_[OKF]_normalizeonwrite_...` créé + 4 bindings (accuracy 1, commit `a31a26c`).
- [x] **T05** — Moulinette de migration déterministe. **FAIT + EXÉCUTÉE** : `scripts/migrate-frontmatter-to-okf.ts` (réutilise `normalizeFrontmatter`, `--dry-run`, flag OKF). Run : **254 scannés, 252 migrés, 2 déjà YAML, 0 erreur** ; re-dry-run **0 changement** (idempotent) ; `get_accuracy` ADR = 1 (bindings `src/` intacts) ; flag `okfMigration.version=0.1` dans `.living-doc.json`. WORKLOG `2026_07_09_20_42_[WORKLOG]_ticket_05_...`. **Tout `documentation/` est désormais OKF-YAML.**
  - **Code non commité** : `scripts/migrate-frontmatter-to-okf.ts` (pas d'ADR dédié — transform couvert par l'ADR T04). À grouper avec le commit T06.
- [x] **T06** — Garde de démarrage + commande `migrate` + champ `okfMigration`. **FAIT + VÉRIFIÉ.** `src/lib/migrate.ts` (cœur réutilisable), `bin/cli.ts` (garde : refus si non migré + prompt TTY ; sous-commande `migrate [--dry-run]` ; init auto-migre le starter), `src/lib/config.ts` (`okfMigration?` + `isOkfMigrated`). Testé : garde refuse (exit 1) sur fixture non migré, `migrate` convertit + pose le flag, dry-run idempotent. Build + 10/10 unit. WORKLOG `2026_07_09_21_23_[WORKLOG]_ticket_06_...`.
  - ✅ ADR d'implémentation `2026_07_10_01_25_[OKF]_okf_migration_startup_gate_...` + 3 bindings (accuracy 1, commit `8b143e5`).
  - 🐛 Fix inclus : la moulinette **ignore les symlinks** (elle injectait du frontmatter dans `AGENTS.md`/`CLAUDE.md`/`MEMORY.md` symlinkés depuis `documentation/AI/`) ; 3 fichiers revert.
- [x] **T07** — Rendu viewer depuis YAML. **FAIT.** GET /api/documents/:id expose `tags`/`type` (via `parseFrontmatter`, 2 branches), `DocDetail` typé, chips de tags dans `DocViewer`. Strip & pills déjà OK (format-agnostique + dual). ADR strip-frontmatter **reste exact** (pas de supersede). Build + 10/10. WORKLOG `2026_07_10_01_32_[WORKLOG]_ticket_07_...`. Pas d'ADR dédié (petit ajout UX).
  - **À faire après commit T07** : `documents.ts` est lié à l'ADR T04 → **rebaseliner** `refresh_metadata` de l'ADR `2026_07_09_20_37_[OKF]_normalizeonwrite_...` (l'ADR reste correct, seul le chemin lecture a changé).
- [x] **T08** — Liens bundle-relatifs. **FAIT.** `wireContent.ts` : `resolveBundleMdLink(href, docId)` (résout `/x.md`, `./x.md`, `../g/x.md` → id) + handler `onDocLink` ; export émet déjà du `.md` relatif ; `?doc=` reste in-app. Logique vérifiée + build. WORKLOG `2026_07_10_01_37_[WORKLOG]_ticket_08_...`. Pas d'ADR (stratégie figée T01).
- [x] **T09** — Génération des `index.md` + réservés. **FAIT + EXÉCUTÉ (31 générés).** `okf.ts` (`RESERVED_OKF_FILES`/`isReservedOkfFile`/`OKF_SPEC_VERSION`), `src/lib/okf/index-generator.ts` (`generateOkfIndexFiles`, appelé par `migrateDocsFolder`), exclusion des réservés dans `documents.ts` + `mcp/tools/documents.ts`. Racine = `okf_version: "0.1"`. Build + 10/10. WORKLOG `2026_07_10_01_53_[WORKLOG]_ticket_09_...`.
  - **Après commit** : ADR d'implémentation T09 (binding `index-generator.ts`) + **rebaseline** ADR T04 (okf.ts, documents.ts, mcp/tools/documents.ts ont changé).
- [x] **T10** — Génération du `log.md` depuis Git. **FAIT + EXÉCUTÉ.** `src/lib/okf/log-generator.ts` (`generateOkfLogFile` : `git log --diff-filter=A --name-only`, changelog `## AAAA-MM-JJ` des concepts ajoutés), wire dans `migrateDocsFolder`. Build + 10/10. WORKLOG `2026_07_10_07_55_[WORKLOG]_ticket_10_...`.
  - **Après commit** : ADR T10 (binding `log-generator.ts`) + **rebaseline** ADR T06 (`migrate.ts` a changé).
- [ ] **T11** — `resource` + bindings sources en bloc custom OKF. **PROCHAIN.** (Champ `resource` optionnel ; représenter les bindings `add_metadata` — path+hash+commit+dirty — comme un bloc `sources:` custom préservé, pour que la dérive survive à un aller-retour OKF. Zones : stockage métadonnées `src/lib/metadata.ts`, `add_metadata`/`refresh_metadata`, `frontmatter.ts`. Schéma figé ici.)

## Code à committer (T10)
`src/lib/okf/log-generator.ts` (nouveau), `src/lib/migrate.ts` (wire). Commit avant l'ADR T10 + le rebaseline T06.

## Code non commité (frontend, à committer au fil de l'eau)
- T07 : déjà committé + ADR T04 rebaseliné.
- T08 : `src/frontend-svelte/src/lib/home/wireContent.ts` (pas de binding ADR).
Rappel : les commits code sont demandés surtout avant un `add_metadata`/`refresh_metadata` (HEAD propre).

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
