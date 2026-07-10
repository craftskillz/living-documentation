---
type: Technical Doc
title: PROJECT USEFUL COMMANDS
---

# PROJECT-USEFUL-COMMANDS - Template

Ce fichier décrit les commandes réellement utiles pour travailler sur le projet. Il doit permettre à une IA de choisir la bonne vérification sans deviner.

Il doit rester à jour. Une commande fausse coûte plus cher qu'une commande absente.

## Règle de maintenance

L'IA doit proposer une mise à jour de ce fichier lorsqu'une tâche :

- ajoute, retire ou renomme un script de développement ;
- change le package manager ;
- change la commande de build, test, lint ou formatage ;
- introduit une étape de setup nécessaire ;
- révèle qu'une commande documentée ne marche plus.

Avant d'ajouter une commande, vérifier qu'elle existe réellement dans `package.json`, un Makefile, un script ou la documentation du projet.

## Package manager

Indiquer le package manager attendu et la règle associée.

```text
npm | pnpm | yarn | bun | autre
```

Si le projet impose un package manager, créer ou mettre à jour une règle dans `AI/rules/`.

## Installation

| Commande | Quand l'utiliser | Notes |
|---|---|---|
| `npm install` | Après clone ou changement de dépendances | Adapter au package manager réel. |

## Développement local

| Commande | Effet | Notes |
|---|---|---|
| `npm run dev` | Démarre le serveur local | Préciser le port et les prérequis. |

## Qualité

| Commande | Effet | Quand la lancer |
|---|---|---|
| `npm run build` | Compile ou bundle le projet | Après changement de code typé, build config ou assets copiés. |
| `npm test` | Lance les tests | Après changement de comportement. |
| `npm run lint` | Lance le lint | Si le projet possède un lint. |
| `npm run format` | Formate le code | Si le projet possède un formateur. |

## Tests ciblés

Documenter les commandes qui permettent de vérifier un périmètre sans lancer toute la suite.

| Commande | Périmètre |
|---|---|
| `npm test -- <pattern>` | Adapter au runner réel. |

## Setup initial

Lister les étapes nécessaires après un clone ou une initialisation.

```bash
# Exemple à remplacer
cp .env.example .env
npm install
```

## Commandes dangereuses ou coûteuses

Lister les commandes qui modifient l'environnement, suppriment des données, lancent un déploiement ou coûtent de l'argent.

| Commande | Risque | Règle |
|---|---|---|
| `npm run deploy` | Déploiement réel | Demander validation explicite avant exécution. |

## Notes pour l'IA

- Lancer la plus petite vérification utile avant de terminer.
- Si une commande échoue, reporter la commande exacte, le symptôme et l'hypothèse la plus probable.
- Ne pas inventer de scripts : si une commande manque, le dire et proposer de l'ajouter.
