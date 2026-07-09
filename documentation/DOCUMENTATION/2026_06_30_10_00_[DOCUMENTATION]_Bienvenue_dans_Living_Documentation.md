---
type: Document
title: Bienvenue Dans Living Documentation
description: Point d'entree de la documentation utilisateur Living Documentation.
tags:
  - accueil
  - documentation-utilisateur
  - living-documentation
  - markdown
  - git
  - agents
  - workspace
  - mcp
timestamp: 2026-06-30T10:00:00Z
status: Draft
---

### Bienvenue dans **Living Documentation** !

Votre atelier local de production documentaire en Markdown.

<!-- image-width: 2/3 -->

![Atelier local **Living Documentation** reliant documents Markdown, notes, processus, diagrammes, Git et agents IA](/images/DOCUMENTATION/concept-01-hero-produit.jpg)

Ce n'est pas un outil de generation de code, mais un outil de generation, de maintenance, de versioning et d'automatisation de documentation

**Living Documentation** sert à garder la connaissance utile au même endroit, dans un format lisible et versionnable :

- documents Markdown classés par dossiers et catégories
- notes de réunions et comptes rendus
- procédures, processus et checklists
- documentation de code, décisions d'architecture (ADRs)
- diagrammes liés à des documents
- images, fichiers joints et visuels générés
- exécutions(run) d'agents et traces d'automatisation
- historique Git et comparaison de versions

### Un modèle local-first

<!-- image-width: 2/3 -->

![Architecture local-first reliant un dossier Markdown, Git, une interface web, des diagrammes et des agents IA](/images/DOCUMENTATION/concept-03-local-first.jpg)

La documentation repose sur des fichiers présents dans votre espace local :

- les documents sont des fichiers Markdown pouvant être consultés par vous ou par vos LLMs
- le versionning utilise Git pour enregistrer les modifications au fil de l'eau et permettre la restauration de tous vos documents
- l'outil peut être utilise seul, puis enrichi avec ses propres outils MCP et ses agents internes

### Commençons la visite !

Avant tout, je vous recommande de procéder à l'intégration de Git dans **Living Documentation**, vous pourrez ainsi bénéficier du versionning automatique de tous vos changements.
Vous devez disposez de git installé sur votre ordinateur, puis depuis le terminal ouvrez le dossier contenant **Living Documentation** et initialisez un repository git.

<!-- code-width: 1/4 -->

```bash
git init
```

Rendez vous alors sur la page d'admin (en cliquant sur le menu <kbd>Admin</kbd> avec <kbd>Ctrl + clic</kbd> ou <kbd>Shift + clic</kbd> pour ouvrir une nouvelle fenêtre) et configurez l'intégration git, enregistrez, puis reprenez la lecture.

<!-- image-width: 1/2 -->

![image](/images/DOCUMENTATION/admin_git_integration.png)

### A votre tour, explorez les fontionnalités de **Living Documentation** ...

Chacun des modules de l'application est décrit dans les pages situées en dessous de ce document dans l'arborescence de fichiers à gauche de la page Web.
Vous y trouverez toutes les informations nécessaires pour comprendre toutes les possibilités offertes par **Living Documentation**.

Bonne découverte et j'espère que l'outil vous sera utile et vous rendra à la fois plus productif et meilleur dans vos process documentaires.

**_Youssef Medaghri-Alaoui_**
