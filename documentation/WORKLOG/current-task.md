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

Adoption de la convention worklog dans le projet living-documentation lui-même, en miroir de la convention introduite dans les starters bilingues :

- création de `documentation/WORKLOG/current-task.md` ;
- création de la règle obligatoire `documentation/AI/rules/track-current-work.md` ;
- ajout de l'étape de lecture du worklog dans `AGENTS.md`, `CLAUDE.md` et `documentation/AI/PROJECT-INSTRUCTIONS.md` ;
- nouvelle section « Suivi de progression » dans `PROJECT-INSTRUCTIONS.md`.

Étapes précédentes de la même session :

- création des fichiers WORKLOG et de la règle `track-current-work` dans `starter-doc/` et `starter-doc-fr/` ;
- ADR `2026_05_14_11_33_[STARTER_DOC]_worklog_convention_for_ai_handoff_in_bilingual_starter` créé avec 6 fichiers source attachés, accuracy 1 ;
- `PROJECT-STACK.md` mis à jour pour mentionner le concept `Worklog` et le composant `WORKLOG/` du starter.

## Prochaine action recommandée

Aucune action de suivi requise. Reprendre la prochaine tâche utilisateur.

## Fichiers ou zones concernés

- `AGENTS.md`
- `CLAUDE.md`
- `documentation/AI/PROJECT-INSTRUCTIONS.md`
- `documentation/AI/PROJECT-STACK.md`
- `documentation/AI/rules/track-current-work.md`
- `documentation/WORKLOG/current-task.md`
- `documentation/ADRS/2026_05_14_11_33_[STARTER_DOC]_worklog_convention_for_ai_handoff_in_bilingual_starter.md`
- `starter-doc/WORKLOG/current-task.md`
- `starter-doc/AI/rules/track-current-work.md`
- `starter-doc/AI/PROJECT-INSTRUCTIONS.md`
- `starter-doc/AI/default/AGENTS.md`
- `starter-doc/AI/default/CLAUDE.md`
- `starter-doc-fr/WORKLOG/current-task.md`
- `starter-doc-fr/AI/rules/track-current-work.md`
- `starter-doc-fr/AI/PROJECT-INSTRUCTIONS.md`
- `starter-doc-fr/AI/default/AGENTS.md`
- `starter-doc-fr/AI/default/CLAUDE.md`

## Vérifications récentes

- MCP Living Documentation disponible.
- Init `npx living-documentation` testé sur dossier temporaire (EN et FR) : interpolation `DOCS_FOLDER` validée, copie récursive de `WORKLOG/` validée.
- ADR worklog créé avec 6 fichiers source attachés via `add_metadata`, accuracy 1.
- Coquille double slash `DOCS_FOLDER//WORKLOG/...` corrigée dans `starter-doc-fr/AI/default/AGENTS.md` par l'utilisateur.

## Notes de reprise

Convention pour les futurs agents : ce worklog n'est pas un ADR. Y consigner uniquement l'état opérationnel (statut + prochaine action + fichiers + vérifications). Les décisions durables vont dans `documentation/ADRS/`.

Modifications non commitées au moment de la rédaction : voir `git status`. Aucun commit n'a été créé pendant cette session ; l'utilisateur décidera quand et comment grouper les changements.
