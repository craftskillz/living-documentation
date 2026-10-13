---
type: Rule
title: Travailler vite et à coût maîtrisé
description: Vérifier l'environnement avant de coder, tester de façon ciblée, une US par session, économiser le contexte, s'arrêter plutôt que contourner.
tags:
  - agents-ia
  - cout
  - tests
  - environnement
  - session
id: cost-efficient-agent-workflow
severity: required
appliesto:
  - "**/*"
---

Chargée automatiquement à chaque session Claude Code via un import dans `CLAUDE.md`. Origine : [memory/agent-cost-lessons.md](../../../memory/agent-cost-lessons.md).

## 1. Vérifier l'environnement en premier, avant toute ligne de code

Lancer `npm run build`, `npx biome lint src/server.ts` et `npx playwright test tests/api/tree.spec.ts`.

Si l'une échoue pour une raison d'environnement (binaires natifs absents, Chromium introuvable, CDN bloqués, MCP injoignable) : **s'arrêter et le dire à l'utilisateur**, en recommandant Claude Code en local sur le Mac. Ne jamais monter de contournement (copie du dépôt, stubs CDN, réinstallation de dépendances) sans accord explicite.

## 2. Tests : ciblés pendant la boucle, complets une seule fois

- Pendant un cycle red → green : seulement le fichier de test concerné.
- Suite complète (`tests/api`, puis `tests/e2e`) : **une seule fois**, en fin d'US.
- Logique pure (parsing, tri, calcul) : seam unitaire `node:test` (`npm run test:unit`), sans build. API Playwright via le CLI pour les routes ; E2E seulement pour le comportement visible.
- Pas de mutation testing, sauf demande explicite.

## 3. Une US par session

Clore l'US (tests verts, commit, `current-task.md` à jour), puis recommander une nouvelle session. Ne pas enchaîner cadrage et plusieurs US dans la même conversation.

## 4. Économiser le contexte

- Lire des extraits ciblés (`grep -n`, plages de lignes), jamais de fichiers entiers volumineux ni de dossiers d'ADR complets.
- Filtrer les sorties de tests (`--reporter=line`, `tail`).

## 5. Seuil d'arrêt

Si une vérification demande plus de 3 tentatives ou un contournement : s'arrêter, résumer, demander.
