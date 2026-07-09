---
type: Worklog
title: Ticket 08 - Bundle-relative link resolution in the viewer
description: Réalisation du Ticket 08 — le viewer résout les liens Markdown bundle-relatifs OKF (/ADRS/x.md, ./x.md) vers un doc id ; ?doc= reste la forme in-app et l'export émet déjà du .md relatif.
tags:
  - worklog
  - ticket-08
  - okf
  - links
  - bundle-relative
  - wireContent
timestamp: 2026-07-09T01:37:00Z
status: To Be Validated
---

# Ticket 08 — Liens bundle-relatifs ↔ `?doc=`

## Contexte
Le viewer doit ouvrir les liens OKF **bundle-relatifs** (`/chemin.md`, `./x.md`)
en plus des liens internes `?doc=<id>`. Voir `documentation/WORKLOG/ROADMAP.md`.

## Réalisation
- `src/frontend-svelte/src/lib/home/wireContent.ts` :
  - nouvelle fonction pure **`resolveBundleMdLink(href, currentDocId)`** → `{ id, anchor }` : gère `/ADRS/x.md` (bundle-absolu), `./x.md` / `../g/x.md` / `x.md` (relatifs au dossier du doc courant via `docId`), normalise `.`/`..`, ignore les non-`.md` et les liens externes (schéma) ; l'id = `encodeURIComponent(relPath sans .md)` (même convention que les doc ids) ;
  - un handler qui intercepte ces liens `.md` et appelle `onDocLink(id, anchor)` (comme les `?doc=`).
- **Export** : `export.ts` réécrit déjà `[..](?doc=…)` → `.md` relatif — l'émetteur bundle-relatif existe, réutilisé.
- `?doc=` reste la forme d'écriture in-app (décision T01).

## Vérifications
- Logique validée en standalone : `/ADRS/2026_x.md`→`ADRS%2F2026_x`, `./x.md` (courant `ADRS/a`)→`ADRS%2Fx`, `../AI/y.md#sec`→`AI%2Fy`+ancre ; externes / non-`.md` / `#ancre` → ignorés.
- `npm run build` OK.

## Suites
- Pas d'ADR dédié (implémente la stratégie de liens figée en T01). Code frontend `wireContent.ts` à committer.
- L'export émet un `.md` relatif à la structure d'export (groupes) ; à revoir si un export « bundle strict » est requis (hors scope T08).

## Documents liés
- [Audit T01 (stratégie de liens)](?doc=AI%252F2026_07_08_19_22_%255BOKF%255D_okf_v01_conformance_audit_and_frozen_field_mapping_ticket_01)
- Backlog : `documentation/WORKLOG/ROADMAP.md`
