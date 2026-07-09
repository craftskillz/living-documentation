---
type: ADR
title: Worklog Convention For Ai Handoff In Bilingual Starter
description: Le starter bilingue ajoute un dossier WORKLOG/ avec un current-task.md de reprise partagé entre assistants IA, une règle obligatoire track-current-work, et une étape de lecture du worklog dans PROJECT-INSTRUCTIONS, AGENTS.md et CLAUDE.md.
tags:
  - starter-doc
  - starter-doc-fr
  - worklog
  - current-task
  - handoff
  - ai-agents
  - track-current-work
  - project-instructions
  - scaffolding
  - DOCS_FOLDER
timestamp: 2026-05-14T11:33:00Z
status: Accepted
---

# Convention worklog pour la reprise entre assistants IA dans le starter bilingue

## Contexte

L'ADR [Starter doc bilingue et initialiseur npx interactif](?doc=ADRS%252F2026_05_11_15_42_%255BSTARTER_DOC%255D_bilingual_starter_doc_and_interactive_npx_initializer) a posé un starter qui scaffolde `PROJECT-INSTRUCTIONS`, `AGENTS.md`, `CLAUDE.md`, `memory/MEMORY.md`, des règles `AI/rules/` et un exemple d'ADR.

Manquait un mécanisme pour la **continuité opérationnelle entre agents IA** lorsqu'une tâche est commencée, interrompue ou reprise par un autre agent. Les ADR couvrent les décisions durables, pas l'état "où en est-on ?". En pratique, chaque agent redécouvrait le contexte depuis zéro ou laissait des indices dispersés dans les messages utilisateur.

## Décision

### 1. Dossier `WORKLOG/` ajouté aux deux starters

`starter-doc/WORKLOG/current-task.md` et `starter-doc-fr/WORKLOG/current-task.md` deviennent un **point de reprise partagé**. Le document a une structure stable :

- statut courant ;
- tâche en cours ;
- dernière action réalisée ;
- prochaine action recommandée ;
- fichiers ou zones concernés ;
- vérifications réalisées ;
- notes de reprise.

Le worklog est explicitement **non un ADR** : il décrit l'état opérationnel, pas une décision durable. Pour un ticket MVP qui mérite un suivi détaillé, l'agent peut créer un document dédié dans `WORKLOG/`.

### 2. Règle obligatoire `track-current-work`

`starter-doc/AI/rules/track-current-work.md` et son équivalent FR portent une règle de sévérité `required` avec `appliesTo: ["**/*"]`. Elle impose deux comportements à tout assistant IA :

- **avant** de modifier le projet : lire `DOCS_FOLDER/WORKLOG/current-task.md` s'il existe ;
- **avant** de rendre la main : mettre à jour le worklog si la tâche a été commencée, terminée, interrompue ou laissée avec des suites connues.

### 3. Lecture du worklog dans les fichiers d'orientation

Une nouvelle étape « Lire `DOCS_FOLDER/WORKLOG/current-task.md` si présent pour reprendre l'état de la tâche courante » est insérée dans la routine de démarrage de :

- `starter-doc/AI/PROJECT-INSTRUCTIONS.md` + équivalent FR (plus une nouvelle section « Progress Tracking » / « Suivi de progression » qui cadre la convention) ;
- `starter-doc/AI/default/AGENTS.md` + équivalent FR ;
- `starter-doc/AI/default/CLAUDE.md` + équivalent FR.

### 4. Aucun changement de CLI

L'interpolation `DOCS_FOLDER` ([bin/cli.ts](bin/cli.ts) `replaceDocsFolderPlaceholders`) traite déjà tout fichier `.md` du scaffold, et `copyDir` copie le dossier `WORKLOG/` sans filtre. Le CLI n'a donc pas eu à changer. Vérifié empiriquement par un init sur dossier temporaire : `DOCS_FOLDER` est bien remplacé par le nom de dossier choisi (par exemple `mydocs/WORKLOG/current-task.md`) dans les nouveaux fichiers.

## Conséquences

### PROS

- Reprise fiable entre agents IA : le prochain agent retrouve le statut, la prochaine action, les fichiers touchés et les vérifications restantes sans interroger l'utilisateur.
- Séparation claire avec les ADR : décisions durables vs état opérationnel transitoire.
- Convention symétrique EN/FR, pas de divergence pédagogique entre les deux starters.
- Aucune modification du CLI : la copie et l'interpolation sont déjà génériques.

### CONS

- Deux fichiers de plus à maintenir en parallèle EN/FR , même contrainte que l'ADR parent.
- Le worklog n'est pas typé : un agent négligent peut le laisser obsolète ou contradictoire avec la réalité. La règle est `required` mais ne peut pas être vérifiée mécaniquement.
- Pas de mécanisme pour archiver l'historique des worklogs : `current-task.md` est écrasé à chaque tâche. Pour conserver une trace, l'agent doit créer un document daté dédié dans `WORKLOG/`.
