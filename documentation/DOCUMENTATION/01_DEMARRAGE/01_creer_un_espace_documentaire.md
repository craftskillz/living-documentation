---
type: Document
title: 01 creer un espace documentaire
description: Guide de demarrage pour creer ou ouvrir un espace documentaire Living Documentation.
tags:
  - demarrage
  - installation
  - npx
  - docs-folder
  - local-first
  - markdown
  - admin
timestamp: 2026-06-30T00:00:00Z
status: Draft
---

# Creer un espace documentaire

![Architecture local-first reliant un dossier Markdown, Git, une interface web, des diagrammes et des agents IA](../90_ASSETS/images/concept-03-local-first.jpg)

Ce guide vous aide a lancer Living Documentation sur un dossier local. A la fin, vous disposez d'un espace documentaire ouvert dans le navigateur, pret a recevoir vos premiers documents Markdown.

## Prerequis

- Node.js 20.19 ou plus recent.
- Un terminal.
- Un dossier projet dans lequel vous acceptez de creer ou d'utiliser un dossier de documentation.

## Choisir le dossier documentaire

Living Documentation travaille sur un dossier de fichiers Markdown. Ce dossier peut etre :

- un nouveau dossier vide, par exemple `./documentation` ou `./docs` ;
- un dossier existant contenant deja des fichiers `.md` ;
- un dossier de test dedie si vous voulez decouvrir l'outil sans toucher a un projet reel.

Le chemin passe a la commande doit etre relatif, par exemple `./docs` ou `../documentation-equipe`. Evitez les chemins absolus et `~`, car la configuration doit rester portable.

## Lancer Living Documentation

Depuis le dossier de votre projet, lancez :

```bash
npx living-ai-documentation@latest ./documentation
```

Si vous voulez utiliser le port par defaut, ouvrez ensuite :

```text
http://localhost:4321
```

Pour utiliser un autre port :

```bash
npx living-ai-documentation@latest ./documentation --port 4000 --open
```

## Utiliser l'assistant interactif

Vous pouvez aussi lancer l'assistant sans argument :

```bash
npx living-ai-documentation@latest
```

Ce mode vous guide dans la creation d'un dossier documentaire de depart et peut creer des fichiers utiles pour les agents IA.

## Verifier le resultat

Dans le navigateur, vous devez voir :

- une page principale avec une barre laterale ;
- les documents detectes dans le dossier ;
- un acces a la page Admin ;
- une configuration `.living-doc.json` creee dans le dossier documentaire si elle n'existait pas.

## Ouvrir la configuration

La page Admin est disponible a l'adresse :

```text
http://localhost:4321/admin
```

Elle permet de configurer le titre, le theme, le pattern de nommage, les fichiers supplementaires, `sourceRoot`, les extensions bloquees et les integrations comme Git.

## Bonnes pratiques au depart

| Situation                | Recommandation                                                     |
| ------------------------ | ------------------------------------------------------------------ |
| Decouverte personnelle   | Creer un dossier de test separe.                                   |
| Projet existant          | Utiliser un dossier documentaire dedie dans le projet.             |
| Equipe                   | Stabiliser le nom du dossier avant de partager les liens.          |
| Documentation versionnee | Initialiser ou verifier Git avant de produire beaucoup de contenu. |

## Erreurs courantes

| Symptome                         | Cause probable                      | Correction                                         |
| -------------------------------- | ----------------------------------- | -------------------------------------------------- |
| La commande ne demarre pas       | Version Node trop ancienne          | Installer Node.js 20.19 ou plus recent.            |
| Le navigateur ne s'ouvre pas     | Option `--open` absente ou bloquee  | Ouvrir manuellement `http://localhost:4321`.       |
| Le port est deja utilise         | Une autre instance tourne deja      | Utiliser `--port 4000` ou arreter l'autre serveur. |
| Les documents ne s'affichent pas | Mauvais dossier passe a la commande | Relancer avec le chemin relatif du bon dossier.    |

## Suite recommandee

Continuez avec [Creer, modifier et retrouver un document](./02_creer_modifier_et_retrouver_un_document.md).
