---
type: Worklog
title: US4a — Supprimer la nomenclature (backend)
description: Le nom de fichier n'est plus qu'un identifiant — titre et date viennent du frontmatter, les nouveaux documents sont nommés par slug, le champ category et les clés filenamePattern / sidebarSort / exclusiveCategoryExpansion disparaissent.
tags:
  - worklog
  - us
  - explorateur
  - nomenclature
  - parser
status: To Be Validated
---

# US4a — Supprimer la nomenclature (backend)

## Décisions utilisateur

- `category` supprimé complètement des réponses API et MCP.
- Nommage par slug partout : UI, MCP `create_document`, runs d'agents du workspace, Blueprint.
- US4 découpée : US4a (backend, cette session), US4b (frontend).

## Réalisé

- `src/lib/parser.ts` : `parseDocMetadata(filename, content)` (titre = frontmatter `title`, date = frontmatter `timestamp`), `readDocMetadata`, `titleFromFilename` (repli : ignore un préfixe historique `YYYY_MM_DD[_HH_mm]_[X]_`, casse « Title Case » conservée), `docSlug`, `uniqueDocFilename` (`mon-guide.md`, puis `-2`, `-3`).
- `normalizeFrontmatter` accepte un `timestamp` par défaut, posé seulement s'il manque : création UI et MCP (l'argument `date` de rétrodocumentation devient le `timestamp`).
- Config : clés retirées du type et des défauts, purgées au démarrage comme `docsFolder` (fichier réécrit), ignorées par `PUT /api/config`.
- `POST /api/documents` : plus de 409 sur collision de nom ; paramètre optionnel `name` (radical du fichier indépendant du titre).
- Blueprint : `GET /api/blueprint/blueprint-adr?folder=<nom>` ; document `001_BLUEPRINT/<slug>.md`, les anciens `…_[NOM]_….md` restent trouvés.
- Détection d'ADR MCP : `type: ADR` du frontmatter remplace la catégorie.
- Guide et schéma MCP : `category` retiré (`create_document` n'exige plus que `title`).
- Front, minimum pour ne pas casser : recherche, sélection du document suivant après suppression, document ouvert par défaut (premier document à la racine), pastille catégorie du viewer, Export, kanban, Blueprint `AdrModal`.
- Tests : `tests/unit/doc-metadata.test.ts`, `tests/api/blueprint-doc.spec.ts`, test de config réécrit ; tests du parser à pattern et fixtures `parser-*` supprimés.
- `documentation/.living-doc.json` : les trois clés ont été purgées par la migration.

## Vérifications

- `npm run build` OK, `npx biome lint src tests` sans erreur.
- Unitaires 43/43, `tests/api` 212/212.
- `tests/e2e` complet : 100/111 au premier passage (titres et noms attendus à l'ancienne) ; après correction, les 4 fichiers concernés passent (29/29).

## Suite

US4b (frontend) dans une nouvelle session. Les starters contiennent encore les clés retirées (purgées au premier démarrage) : à traiter en US9.

MCP Living Documentation non exposé dans la session : documentation écrite à la main, pas de métadonnées attachées.
