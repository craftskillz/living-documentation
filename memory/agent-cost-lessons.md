# Leçons de coût des sessions agent

## Incident du 13/10/2026 — US1 et US2 de ROADMAP-EXPLORATEUR

Deux US ont consommé une session entière, jugée inacceptable par l'utilisateur en temps et en coût.

Causes, par ordre d'impact :

1. **Environnement inadapté** : session cloud reliée au Mac par un shell en VM Linux, alors que `node_modules` ne contenait que des binaires macOS. Vite, Biome et Chromium indisponibles ; l'agent a contourné (archive du dépôt, `npm ci` dans le cloud, Chromium d'une autre version, CDN bloqués remplacés par des stubs, comparaison avec le front d'origine). Plus de la moitié du coût.
2. **Session trop longue** : cadrage + US1 + US2 dans une seule conversation ; le contexte accumulé renchérit chaque appel.
3. **Suites complètes relancées plusieurs fois** (API ~2 min 30, E2E ~6 min) au lieu de tests ciblés.
4. **Mutation testing manuel** (3 fois), non demandé.

Les tests n'étaient pas flaky ; Playwright via le vrai CLI reste adapté au TDD.

Règle qui en découle : `documentation/AI/rules/cost-efficient-agent-workflow.md`, importée par `CLAUDE.md`.
