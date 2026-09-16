---
type: ADR
title: Templates Markdown classes par dossier
description: Une bibliotheque locale de templates Markdown alimente un menu a deux niveaux et le formulaire de creation de documents.
tags:
  - templates
  - markdown
  - svelte
  - express
  - TemplateLibrary
  - contentFromTemplate
  - NewDocModal
  - okf
status: To be validated
sources:
  - path: src/lib/documentTemplates.ts
    hash: a41da1b42ebdb845b5831924ca9dc73944264a0b38deb715197e887b2e95d1b4
    commit: c0d09d7320a586abd752c745b2e66b3aa175bbda
    dirty: false
  - path: src/routes/templates.ts
    hash: 9a31301d0a973974b0bd36b640bc51b03b1fd928a67b63c89c7331440dd5f607
    commit: c0d09d7320a586abd752c745b2e66b3aa175bbda
    dirty: false
  - path: src/routes/documents.ts
    hash: a9c1f5c47301edcaaa080ba9f75e276db9ceeff592b84363e85da2a1a1d15d43
    commit: c0d09d7320a586abd752c745b2e66b3aa175bbda
    dirty: false
  - path: src/frontend-svelte/src/lib/templates/api.ts
    hash: 044eb0f0476924a8904c783ace928e427c35e3423ea182d081b45425e8937e7a
    commit: c0d09d7320a586abd752c745b2e66b3aa175bbda
    dirty: false
  - path: src/frontend-svelte/src/lib/templates/TemplatesMenu.svelte
    hash: 31c1ffcd5147156e8cc5186b9089e9aa57518b80472cd0737ec847ccda1c0643
    commit: c0d09d7320a586abd752c745b2e66b3aa175bbda
    dirty: false
  - path: src/frontend-svelte/src/lib/templates/TemplatesManager.svelte
    hash: 56bba71dc11cba7207c550946cb6afc44bd63ea473180b919c5ad28e9c886a75
    commit: c0d09d7320a586abd752c745b2e66b3aa175bbda
    dirty: false
  - path: src/frontend-svelte/src/lib/home/NewDocModal.svelte
    hash: 4eba52f6d88df00bb5df919c41e6bbe54e2eb8f54e04b4c5b952b68464b857df
    commit: c0d09d7320a586abd752c745b2e66b3aa175bbda
    dirty: false
  - path: tests/e2e/templates.spec.ts
    hash: ee1ff80fa7a8fa544ffc8ad6bd7fc6bd53402a27aa1f96960aa6ea26a6421390
    commit: c0d09d7320a586abd752c745b2e66b3aa175bbda
    dirty: false
---

# Templates Markdown classés par dossier

## Contexte

Les réunions et ateliers réutilisent des structures de documents. L'utilisateur doit pouvoir gérer ses modèles et créer une copie en choisissant son titre et son dossier de destination.

## Décision

Le menu **Templates**, placé avant Agents et après Home lorsque ce lien est affiché, présente deux niveaux : dossiers puis templates. Une fenêtre de gestion permet de créer, renommer et supprimer les dossiers, ainsi que de créer, modifier et supprimer les templates.

Un clic sur un template ouvre le formulaire de création prérempli. Le formulaire habituel propose également la sélection d'un dossier de templates puis d'un template, ou un document vierge. Le titre reste modifiable et le navigateur de dossiers conserve son rôle de choix de destination du document.

Le contenu est du Markdown littéral, sans substitution de variables. Les titres Markdown du corps restent inchangés. Chaque document créé est une copie indépendante : modifier ou supprimer son modèle ne modifie pas les documents existants.

## Persistance et API

La bibliothèque est enregistrée dans `<docsFolder>/.document-templates.json`, au format `{ version: 1, folders: [{ id, name, templates: [{ id, name, content }] }] }`. Les dossiers sont logiques et ne correspondent pas aux dossiers de destination des documents. Ce stockage évite d'indexer les modèles comme des documents Markdown.

Les identifiants sont des UUID et les noms ne construisent aucun chemin disque. Les noms sont limités à 120 caractères et uniques sans distinction de casse dans leur portée ; le contenu est limité à 1 000 000 de caractères. Les écritures synchrones utilisent un fichier temporaire puis un renommage. Une bibliothèque illisible provoque une erreur et n'est pas remplacée par une bibliothèque vide.

Les routes sous `/api/templates` exposent la lecture de bibliothèque et le CRUD des dossiers/templates. La suppression d'un dossier non vide exige `confirm=true` et supprime ses templates. L'interface utilise le composant partagé ConfirmDialog et explicite cette conséquence.

`POST /api/documents` accepte `templateId` à la place de `content`. Le serveur résout le modèle avant de créer le document ou son dossier ; un modèle absent provoque une erreur, jamais une création silencieuse de document vierge. Le frontmatter reçoit un nouveau titre et timestamp ; les anciens champs date, sources et resource sont retirés. Les autres champs et le corps sont conservés, puis la normalisation OKF existante s'applique.

## Conséquences et limites

Les modèles se partagent avec le projet via ce fichier JSON. Aucun moteur de variables, dossier imbriqué de templates ou synchronisation des documents déjà créés n'est introduit. La sérialisation des mutations repose sur le processus serveur local unique.

Les libellés et erreurs de la fonctionnalité sont disponibles en français et en anglais.

## Documents liés

Cette décision complète, sans la remplacer, la décision sur [la création des dossiers et la navigation du drawer](?doc=ADRS%252F2026_04_12_%255BSIDEBAR%255D_creation_dossier_icones_font_awesome_et_dossiers_vides_dans_le_drawer). La sélection d'un modèle est indépendante du choix de destination du document.

## Vérification

`tests/e2e/templates.spec.ts` couvre huit scénarios : gestion et persistance, suppressions confirmées ou annulées, formulaire depuis une autre route, création classique et document vierge, validations API, renouvellement de l'identité OKF, bibliothèque corrompue, messages français et disparition d'un modèle pendant une création.

Validation de la fonctionnalité : huit nouveaux tests, 27 tests existants ciblés et 24 tests unitaires réussis ; build et lint réussis avec les avertissements existants. Le contrôle Svelte conserve les 12 erreurs et 41 avertissements constatés sur le code de référence. La suite E2E complète n'a pas été relancée.
