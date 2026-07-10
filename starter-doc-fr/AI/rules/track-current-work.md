---
type: Rule
title: Suivre la tâche courante dans WORKLOG
description: Les assistants IA doivent lire et maintenir le worklog de tâche courante pour permettre une reprise fiable entre agents.
tags:
  - worklog
  - handoff
  - agents-ia
  - progression
  - documentation
id: track-current-work
severity: required
appliesto:
  - "**/*"
---

Avant de reprendre ou modifier le projet, lire `DOCS_FOLDER/WORKLOG/current-task.md` si le fichier existe.

Quand une tâche est commencée, interrompue, terminée ou laissée avec des suites connues, mettre à jour `DOCS_FOLDER/WORKLOG/current-task.md` avec :

- le statut courant ;
- la tâche en cours ;
- les fichiers ou zones concernés ;
- les vérifications réalisées ;
- les vérifications restantes ;
- la prochaine action recommandée.

Pour un ticket MVP réellement commencé, créer ou mettre à jour un document dédié dans `DOCS_FOLDER/WORKLOG/` si le suivi ne tient plus clairement dans `current-task.md`.

Le worklog ne remplace pas les ADR : il décrit l'avancement opérationnel et les points de reprise, pas les décisions durables.
