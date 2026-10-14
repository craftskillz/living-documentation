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

Avant de reprendre ou modifier le projet, lire `documentation/WORKLOG/current-task.md` si le fichier existe.

Quand une tâche est commencée, interrompue, terminée ou laissée avec des suites connues, mettre à jour `documentation/WORKLOG/current-task.md` avec :

- le statut courant ;
- la tâche en cours ;
- le scope inclus et exclu si nécessaire ;
- les fichiers ou zones concernés ;
- les vérifications réalisées ;
- les vérifications restantes ;
- la prochaine action recommandée.

Quand un ticket de roadmap est terminé, sa trace de réalisation va dans `documentation/WORKLOG/CURRENT/` (convention complète : section « Suivi de progression » de `PROJECT-INSTRUCTIONS.md`).

Le worklog ne remplace pas les ADR : il décrit l'avancement opérationnel et les points de reprise, pas les décisions durables.
