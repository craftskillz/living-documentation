---
type: Worklog
title: Ticket 11 - resource field and sources drift-binding block in frontmatter
description: Réalisation du Ticket 11 — champ OKF `resource` préservé, et bindings de dérive living-doc mirrorés dans un bloc `sources:` custom OKF-préservé du frontmatter, pour survivre à un aller-retour de bundle OKF.
tags:
  - worklog
  - ticket-11
  - okf
  - sources
  - resource
  - drift-bindings
  - metadata
  - portability
timestamp: 2026-07-10T08:20:00Z
status: To Be Validated
---

# Ticket 11 — `resource` + bloc `sources` custom

## Réalisation
- **`resource`** (champ OKF standard) : ajouté à `CANONICAL_ORDER` et préservé verbatim par `normalizeFrontmatter`. Test dédié.
- **Bloc `sources`** : `normalizeFrontmatter` accepte un paramètre `sources` (`OkfSourceRef[] | null | undefined`) — `undefined` préserve l'existant (chemin d'écriture ne l'efface pas), tableau remplace, `null`/vide supprime le bloc. Épinglé **dernier** dans l'ordre canonique.
- **Mirror au point de convergence unique** : `setDocEntries` (le seul écrivain du store, appelé par `add_metadata`/`refresh_metadata`/`remove_metadata` MCP **et** les 3 routes HTTP `/metadata`) appelle `syncSourcesToFrontmatter` → projette `{path, hash, commit, dirty}` dans le frontmatter du doc. Le `.metadata.json` reste la source opérationnelle (l'accuracy en découle) ; le frontmatter est une projection portable.
- **Backfill** : `backfillSourcesFromStore(docsPath)` projette tous les bindings existants, branché dans `migrateDocsFolder`. Run réel → **77 docs** portent désormais leur bloc `sources:`.

## Sécurité
- Garde path-traversal (`abs.startsWith(docsPath)`), fichiers réservés ignorés, `lstat` **anti-symlink** (ne jamais écrire à travers `AGENTS.md`/`CLAUDE.md`/`MEMORY.md` symlinkés — cf. désastre T06). Vérifié : aucun fichier d'instruction ni hors-bundle touché.

## Vérifications
- `npm run build` OK, `npm run test:unit` **14/14** (4 nouveaux : `resource` préservé, `sources` override/null/undefined, idempotence write∘write).
- Preuve end-to-end sur fixture jetable (build compilé) : add → bloc mirroré, re-add → octets identiques (idempotent), remove-all → bloc supprimé, doc absent/réservé → ignoré sans throw.
- ADR T10 inspecté après migration : bloc `sources:` = `src/lib/okf/log-generator.ts` + hash + commit + dirty, identique au store.
- Re-run migrate → 0 changement (idempotent).

## Vigilance / suites
- `okf.ts` lié à l'ADR **T04**, `migrate.ts` lié à l'ADR **T06** → **rebaseliner les deux** après commit. `metadata.ts` : vérifier son ADR de rattachement.
- ADR d'implémentation **T11** après commit → bindings `src/lib/metadata.ts` + `src/lib/okf.ts`.
- **T12** (prochain) : validateur de conformité OKF + hook CI.

## Documents liés
- [ADR log.md (T10)](?doc=ADRS%252F2026_07_10_08_01_%255BOKF%255D_generate_okf_logmd_changelog_from_git_history)
- Backlog : `documentation/WORKLOG/ROADMAP.md`
