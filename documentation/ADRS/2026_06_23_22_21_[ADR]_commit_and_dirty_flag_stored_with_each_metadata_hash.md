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
    hash: ab30eacedd040cb9a54894fe5d2a373bd15db3499b3059a7117893224743c879
    commit: 167eb7b1e3bbe8f8e31b137f02618e5eebd4eb5c
    dirty: false
  - path: src/lib/metadata.ts
    hash: 84a6200b69511299c01e8f3e74234b01a352cf7583ee8307231e640da9126550
    commit: 399d7888211ae5583938fea74088399fa209a7ad
    dirty: false
  - path: src/mcp/tools/metadata.ts
    hash: 9be3219e9f39110d23864050299644f304c81d694fbb6fdb1877d104cc820ee3
    commit: 399d7888211ae5583938fea74088399fa209a7ad
    dirty: false
  - path: src/routes/metadata.ts
    hash: 9fb2a329822f32f020b1dabf91eb3fa57c954137b9038ed46c1ebe523b36a7bc
    commit: 399d7888211ae5583938fea74088399fa209a7ad
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
