---
**date:** 2026-06-29
**status:** Completed
**description:** Les pièces jointes sont désormais stockées sous files/<dossier-du-document> et la page Files filtre les fichiers par dossiers réels sous files/.
**tags:** worklog, files, attachments, folder-filter, svelte, api, playwright, graphify
---

# Current task

## Statut courant

Completed

## Tache realisee

La page `/files` et le stockage des pièces jointes ont été alignés sur l'organisation des documents.

Le flux retenu est :

- les uploads de pièces jointes depuis un document envoient le `documentId` courant à `POST /api/files/upload` ;
- le serveur dérive le dossier cible depuis le chemin du document et écrit le fichier dans `files/<chemin-des-dossiers-du-document>/` ;
- les uploads sans `documentId` restent compatibles et continuent d'écrire à la racine `files/` ;
- `GET /api/files` liste maintenant récursivement `files/**` et retourne aussi les dossiers disponibles ;
- la page `/files` affiche un filtre basé sur les dossiers réels sous `files/` ;
- sans filtre, tous les fichiers sont visibles ;
- avec un filtre, les fichiers du dossier choisi et de ses descendants restent visibles.

## Contenu modifie

- Extension de `src/routes/files.ts` : listing récursif, chemins relatifs sûrs, stockage par dossier de document, remplacement/suppression de fichiers nested.
- Extension de `EditableMarkdown.svelte` et `SnippetsModal.svelte` pour transmettre le `documentId` lors de l'upload.
- Extension de `Files.svelte` avec filtre de dossier et affichage du dossier de chaque fichier.
- Ajout des traductions EN/FR pour le filtre Files.
- Ajout de tests API pour les pièces jointes nested.
- Ajout d'un test E2E pour le filtre de la page `/files`.

## Fichiers concernes

- `src/routes/files.ts`
- `src/frontend-svelte/src/lib/home/EditableMarkdown.svelte`
- `src/frontend-svelte/src/lib/home/SnippetsModal.svelte`
- `src/frontend-svelte/src/routes/Files.svelte`
- `src/frontend-svelte/public/i18n/en.json`
- `src/frontend-svelte/public/i18n/fr.json`
- `tests/api/files.spec.ts`
- `tests/e2e/files.spec.ts`
- `graphify-out/*`

## Verifications realisees

- `npm run build` : OK.
- `npx playwright test tests/api/files.spec.ts --project=chromium` : OK, 11 tests passes.
- `npx playwright test tests/e2e/files.spec.ts --project=chromium` : OK, 1 test passe.
- `graphify update .` : OK.
- `git diff --check` : OK.

## Limites connues

- Les fichiers deja presents historiquement a la racine `files/` restent listés et visibles sans filtre ; ils ne sont pas migrés automatiquement.
- Un upload sans `documentId` reste stocké à la racine pour conserver la compatibilité API.
- Aucun ADR n'a ete cree pendant cette passe : la creation d'un ADR avec metadata doit etre faite apres commit ou validation explicite, car les hashes Living Documentation sur arbre sale seraient marques approximatifs.

## Prochaine action recommandee

Valider manuellement le flux dans l'UI : ouvrir un document dans un sous-dossier, coller une pièce jointe, puis vérifier `/files` avec les filtres de dossier. Après commit de la feature, créer l'ADR durable et attacher les fichiers source concernés via metadata.
