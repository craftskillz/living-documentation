---
type: Worklog
title: Ticket 14 - Concept graph visualizer
description: "Réalisation du Ticket 14 (bonus) — visualiseur graphe des concepts : endpoint /api/graph déterministe (nœuds = concepts, arêtes = liens réels du bundle) + route front /graph rendue avec vis-network, nœuds colorés par type, clic → ouverture du doc."
tags:
  - worklog
  - ticket-14
  - okf
  - graph
  - visualizer
  - vis-network
  - frontend
timestamp: 2026-07-11T08:29:00Z
status: To Be Validated
---

# Ticket 14 — Visualiseur graphe de concepts (bonus)

## Réalisation
- **Backend** `src/lib/okf/graph.ts` : `buildConceptGraph(docsPath)` (déterministe, read-only). Nœuds = un par concept `.md` (`{id, title, type, folder}`, réservés/symlinks/`.git|node_modules|dist` exclus). Arêtes = liens réels du corps résolus vers des concepts connus : forme bundle-relative (`/x.md`, `./x.md`, `../g/x.md`) via la logique portée de `resolveBundleMdLink` (T08), **et** forme in-app `?doc=<id>`. Liens externes/ancres/images ignorés, arêtes vers concept inconnu + self-links + doublons éliminés.
- **Endpoint** `src/routes/graph.ts` : `GET /api/graph` → `{nodes, edges}`. Enregistré dans `server.ts` (+ `/graph` ajouté aux routes SPA).
- **Front** `src/frontend-svelte/src/routes/ConceptGraph.svelte` (route `/graph`) : fetch `/api/graph`, rendu **vis-network** (global UMD chargé dans `index.html`), physics forceAtlas2Based, nœuds colorés par type + légende + compteurs, clic nœud → `/?doc=<id>`. Entrée « Graph » dans la `Topbar`, clés i18n `graph.*` (en/fr).

## Bug corrigé (encodage `?doc=`)
Les liens `?doc=` canoniques (`linkHref`) sont **doublement encodés** (`encodeURIComponent(docId)` où `docId=encodeURIComponent(relPath)`). Un seul `decodeURIComponent` redonne l'id de nœud — le code ré-encodait (→ id faux). Symptôme : 6 arêtes seulement. Après correctif : **84 arêtes / 73 nœuds connectés** sur le bundle réel.

## Vérifications
- `npm run build` OK ; `npm run test:unit` **23/23** (2 nouveaux graphe : nœuds/arêtes + drop externes/inconnus ; résolution relative + dédup). `lint:ci` exit 0.
- Serveur build neuf sur 4399 : `GET /api/graph` → 267 nœuds / 84 arêtes ; `GET /graph` → 200 (SPA).
- Rendu visuel **validé par l'utilisateur** (graphe force-directed, couleurs par type, clic → doc). _(Vérif navigateur automatisée indispo : extension Chrome déconnectée.)_

## Vigilance / suites
- `src/server.ts` a changé (route + SPA) → rebaseliner les ADR liées (PROJECT-STACK, blueprint `[SRC]_src`). ADR d'implémentation **T14** → bindings `src/lib/okf/graph.ts` + `src/routes/graph.ts`.
- Améliorations possibles : filtre par type, recherche/focus nœud, mise en avant du doc courant, liens `?doc=` mono-encodés legacy (non gérés — canonique = double).

## Documents liés
- [ADR liens bundle-relatifs (T08)](?doc=WORKLOG%252F2026_07_10_01_37_%255BWORKLOG%255D_ticket_08_bundlerelative_links)
- Backlog : `documentation/WORKLOG/ROADMAP.md`
