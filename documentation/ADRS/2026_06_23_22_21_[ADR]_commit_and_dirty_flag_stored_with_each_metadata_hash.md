---
type: ADR
title: Commit And Dirty Flag Stored With Each Metadata Hash
description: Each metadata entry now records the source-repo HEAD commit and a dirty flag alongside its SHA-256 hash, returned to the LLM so drift review diffs from that commit instead of scanning history.
tags:
  - metadata
  - hash
  - commit
  - sha1
  - dirty
  - accuracy
  - drift
  - add_metadata
  - refresh_metadata
  - review_adr_relevance
  - git
timestamp: 2026-06-23T22:21:00Z
status: To be validated
sources:
  - path: src/lib/git.ts
    hash: 37f8b429af1fdfebf6ed46b8017e5499a83876d2b5e9264ff4bcf5afa6830473
    commit: 06cbd4105fcc8e48d9f4015eeaef828101be2ecc
    dirty: false
  - path: src/lib/metadata.ts
    hash: 0498b125bfb38061564a132641c123f1d0ca634664c81f13cd25d465de1f9175
    commit: 06cbd4105fcc8e48d9f4015eeaef828101be2ecc
    dirty: false
  - path: src/mcp/tools/metadata.ts
    hash: bbbc1a63e614b5e2bbd7b45bd691fd3f1a37b7d08e2fcad656d46d70e95bc86d
    commit: 06cbd4105fcc8e48d9f4015eeaef828101be2ecc
    dirty: false
  - path: src/routes/metadata.ts
    hash: ede0df5f16c5590e34374c0961c3d90b22883d10a5598cc630a89edeb889159d
    commit: 06cbd4105fcc8e48d9f4015eeaef828101be2ecc
    dirty: false
---

# Commit and dirty flag stored with each metadata hash

## Contexte

Les documents (notamment les ADR) sont reliés à des fichiers source via des
métadonnées stockées dans `.metadata.json` : chaque entrée associe un chemin à
un hash SHA-256, ce qui permet de calculer la fiabilité du document (voir
[Source File Bindings And Accuracy Gauge](?doc=ADRS%252F2026_04_22_%255BMETADATA%255D_source_file_bindings_and_accuracy_gauge)).

Quand un LLM parcourt ensuite les ADR pour les remettre à jour, il ne savait pas
**à quel commit** un hash avait été calculé : il devait potentiellement fouiller
tout l'historique git pour retrouver l'état correspondant. Coûteux et imprécis.

## Décision

Chaque `MetadataEntry` peut désormais porter deux champs optionnels :

- `commit` — le SHA-1 du `HEAD` du dépôt source au moment où le hash a été calculé ;
- `dirty` — `true` si le working tree était sale à ce moment-là (le hash reflète
  alors le working tree, pas le commit, qui n'est donc qu'une approximation).

Caractéristiques du choix :

- **Stockage par entrée** (pas au niveau du document). La structure JSON reste un
  tableau d'entrées : les champs étant optionnels, les anciens `.metadata.json`
  restent valides — **rétrocompatible**, aucune migration. Lors d'un `refresh`
  global toutes les entrées partagent le même commit ; un `add_metadata` d'un seul
  fichier enregistre le commit à son propre instant.
- **Capture** à chaque calcul de hash : `add_metadata` et `refresh_metadata` (côté
  MCP et côté routes HTTP), via un helper `currentSourceCommit(sourceRoot)` qui
  renvoie `null` hors dépôt git (dégradation propre, champs omis).
- **Retour au LLM** : `commit`/`dirty` apparaissent dans `get_accuracy`,
  `review_adr_relevance` (dans `sourceFilesToReread`) et `list_metadata`. Les
  descriptions d'outils invitent le LLM à lancer un `git diff <commit>..HEAD -- <path>`
  ciblé plutôt que de parcourir tout l'historique, et à retomber sur la recherche
  d'historique pour les entrées legacy sans `commit`.

## Conséquence opérationnelle — working tree propre avant d'écrire un ADR

Comme le commit est figé dans les métadonnées au moment du calcul du hash, écrire
un ADR (et attacher/rafraîchir ses fichiers source) sur un arbre git sale fige un
commit faux/`dirty`. Les starters documentaires (`PROJECT-INSTRUCTIONS.md`,
FR + EN) imposent donc à l'IA, quand une feature est terminée et qu'elle s'apprête
à écrire l'ADR, de vérifier l'état git et d'**inviter l'utilisateur à commiter
d'abord** si le `HEAD` est dirty.

## Alternatives écartées

- **Commit unique au niveau du document** (`{ commit, entries: [...] }`) : plus
  fidèle conceptuellement mais casse le format tableau et impose une migration ;
  par-entrée est plus rétrocompatible et gère mieux `add_metadata` d'un seul fichier.
- **Stocker HEAD sans détecter l'état sale** : induirait le LLM en erreur sur un
  arbre modifié. D'où le flag `dirty`.
- **Forcer le comportement côté code** (refuser l'écriture si dirty) : laissé en
  consigne documentaire, suffisant pour l'usage attendu.

## Portée

Mécanisme backend + retour MCP uniquement. La modale « Métadonnées des sources »
du frontend ignore (sans casse) ces nouveaux champs ; leur affichage UI n'est pas
inclus dans cette décision.
