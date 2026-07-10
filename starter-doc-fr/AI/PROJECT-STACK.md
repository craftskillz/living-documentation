---
type: Technical Doc
title: PROJECT STACK
---

# PROJECT-STACK - Template

Ce fichier donne à l'assistant IA une vue rapide et factuelle du projet. Il doit rester court, concret et maintenu en continu.

Il ne remplace pas les ADR : il sert à savoir rapidement où regarder, quelles technologies sont en jeu et quels concepts structurent le code. Pour le pourquoi détaillé d'une décision, lire les ADR pertinents.

## Règle de maintenance

L'IA doit proposer une mise à jour de ce fichier lorsqu'une tâche :

- introduit, retire ou remplace une technologie importante ;
- modifie une convention structurante ;
- ajoute ou déplace une zone source importante ;
- change un concept métier ou technique central ;
- rend une information ci-dessous fausse ou incomplète.

Ne pas documenter ici les détails volatils, les TODO temporaires ou les informations qui appartiennent clairement à un ADR.

## Vue d'ensemble

Remplacer ce paragraphe par une description courte du projet :

- ce que fait le projet ;
- pour qui ;
- où se trouvent le code applicatif, la documentation et les points d'entrée principaux.

## Stack technique

Remplir uniquement les lignes qui existent réellement dans le projet. Supprimer les catégories inutiles.

- **Langage principal** :
- **Runtime** :
- **Framework frontend** :
- **Framework backend / serveur** :
- **Base de données / stockage** :
- **API externes / intégrations** :
- **Authentification / autorisation** :
- **Styles / design system** :
- **Gestion d'état** :
- **Build / bundler** :
- **Package manager** :
- **Tests** :
- **Lint / formatage** :
- **Observabilité / logs** :
- **Déploiement / hébergement** :

## Arborescence source utile

Décrire les dossiers ou fichiers que l'IA doit connaître pour s'orienter vite.

```text
src/                 <- code applicatif principal
tests/               <- tests automatisés
documentation/       <- documentation Living Documentation, si le dossier porte ce nom
```

Adapter cette arborescence au projet réel. Ne pas lister tout le dépôt : garder seulement ce qui aide une IA à trouver où intervenir.

## Concepts centraux

Lister les concepts qui reviennent souvent dans les tâches.

- **Concept 1** : expliquer en une phrase et pointer vers l'ADR ou le document utile.
- **Concept 2** : expliquer en une phrase et pointer vers l'ADR ou le document utile.
- **Concept 3** : expliquer en une phrase et pointer vers l'ADR ou le document utile.

## Conventions structurantes

Lister les conventions que l'IA doit respecter avant de modifier le code.

- Convention de nommage :
- Organisation des modules :
- Gestion des erreurs :
- Gestion de la configuration :
- Stratégie de test :

Si une convention devient durable ou résulte d'un compromis important, créer ou mettre à jour un ADR plutôt que surcharger ce fichier.
