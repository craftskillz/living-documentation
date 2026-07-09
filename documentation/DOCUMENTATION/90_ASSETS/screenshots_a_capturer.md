---
type: Document
title: Screenshots a capturer
description: Backlog des captures d'ecran a produire pour la documentation utilisateur.
tags:
  - screenshots
  - captures
  - assets
  - documentation
  - home
  - admin
  - workspace
  - git
  - versions
  - agents
timestamp: 2026-06-30T00:00:00Z
status: Draft
---

# Captures d'ecran a capturer

Cette liste sert de backlog pour les visuels UI. Les captures doivent representer de vrais etats de Living Documentation, pas des interfaces generees.

## Regles de capture

- Utiliser un jeu de documents d'exemple realiste.
- Eviter les chemins locaux personnels visibles quand ils ne sont pas utiles.
- Capturer l'interface apres chargement complet.
- Preferer le mode clair si la documentation est majoritairement claire.
- Garder une largeur de fenetre stable pour les captures principales.
- Recadrer seulement si cela ameliore la comprehension.
- Verifier que le texte reste lisible apres integration Markdown.

## Backlog priorise

| Fichier cible | Page ou zone | Etat a preparer | Document cible | Priorite | Notes |
| --- | --- | --- | --- | --- | --- |
| `home-document-ouvert.png` | Home | Sidebar visible, document Markdown ouvert, topbar lisible | Accueil, demarrage | Haute | Capture principale du produit. |
| `home-creer-dossier.png` | Home | Popup de creation de dossier | Demarrage | Haute | Montrer le nommage normalise. |
| `home-creer-document.png` | Home | Popup de creation de document | Demarrage | Haute | Inclure dossier et categorie si disponibles. |
| `editeur-snippets.png` | Editeur | Document ouvert avec menu snippets | Usage quotidien | Haute | Montrer l'aide a la redaction. |
| `note-reunion-exemple.png` | Editeur | Note de reunion structuree | Notes de reunion | Haute | Utiliser un contenu fictif mais realiste. |
| `processus-checklist-exemple.png` | Editeur | Processus avec etapes et checklist | Documentation de processus | Haute | Montrer une structure operationnelle. |
| `recherche-occurrences.png` | Recherche | Resultats de recherche plein texte | Navigation | Moyenne | Montrer plusieurs occurrences. |
| `files-sections.png` | Files | Fichiers groupes par sections/dossiers | Fichiers et images | Haute | Important pour la comprehension des fichiers. |
| `admin-general.png` | Admin | Configuration generale visible | Admin | Haute | Eviter les secrets. |
| `admin-git-integration.png` | Admin | Section Git configuree | Git et versions | Haute | Montrer enabled/disabled et push policy. |
| `versions-diff-cote-a-cote.png` | Document | Popup Versions avec diff cote-a-cote | Versions | Haute | HEAD courant a gauche, commit selectionne a droite. |
| `versions-restaurer-bloc.png` | Document | Fleche de restauration visible | Restaurer un bloc | Haute | Montrer le bouton enregistrer du brouillon. |
| `workspace-graph-providers-agents.png` | Workspace | Graphe avec providers, agents, MCP, provider image | Workspace | Haute | Utiliser couleurs de types. |
| `workspace-llm-node.png` | Workspace | Node LLM ouvert avec champs principaux | Providers LLM | Moyenne | Masquer token. |
| `agent-run-debug.png` | Workspace | Document de run avec prompt/debug | Agents | Haute | Montrer tools actifs ou chat-only. |
| `agent-image-run-markdown.png` | Workspace | Run agent incluant une image generee Markdown | Generation image | Haute | Image dans `images-ai`. |
| `mcp-tools-explorer.png` | MCP / AI context | Tools ou contexte MCP visible | MCP | Moyenne | Utile pour agents avances. |
| `diagram-editor-evidence.png` | Diagrammes | Diagramme lie a une evidence documentaire | Diagrammes | Haute | Montrer le lien document/diagramme. |
| `export-pdf.png` | Export | Action ou resultat d'export | Export | Moyenne | Peut etre reporte. |

## Jeu de donnees recommande

Creer un petit espace d'exemple avec :

- un dossier `Produit` ;
- un dossier `Reunions` ;
- un dossier `Processus` ;
- un document de decision ;
- une note de reunion ;
- un processus avec checklist ;
- un diagramme simple ;
- un agent Workspace de demonstration ;
- un provider LLM chat et un provider image.

Ce jeu permet d'obtenir des captures coherentes sur toute la documentation.

