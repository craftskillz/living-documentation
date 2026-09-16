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
    commit: b42d051f271929cce2d0b31b9188bab189f268f5
    dirty: false
  - path: src/routes/templates.ts
    hash: 9a31301d0a973974b0bd36b640bc51b03b1fd928a67b63c89c7331440dd5f607
    commit: ee7ad56ec7d725e4e3e1955c1e18891caec2f21f
    dirty: false
  - path: src/routes/documents.ts
    hash: a9c1f5c47301edcaaa080ba9f75e276db9ceeff592b84363e85da2a1a1d15d43
    commit: d419d9a8cb2ac45f2b8c5274d42f31f4d58c2582
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
