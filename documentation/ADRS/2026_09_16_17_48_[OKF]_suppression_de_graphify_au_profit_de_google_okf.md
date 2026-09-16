---
type: ADR
title: Suppression de graphify au profit de Google OKF
description: Le projet abandonne graphify et son graphe externe pour utiliser exclusivement la documentation native OKF, le MCP Living Documentation et le visualiseur de liens Markdown intégré.
tags:
  - okf
  - google-open-knowledge-format
  - graphify-retirement
  - documentation
  - mcp
  - concept-graph
status: To be validated
---

# Suppression de graphify au profit de Google OKF

## Contexte

L’adoption native de Google Open Knowledge Format a été décidée dans l’ADR du 8 juillet 2026. La migration a introduit les documents Markdown à frontmatter YAML, les index, le journal, le validateur, l’import et le visualiseur de concepts. Elle n’avait pas retiré l’ancien outillage graphify : consignes AGENTS, skill local, hook et graphe généré étaient encore présents et ont même été actualisés lors de la clôture du chantier.

L’utilisateur confirme le 16 septembre 2026 que cet outillage doit être supprimé au profit de l’approche OKF et que ce seul ADR doit en conserver l’explication dans la documentation courante.

## Décision

Supprimer du dépôt `graphify-out/`, `.codex/skills/graphify/`, le hook dédié `.codex/hooks.json`, les consignes graphify d’`AGENTS.md`, l’ancien document Blueprint et ses références dans les index, exemples MCP, journal, positions, clusters et métadonnées. Les agents n’ont plus à lancer graphify ni à régénérer ses artefacts.

Le chemin de travail retenu est la documentation native OKF consultée et maintenue par le MCP Living Documentation ; la lecture des sources complète la documentation quand nécessaire. `/graph` et `GET /api/graph` restent le visualiseur intégré : `buildConceptGraph` extrait les liens explicites du corps des documents avec `marked`, puis Svelte et vis-network les affichent. Cette fonctionnalité ne dépend pas de graphify.

Cette décision complète l’ADR d’adoption native d’OKF et celui du graphe T14 ; elle ne les remplace pas.

## Conséquences

- Une seule base documentaire à maintenir, sans graphe externe ni cache d’extraction à versionner.
- Les relations affichées proviennent des liens documentaires explicites. L’extraction AST et les relations sémantiques inférées propres à graphify ne sont pas reproduites par OKF.
- Les anciennes traces restent accessibles dans l’historique Git ; aucune réécriture de l’historique n’est effectuée.
- Le retrait concerne ce dépôt, sans désinstallation globale d’outils susceptibles d’être utilisés par d’autres projets.

## Vérifications

Nettoyage enregistré dans `bfd96ee9`. Recherche des références résiduelles dans le projet ; 24 tests unitaires réussis ; validation OKF sans erreur. Aucun code applicatif ni dépendance npm n’a dû être modifié pour retirer cet outillage.
