---
type: ADR
title: Runtime Minimal Node 20 19 Pour Vite 8
description: Le runtime minimal public et CI passe de Node.js 18 a Node.js 20.19.0 afin d'etre compatible avec Vite 8 et Commander 14.
tags:
  - nodejs
  - runtime
  - engines
  - vite8
  - commander14
  - npm
  - ci
  - setup-node
  - compatibility
timestamp: 2026-06-18T22:27:00Z
status: To be validated
---

# Runtime minimal Node.js 20.19.0

## Contexte

Le manifeste et la documentation annoncaient Node.js 18 ou plus recent. Cette promesse etait devenue fausse apres les mises a niveau de dependances : Commander 14 exige Node.js 20 ou plus recent et Vite 8 exige Node.js 20.19.0 ou 22.12.0 minimum.

Une installation sous Node.js 18 pouvait donc satisfaire le champ `engines` du projet tout en echouant lors de l'installation, du developpement ou du build frontend.

## Decision

Fixer le contrat public a `Node.js >= 20.19.0` dans le manifeste npm, le lockfile, les README et la documentation projet. Les jobs CI qui valident le build et les tests utilisent explicitement Node.js 20.19.0 ; le job de publication peut continuer a utiliser Node.js 22.

Le minimum 20.19.0 est choisi plutot qu'un simple `>=20` car il exprime exactement la borne imposee par Vite 8.

## Consequences

- Node.js 18 n'est plus supporte officiellement.
- `npm install`, le build Vite et le CLI partagent desormais un contrat de runtime coherent.
- Toute future montee de Vite, Commander ou TypeScript doit revalider le champ `engines`, les workflows CI et les deux README.
- La publication reste compatible avec les branches Node.js 20.19+, 22.12+ et plus recentes satisfaisant les dependances.
