---
type: ADR
title: Link Extra Files As Documentation
description: "Prise en charge de l'inclusion de fichiers Markdown situés en dehors du dossier docs via un tableau de configuration extraFiles, avec un explorateur de système de fichiers dans le panneau d'administration. [SuperSeeded : le format de stockage des chemins est passé d'absolu à relatif ; la fonctionnalité elle-même (sécurité par liste blanche, explorateur admin, ordonnancement, placement dans la barre latérale, schéma d'identifiant de document) est conservée dans la nouvelle ADR.]"
tags:
  - configuration
  - extraFiles
  - sidebar
  - security
  - api
  - browse
  - path-traversal
  - document-id
  - superseded
timestamp: 2026-03-20T10:15:00Z
status: SuperSeeded
language: fr
superseded_by: 2026_04_24_[CONFIGURATION]_portable_living_doc_json_with_relative_paths.md
---

## Contexte

L'outil a été conçu pour servir tous les fichiers Markdown à partir d'un dossier docs unique. Un besoin courant est apparu dans la pratique : les projets ont souvent des fichiers Markdown importants à la racine du dépôt (par exemple `README.md`, `CLAUDE.md`) qui ne se trouvent pas dans le dossier docs dédié, mais qui devraient tout de même être présentés dans le visualiseur aux côtés de la documentation.

## Décision

Introduire un champ `extraFiles` dans `.living-doc.json`, une liste ordonnée de chemins absolus vers des fichiers Markdown situés en dehors du dossier docs. Ces fichiers sont toujours assignés à la catégorie **General** et apparaissent avant les documents General ordinaires dans la barre latérale.

Une interface d'administration a été ajoutée pour parcourir le système de fichiers et ajouter/supprimer/réordonner les fichiers supplémentaires sans modifier le fichier de configuration manuellement.

Un nouveau point de terminaison API `GET /api/browse?path=...` renvoie les répertoires et les fichiers `.md` présents à un chemin donné, permettant au panneau d'administration de naviguer dans le système de fichiers.

## Conséquences

### AVANTAGES

- Les fichiers importants comme `README.md` ou `CLAUDE.md` à la racine du dépôt peuvent être présentés dans le visualiseur sans avoir à les déplacer dans le dossier docs.
- L'interface d'administration permet de gérer les fichiers supplémentaires sans modifier manuellement `.living-doc.json`.
- Les fichiers supplémentaires conservent l'ordre défini par l'utilisateur dans la configuration (et non triés par date), offrant un contrôle total sur la priorité via l'interface de réordonnancement.
- La sécurité est préservée : seuls les chemins présents dans la liste blanche `extraFiles` peuvent être lus ; seuls les fichiers `.md` sont acceptés, tant au moment de la navigation qu'à l'écriture de la configuration.

### INCONVÉNIENTS

- Les fichiers supplémentaires contournent la garde de traversée de chemin `docsPath` (intentionnel, mais élargit la surface accessible).
- Les chemins absolus dans la configuration ne sont pas portables entre machines ou utilisateurs.
- Le schéma d'identifiant de document devient plus complexe : les fichiers supplémentaires utilisent `encodeURIComponent(absolutePathWithoutExtension)` au lieu de `encodeURIComponent(filename)`, et la route `/:id` doit détecter les fichiers supplémentaires en vérifiant `path.isAbsolute(decodedId)`.