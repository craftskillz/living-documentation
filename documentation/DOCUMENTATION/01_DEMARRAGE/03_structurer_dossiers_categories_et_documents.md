---
type: Document
title: 03 structurer dossiers categories et documents
description: Guide pour comprendre et utiliser les dossiers, categories et documents dans Living Documentation.
tags:
  - demarrage
  - dossiers
  - categories
  - documents
  - organisation
  - sidebar
  - markdown
timestamp: 2026-06-30T00:00:00Z
status: Draft
---

# Structurer dossiers, categories et documents

Living Documentation combine deux mecanismes differents : les dossiers du systeme de fichiers et les categories extraites du nom des fichiers. Comprendre cette difference permet de construire une documentation facile a parcourir.

## Idee principale

Un dossier correspond a un repertoire sur disque. Une categorie correspond au token `[Category]` dans le nom du fichier.

Ces deux notions se completent :

- le dossier indique ou le fichier est range ;
- la categorie indique le type ou le theme du document ;
- la barre laterale combine les deux pour construire la navigation.

## Exemple simple

```text
documentation/
├── REUNIONS/
│   └── 2026_06_30_09_00_[MEETING]_point_produit.md
├── PROCESSUS/
│   └── 2026_06_30_10_00_[PROCESS]_publier_une_release.md
└── ADRS/
    └── 2026_06_30_11_00_[ARCHITECTURE]_choix_du_stockage.md
```

Dans cet exemple :

- `REUNIONS`, `PROCESSUS` et `ADRS` sont des dossiers ;
- `MEETING`, `PROCESS` et `ARCHITECTURE` sont des categories ;
- chaque document reste un fichier Markdown lisible sur disque.

## Utiliser les dossiers

Utilisez les dossiers pour separer des espaces de travail ou des grands domaines :

- `REUNIONS` ;
- `PROCESSUS` ;
- `ADRS` ;
- `GUIDES` ;
- `REFERENCE` ;
- `PRODUIT` ;
- `CLIENTS` ;
- `OPERATIONS`.

Les dossiers peuvent etre imbriques. Un prefixe numerique peut servir a controler l'ordre d'affichage, par exemple `01_DEMARRAGE`, `02_USAGE_QUOTIDIEN`, `03_AUTOMATISATION_IA`.

## Utiliser les categories

Utilisez les categories pour qualifier la nature d'un document :

- `[GENERAL]` ;
- `[MEETING]` ;
- `[PROCESS]` ;
- `[ADR]` ;
- `[ARCHITECTURE]` ;
- `[FRONTEND]` ;
- `[BACKEND]` ;
- `[ADMIN]`.

La categorie est independante du dossier. Un document dans `ADRS/` peut avoir une categorie `[FRONTEND]` si la decision concerne le frontend.

## Choisir une structure de depart

Pour un projet simple, commencez avec peu de dossiers :

```text
documentation/
├── 00_ACCUEIL/
├── 01_GUIDES/
├── 02_PROCESSUS/
├── 03_REUNIONS/
├── 04_DECISIONS/
└── 90_REFERENCE/
```

Pour un projet technique, vous pouvez separer davantage :

```text
documentation/
├── ADRS/
├── ARCHITECTURE/
├── RUNS_AGENTS/
├── PROCESSUS/
├── REUNIONS/
├── SUPPORT/
└── REFERENCE/
```

La bonne structure est celle qui aide a retrouver l'information sans devoir connaitre l'historique du projet.

## Regles pratiques

| Regle | Raison |
| --- | --- |
| Eviter trop de dossiers au depart | Une structure trop fine devient vite lourde. |
| Utiliser des noms courts | La sidebar reste lisible. |
| Garder les prefixes numeriques pour les grandes sections | L'ordre reste stable dans Git et dans l'interface. |
| Ne pas tout mettre dans une seule categorie | La recherche par type devient inutile. |
| Creer une categorie seulement si elle sera reutilisee | Les categories uniques creent du bruit. |

## Quand restructurer

Restructurez seulement quand un probleme apparait :

- trop de documents dans le meme dossier ;
- titres difficiles a distinguer ;
- documents de nature differente melanges ;
- recherche trop frequente pour retrouver les memes documents ;
- equipe qui ne sait plus ou ajouter un nouveau contenu.

## Suite recommandee

Apres avoir stabilise la structure de depart, continuez avec les guides d'usage quotidien : organisation projet, notes de reunion, processus, snippets, images et diagrammes.

