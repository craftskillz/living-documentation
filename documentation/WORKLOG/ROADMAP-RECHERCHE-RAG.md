---
type: Worklog
title: ROADMAP — Recherche MiniSearch & RAG documentaire
description: Backlog de tickets pour remplacer la recherche par sous-chaîne par MiniSearch (BM25) et ajouter un RAG local, optionnel et à la demande, exposé aux agents via MCP, limité à la documentation.
tags:
  - roadmap
  - recherche
  - minisearch
  - bm25
  - rag
  - embeddings
  - mcp
  - backlog
timestamp: 2026-09-17T00:00:00Z
status: To be validated
---

# ROADMAP — Recherche MiniSearch & RAG documentaire

## Contexte

La recherche actuelle ([documents.ts](../../src/routes/documents.ts), route `GET /api/documents/search`) vérifie si la requête entière apparaît **telle quelle** dans le titre, la catégorie ou le contenu (`includes()` sans accents). Il n'y a ni découpage en mots, ni classement par pertinence. Le surlignage dans le document ([searchNotice.ts](../../src/frontend-svelte/src/lib/home/searchNotice.ts)) cherche lui aussi la requête exacte.

Côté MCP, les agents ont `search_source` pour le code, mais **aucun outil pour chercher dans la documentation** : ils doivent enchaîner `list_documents` puis `read_document` au hasard.

## Décisions déjà prises

1. **Deux chantiers indépendants** :
   - **Phase A** : la recherche de l'UI passe sur **MiniSearch** (classement BM25, préfixes, fautes de frappe) avec surlignage mot par mot.
   - **Phase B** : un **RAG** destiné aux LLM (Claude, Codex, agents du Workspace), exposé par un outil MCP. Il n'est **pas branché** sur la recherche de l'UI.
2. **Le RAG porte uniquement sur la documentation**, jamais sur le code source. Le code reste couvert par `search_source` / `read_source_file`. Les passages renvoyés peuvent **mentionner** les fichiers source liés via les métadonnées (chemins et accuracy), sans indexer leur contenu.
3. **Living Documentation ne génère pas de réponse.** Il renvoie des passages sourcés ; le LLM client rédige la réponse et cite les sources.
4. **Modèle d'embedding local, optionnel, activé à la demande.** Pas d'API distante. Tant que la fonctionnalité n'est pas activée : aucun téléchargement, aucun calcul.
5. **Pas de réindexation périodique.** L'index est mis à jour de façon incrémentale à l'enregistrement d'un document et vérifié juste avant chaque recherche. Un écran permet l'activation, l'indexation manuelle et le suivi de l'état.
6. **Pas de base vectorielle.** Stockage à plat sur disque et calcul de similarité en mémoire, suffisant pour quelques milliers de passages.
7. **Pas d'outil MCP de recherche par mots-clés séparé.** La navigation OKF (`index.md` avec descriptions) couvre l'exploration, et `search_knowledge` intègre déjà la recherche par mots-clés (BM25) dans sa recherche hybride.
8. **Tout ce qui est calculé vit hors du projet**, dans le cache utilisateur `~/.cache/.living-documentation/` : le modèle (partagé entre projets) et l'index de chaque projet. Rien n'est écrit dans le dossier de doc, rien ne peut être commité.
9. **L'écran RAG est un menu masquable de la barre du haut.**
10. **Une commande CLI permet d'activer, d'indexer et de consulter l'état du RAG** sans ouvrir l'UI.

## Glossaire

- **BM25** : formule classique de classement d'un moteur de recherche par mots-clés. Plus un document contient les mots de la requête, et plus ces mots sont rares dans l'ensemble de la doc, plus il est bien classé. Pas d'IA.
- **MiniSearch** : librairie Node/navigateur sans dépendance qui implémente un classement de type BM25, la recherche par préfixe et la tolérance aux fautes de frappe.
- **Passage (chunk)** : morceau d'un document, ici une section délimitée par ses titres. C'est l'unité que le RAG indexe et renvoie.
- **Embedding** : liste de nombres (vecteur) produite par un modèle, qui représente le sens d'un texte. Deux textes de sens proche ont des vecteurs proches, même avec des mots différents ou dans deux langues.
- **Modèle d'embedding** : petit réseau de neurones local (quelques dizaines à ~100 Mo) qui calcule ces vecteurs. Il ne génère pas de texte.
- **Similarité cosinus** : mesure de proximité entre deux vecteurs, utilisée pour trouver les passages les plus proches d'une question.
- **Recherche hybride / RRF** : combinaison de deux classements (mots-clés et sens). La *Reciprocal Rank Fusion* additionne `1 / (k + rang)` de chaque classement, sans avoir à comparer des scores d'échelles différentes.
- **Indexation incrémentale** : on garde une empreinte (hash) de chaque passage et on ne recalcule que ceux qui ont changé.

## Périmètre indexé (Phase B)

| Contenu | Indexé | Raison |
|---|---|---|
| Documents Markdown du dossier de doc (ADR, docs techniques, règles, worklogs, guides…) | Oui | Cœur du besoin |
| `extraFiles` (Markdown liés hors du dossier, ex. `README.md`) | Oui | Affichés comme documents dans l'app |
| Fichiers réservés OKF `index.md` / `log.md` | Non | Générés, redondants avec les documents |
| Diagrammes | Non (v1) | Peu de texte exploitable |
| Pièces jointes `files/`, images | Non | Hors Markdown |
| Code source du projet | **Jamais** | Couvert par `search_source` |

Le périmètre de la recherche UI (Phase A) reste celui d'aujourd'hui : tout ce que renvoie `listDocs`.

## Points tranchés (relecture du 17 septembre 2026)

1. **Emplacement de l'index RAG** : dossier utilisateur, `~/.cache/.living-documentation/projects/<empreinte du chemin>/rag/`. Voir B3.
2. **Emplacement du modèle** : `~/.cache/.living-documentation/models/`, partagé entre projets. Voir B2.
3. **Modèle par défaut** : `multilingual-e5-small` quantifié (FR + EN). Disponibilité ONNX, licence et qualité à vérifier au début de B2.
4. **Outil MCP `search_documents` par mots-clés** : abandonné (ancien ticket A3), redondant avec la navigation OKF et avec la partie BM25 de `search_knowledge`.
5. **Écran RAG** : menu masquable de la barre du haut. Voir B6.
6. **Commande CLI** : retenue. Voir B9.
7. **`search_knowledge` sans modèle activé** : **mode dégradé par mots-clés** (option b). L'outil est **toujours disponible** : sans modèle, il fait une recherche BM25 seule sur les passages, sans téléchargement ni fichier sur disque, et l'indique par `mode: "keyword"`. Cela rend le service de l'ancien A3 sans ajouter d'outil. B5 est découpé en conséquence : B5a (mode mots-clés, livrable tôt) et B5b (mode hybride).

Plus aucun point à trancher.

---

## Phase A — Recherche UI avec MiniSearch

### Ticket A1 — Moteur de recherche MiniSearch côté serveur

- **Objectif** : remplacer la recherche par sous-chaîne de `GET /api/documents/search` par un index MiniSearch classé par pertinence.
- **Zones** : nouveau module `src/lib/search/fulltext.ts` ; `src/routes/documents.ts` (route `/search`) ; `package.json` (dépendance `minisearch`, lock généré avec npm 10 via `just lock`).
- **Scope inclus** :
  - un document = une entrée d'index, champs `title`, `category`, `tags`, `description`, `content` (corps sans frontmatter, via `stripFrontmatter`) ;
  - poids renforcé pour `title` puis `tags`/`description` par rapport à `content` (constantes nommées, règle *no magic numbers*) ;
  - normalisation insensible à la casse et aux accents, identique à l'actuelle (NFD + suppression des diacritiques) ;
  - liste de mots vides FR + EN (« le », « de », « the », « of »…) ;
  - recherche par préfixe sur les termes, tolérance aux fautes limitée aux mots d'au moins 4 caractères (seuil et distance en constantes) ;
  - combinaison des termes en **ET** ; si aucun résultat, nouvelle tentative en **OU** ;
  - cycle de vie de l'index : construit à la première recherche, gardé en mémoire, reconstruit partiellement quand un fichier a changé (comparaison `mtime` + taille à chaque recherche, coût négligeable) ou a disparu ;
  - réponse enrichie, rétrocompatible : pour chaque résultat, `score`, `matchedTerms` (les mots **réellement** trouvés dans le document, y compris variantes par préfixe ou fautes corrigées) et `excerpt` centré sur le premier terme trouvé ;
  - résultats triés par score décroissant ;
  - le préfixe `metadata://<basename>` garde son comportement actuel, sans passer par MiniSearch.
- **Scope exclu** : surlignage frontend (A2), découpage en passages (B1).
- **Contrainte de conception** : le module doit pouvoir indexer d'autres unités que des documents entiers (passages, B3), avec les mêmes réglages de normalisation, mots vides, préfixes et fautes. Exposer une fabrique d'index configurable plutôt qu'un index figé sur les documents.
- **Acceptation** :
  - « migration svelte tests » trouve l'ADR de stabilisation e2e post-migration Svelte, en tête de liste ;
  - « migr » trouve les documents contenant « migration » ; « playwrigt » trouve ceux contenant « playwright » ;
  - « securite » trouve « sécurité » ;
  - un document modifié sur disque (hors app) est trouvé avec son nouveau contenu à la recherche suivante ;
  - la recherche `metadata://` fonctionne comme avant ;
  - tests unitaires du module (`tests/unit/`) et test API de la route (`tests/api/`).

### Ticket A2 — Résultats classés et surlignage mot par mot dans l'UI

- **Objectif** : afficher les résultats par pertinence et surligner chaque mot trouvé, dans l'extrait et dans le document ouvert.
- **Zones** : `src/frontend-svelte/src/routes/Home.svelte` (`onSearch`), `src/frontend-svelte/src/lib/home/api.ts`, `src/frontend-svelte/src/lib/home/searchNotice.ts` (`highlightMatches`), `src/frontend-svelte/src/lib/home/DocViewer.svelte`, catalogues `public/i18n/en.json` / `fr.json`.
- **Scope inclus** :
  - conserver l'affichage immédiat du filtrage local sur titre/catégorie, puis remplacer par les résultats serveur classés (comportement actuel à 350 ms) ;
  - surligner les `matchedTerms` dans l'extrait de chaque résultat ;
  - `highlightMatches` accepte une **liste de termes** et surligne chaque occurrence de chacun (insensible aux accents), au lieu de la requête entière ;
  - la barre « N correspondances » et la navigation entre correspondances continuent de fonctionner ;
  - tout nouveau texte visible passe par `t()` (règle i18n).
- **Scope exclu** : surlignage de section entière (spécifique au RAG, non prévu dans l'UI).
- **Acceptation** :
  - chercher « migration svelte » puis ouvrir un résultat surligne séparément « migration » et « svelte » ;
  - chercher « migr » surligne « migration » en entier ;
  - pas de régression sur la recherche locale dans le document (`localSearch.ts`) ;
  - tests e2e Playwright mis à jour ou ajoutés.
- **Dépend de** : A1.

### ~~Ticket A3 — Outil MCP `search_documents`~~ — abandonné

Redondant avec la navigation OKF (`index.md`) et avec la partie BM25 de `search_knowledge` (B5). Le besoin « recherche sans modèle » est traité par le point à trancher n° 7.

---

## Phase B — RAG documentaire à la demande

### Ticket B1 — Découpage des documents en passages

- **Objectif** : transformer chaque document en passages cohérents, chacun avec une ancre et une empreinte stable.
- **Zones** : nouveau module `src/lib/rag/chunker.ts`.
- **Scope inclus** :
  - frontmatter retiré du texte ; `title`, `type`, `status`, `tags` conservés en métadonnées du passage ;
  - découpage par titres H2/H3 ; un document sans titre = un seul passage ; l'introduction avant le premier titre = un passage ;
  - taille maximale par passage (en caractères, constante) : une section trop longue est redécoupée par paragraphes, avec un léger chevauchement (constante) ;
  - sections trop courtes fusionnées avec la suivante (seuil en constante) ;
  - texte envoyé au modèle préfixé du chemin de titres (« Titre du doc > Section > Sous-section ») pour donner le contexte ;
  - blocs de code conservés mais tronqués au-delà d'une taille (constante) ; blocs Mermaid et snippets spécifiques (kanban, compare) réduits à leur texte ;
  - **ancre identique à celle du viewer** : même règle que `wireContent.ts` (minuscules, suppression de `[^\w\s-]`, espaces → `-`). Extraire cette règle dans un module partagé (`src/shared/`) utilisé par le viewer et par le chunker, pour qu'elles ne divergent jamais ;
  - identifiant de passage stable (`docId#ancre#index`) et hash SHA-256 du texte du passage ;
  - version du découpeur (`CHUNKER_VERSION`) exposée : la changer invalide tout l'index.
- **Acceptation** : tests unitaires sur des documents réels (ADR court, doc long, doc sans titre, doc avec gros bloc de code) ; un lien `?doc=<id>#<ancre>` construit depuis un passage fait défiler le viewer jusqu'à la bonne section.

### Ticket B2 — Moteur d'embeddings local et optionnel

- **Objectif** : calculer des embeddings localement, sans rien imposer aux utilisateurs qui n'activent pas le RAG.
- **Zones** : nouveau module `src/lib/rag/embedder.ts` ; `package.json` (`optionalDependencies`) ; `src/lib/config.ts` (section `rag` dans `.living-doc.json`).
- **Scope inclus** :
  - dépendance **optionnelle** `@huggingface/transformers` (déjà présente transitivement via `kokoro-js`, v3.8.1 : aligner la version), import dynamique via `nativeImport` comme dans `src/lib/tts/adapters/kokoro.ts` ;
  - singleton chargé paresseusement, au premier besoin seulement ;
  - `isAvailable()` (dépendance installée ?), `isModelDownloaded()`, `download(onProgress)`, `embed(texts[], kind: "query" | "passage")` par lots (taille en constante) ;
  - gestion des préfixes attendus par le modèle (pour e5 : `query: ` / `passage: `), encapsulée dans l'adaptateur ;
  - vecteurs normalisés ;
  - dossier de cache du modèle configuré explicitement : `~/.cache/.living-documentation/models/` (transformers.js stocke sinon dans `node_modules`, perdu à chaque mise à jour et dupliqué par `npx`) ;
  - racine du cache calculée en un seul endroit (module `src/lib/rag/paths.ts`, partagé avec B3) : `path.join(os.homedir(), ".cache", ".living-documentation")`, fonctionne aussi sous Windows ; surcharge possible par variable d'environnement `LIVING_DOC_CACHE_DIR` (utile pour les tests et la CI) ;
  - config `.living-doc.json` : `rag.enabled` (défaut `false`), `rag.model` (défaut en constante) ; valeurs par défaut dans `STORAGE_DEFAULTS`, validation dans `src/routes/config.ts` ;
  - erreurs explicites et traduisibles : dépendance absente, téléchargement impossible (hors ligne), modèle corrompu.
- **Scope exclu** : stockage de l'index (B3), UI (B6).
- **Acceptation** :
  - sans la dépendance optionnelle, le projet build, démarre, et tout le reste fonctionne ;
  - `rag.enabled: false` → aucun import de transformers.js, aucun accès réseau ;
  - deux textes de même sens en FR et EN ont une similarité nettement supérieure à deux textes sans rapport (test d'intégration, ignoré si la dépendance est absente) ;
  - aucun appel réseau autre que le téléchargement du modèle.
- **Première étape du ticket** : vérifier que `multilingual-e5-small` existe en ONNX quantifié compatible transformers.js, sa licence et sa taille réelle ; tester sur 5 paires de questions/passages de `documentation/`. Si le résultat est mauvais, proposer une alternative avant de continuer.

### Ticket B3 — Index vectoriel sur disque et mise à jour incrémentale

- **Objectif** : stocker les embeddings, et ne recalculer que ce qui a changé.
- **Zones** : nouveau module `src/lib/rag/store.ts` et `src/lib/rag/indexer.ts`.
- **Scope inclus** :
  - emplacement : `~/.cache/.living-documentation/projects/<empreinte>/rag/`, où `<empreinte>` est un hash SHA-256 (tronqué, longueur en constante) du **chemin absolu résolu** du dossier de doc. Rien n'est écrit dans le projet : pas de risque de commit par `autoCommitAfterSave`, aucun impact sur `listDocs`, le validateur OKF, l'export ou le word cloud ;
  - fichier `project.json` à côté de l'index : chemin absolu du dossier de doc et date de dernière utilisation, pour qu'un humain s'y retrouve et pour détecter les index orphelins ;
  - conséquence assumée : déplacer ou renommer le dossier du projet crée une nouvelle empreinte, donc une réindexation complète ; l'ancien index devient orphelin (nettoyage dans B6 / B9) ;
  - format : `manifest.json` (id du modèle, dimension, `CHUNKER_VERSION`, date de dernière indexation, et par document : `mtime`, taille, hash, liste des passages avec leur hash et métadonnées) + fichier binaire `vectors.bin` (Float32) ;
  - chargement en mémoire au premier usage ;
  - indexation incrémentale : document inchangé (`mtime` + taille) → ignoré ; changé → redécoupage, seuls les passages dont le hash a changé sont recalculés ; document supprimé → passages retirés ;
  - changement de modèle ou de `CHUNKER_VERSION` → reconstruction complète ;
  - une seule indexation à la fois dans un processus (verrou en mémoire) ; les demandes concurrentes attendent la même promesse ;
  - une seule indexation à la fois **entre processus** (serveur lancé + commande CLI B9) : fichier verrou dans le dossier de l'index, contenant le PID et la date ; verrou d'un processus mort ou trop ancien (constante) considéré comme abandonné ; le serveur recharge l'index en mémoire quand le manifeste a été modifié par un autre processus ;
  - écriture atomique (fichier temporaire puis renommage) pour ne jamais laisser un index corrompu ;
  - progression exposée (documents traités / total, passages calculés) pour l'UI ;
  - l'index BM25 par passage n'est **pas** stocké ici : il vit en mémoire et appartient à B5a, car il doit exister même sans modèle. B3 lui fournit seulement les passages déjà découpés quand l'index vectoriel existe, pour éviter de découper deux fois.
- **Acceptation** :
  - indexation complète de `documentation/` réussie ; durée et taille de l'index relevées dans le worklog ;
  - modifier un document puis relancer ne recalcule que ses passages modifiés (vérifiable via la progression) ;
  - interrompre le processus pendant l'indexation laisse un index lisible (ancien ou nouveau) ;
  - `git status` reste propre après indexation, y compris avec l'intégration Git activée ;
  - deux projets différents ont deux index distincts, qui ne se mélangent pas ;
  - tests avec `LIVING_DOC_CACHE_DIR` pointant vers un dossier temporaire, jamais vers le vrai cache de l'utilisateur.
- **Dépend de** : B1, B2.

### Ticket B4 — Déclencheurs de mise à jour automatique

- **Objectif** : garder l'index à jour sans réindexation périodique.
- **Zones** : `src/routes/documents.ts` (création, enregistrement, renommage, suppression), `src/mcp/tools/documents.ts` (`create_document`, `update_document`), `src/lib/rag/indexer.ts`.
- **Scope inclus** (uniquement si `rag.enabled` et l'index existe déjà) :
  - après écriture, renommage ou suppression d'un document depuis l'app ou le MCP : réindexation de **ce seul document**, en arrière-plan, sans ralentir la réponse HTTP/MCP, regroupée (debounce en constante) si plusieurs écritures se suivent ;
  - **juste avant chaque recherche RAG** : vérification rapide des `mtime`/tailles pour détecter les changements faits hors de l'app (`git pull`, IDE, changement de branche), puis réindexation des documents concernés ;
  - si le nombre de documents à réindexer dépasse un seuil (constante), la recherche répond tout de suite avec l'index existant, lance la mise à jour en arrière-plan, et indique `indexStale: true` avec le nombre de documents en attente ;
  - si le RAG n'a jamais été indexé : aucune indexation implicite (le téléchargement et la première indexation restent une action explicite).
- **Acceptation** :
  - un document modifié via `update_document` est trouvé avec son nouveau contenu à la recherche suivante ;
  - un document modifié dans l'IDE est trouvé avec son nouveau contenu à la recherche suivante ;
  - un `git checkout` qui change 50 documents ne bloque pas la recherche et renvoie `indexStale: true` ;
  - RAG désactivé → aucun déclencheur actif, aucun coût.
- **Dépend de** : B3.

### Ticket B5a — Outil MCP `search_knowledge` en mode mots-clés

- **Objectif** : livrer l'outil `search_knowledge` complet (contrat, sources, dérive) avec une recherche BM25 sur les passages, **sans modèle**. C'est le mode utilisé tant que le RAG n'est pas activé, et le socle du mode hybride (B5b).
- **Zones** : nouveau module `src/lib/rag/search.ts` et `src/lib/rag/keywordIndex.ts` ; `src/mcp/tools/knowledge.ts` (nouveau) ; déclaration et `switch` dans `src/mcp/server.ts` ; guide serveur (`get_server_guide`) ; `src/lib/metadata.ts` (lecture des bindings et de l'accuracy).
- **Scope inclus** :
  - **index BM25 par passage, en mémoire uniquement** : passages de B1, index de A1 (fabrique configurable), construit à la première recherche, jamais écrit sur disque, **indépendant de `rag.enabled`** ;
  - fraîcheur : vérification `mtime` + taille avant chaque recherche, redécoupage et réindexation des seuls documents changés, supprimés ou ajoutés (coût faible, pas de modèle) ;
  - paramètres : `query` (obligatoire), `limit` (défaut et maximum en constantes), filtres optionnels `type`, `folder`, `tags`, `status` ;
  - regroupement : au plus N passages par document (constante), pour éviter qu'un seul long document monopolise les résultats ;
  - **prise en compte de la dérive** : chaque passage porte l'accuracy de son document et la liste des fichiers source liés (chemins seulement). Sous un seuil d'accuracy (constante), le passage est **signalé** (`possiblyOutdated: true`) et légèrement déclassé, jamais masqué ;
  - **contrat de réponse commun aux deux modes** :
    - niveau réponse : `mode` (`"keyword"` ou `"hybrid"`), `modeReason` quand `mode = "keyword"` (`"rag_disabled"`, `"dependency_missing"`, `"model_missing"`, `"not_indexed"`, `"indexing_in_progress"`, `"embedding_failed"`), `hint` (texte court : comment activer la recherche par sens via le menu RAG ou `living-ai-documentation rag enable`), `indexStale`, `pendingDocuments` ;
    - par passage : `docId`, `title`, `type`, `status`, `sectionPath` (« Titre > Section »), `anchor`, `link` (`?doc=<id>#<ancre>`), `text`, `score`, `matchedTerms`, `accuracy`, `possiblyOutdated`, `sources` (chemins liés) ;
  - description de l'outil et guide serveur :
    - demander explicitement au LLM de **citer les sources** (titre + lien) et de signaler les passages `possiblyOutdated` ;
    - expliquer qu'en `mode: "keyword"` la recherche dépend des mots employés : reformuler avec des termes probables de la doc (noms techniques, synonymes, FR et EN) si les résultats sont pauvres ;
    - ne pas demander au LLM d'activer le RAG lui-même : le `hint` est destiné à l'utilisateur ;
  - dans ce ticket, `mode` vaut toujours `"keyword"` ; le branchement vers `"hybrid"` arrive avec B5b.
- **Scope exclu** : embeddings, génération de réponse côté serveur.
- **Acceptation** :
  - sans la dépendance optionnelle ni aucun cache, l'outil répond avec `mode: "keyword"`, `modeReason: "dependency_missing"` et un `hint` ;
  - une question contenant un terme exact (`add_metadata`, nom de fichier) trouve le passage qui le contient ;
  - le `link` d'un passage ouvre le document à la bonne section dans le viewer ;
  - un document modifié dans l'IDE est trouvé avec son nouveau contenu à la recherche suivante ;
  - un ADR à accuracy faible est marqué `possiblyOutdated` ;
  - aucun fichier créé dans `~/.cache/.living-documentation/` ni dans le projet ;
  - Claude Code, via le MCP, répond à une question en citant les liens renvoyés ;
  - test API sur `/mcp`.
- **Dépend de** : A1, B1.

### Ticket B5b — Mode hybride de `search_knowledge`

- **Objectif** : quand le RAG est activé et indexé, combiner recherche par sens et par mots-clés dans `search_knowledge`, sans changer le contrat de réponse.
- **Zones** : `src/lib/rag/search.ts`, `src/mcp/tools/knowledge.ts`.
- **Scope inclus** :
  - choix du mode à chaque appel : `"hybrid"` si dépendance installée, `rag.enabled`, modèle présent et index vectoriel existant ; sinon `"keyword"` avec le `modeReason` correspondant ;
  - première indexation en cours : `"keyword"` avec `modeReason: "indexing_in_progress"` ; mises à jour incrémentales ensuite (B4) : `"hybrid"` sur l'index existant avec `indexStale` ;
  - recherche vectorielle : embedding de la question (`kind: "query"`), similarité cosinus sur tous les passages, top-N (constante) ;
  - recherche BM25 : index mémoire de B5a ;
  - fusion RRF des deux classements (constante `k`), puis regroupement par document et prise en compte de la dérive, identiques à B5a ;
  - échec du calcul d'embedding à l'exécution (modèle corrompu, mémoire) : repli sur `"keyword"` avec `modeReason: "embedding_failed"`, erreur journalisée côté serveur, jamais d'échec de l'outil ;
  - filtres appliqués avant la fusion, pour que `limit` soit respecté.
- **Acceptation** :
  - jeu d'au moins 10 questions réelles écrites en langage naturel (FR et EN) sur `documentation/`, avec le document attendu : le document attendu apparaît dans les 5 premiers résultats pour au moins 8 questions en mode hybride ; **même jeu passé en mode mots-clés** pour mesurer l'apport ; jeu et résultats consignés dans le worklog ;
  - une question FR trouve un passage rédigé en EN et inversement ;
  - une question contenant un terme exact trouve toujours le passage qui le contient ;
  - désactiver le RAG (`rag disable`) fait repasser l'outil en `mode: "keyword"` sans redémarrage ;
  - test API sur `/mcp` avec la dépendance.
- **Dépend de** : B5a, B3, B4.

### Ticket B6 — Écran d'administration du RAG

- **Objectif** : activer, indexer, suivre et nettoyer le RAG depuis l'interface.
- **Zones** : nouveau routeur `src/routes/rag.ts` (monté sur `/api/rag` dans `src/server.ts`) ; nouvelle route front `/rag` dans `src/frontend-svelte/src/routes/` ; `src/shared/headerNavigation.ts` (`OPTIONAL_HEADER_MENUS`) ; `src/lib/cli/headerMenuPrompt.ts` (sélection à l'installation) ; section de visibilité des menus dans Admin ; catalogues i18n.
- **Scope inclus** :
  - **API** :
    - `GET /api/rag/status` : dépendance installée, modèle téléchargé (nom, taille), RAG activé, nombre de documents et de passages indexés, date de dernière indexation, documents en attente, indexation en cours et progression ;
    - `POST /api/rag/enable` : télécharge le modèle (avec progression) puis active `rag.enabled` ;
    - `POST /api/rag/index` : indexation incrémentale ; `?full=true` : reconstruction complète ;
    - `DELETE /api/rag/index` : supprime l'index ;
    - `DELETE /api/rag/model` : supprime le modèle téléchargé et désactive le RAG ;
    - `POST /api/rag/disable` : désactive sans rien supprimer ;
    - progression suivie par polling de `/status` (intervalle en constante) ;
  - **Menu** :
    - entrée `/rag` ajoutée à `OPTIONAL_HEADER_MENUS`, donc masquable comme Blueprint, Graph, Survival Kit, AI Context et Word Cloud ;
    - même convention que les autres menus optionnels : proposée dans le sélecteur de menus à l'installation (masquée par défaut en installation non interactive) et réglable dans Admin ;
    - la visibilité du menu est indépendante de l'activation : masquer le menu ne désactive pas le RAG ;
  - **Page `/rag`** :
    - état lisible : « Non installé », « Désactivé », « Modèle non téléchargé », « Non indexé », « À jour », « N documents en attente », « Indexation en cours (x / y) » ;
    - bouton **Activer** avec confirmation indiquant la taille du téléchargement ;
    - boutons **Indexer maintenant**, **Reconstruire l'index**, **Supprimer l'index**, **Supprimer le modèle**, **Désactiver** ;
    - barre de progression pendant téléchargement et indexation ;
    - si la dépendance optionnelle est absente : message expliquant comment l'installer ;
    - emplacement du cache affiché (dossier du modèle, dossier de l'index du projet, tailles) ;
    - nombre et taille des **index orphelins** (projets dont le dossier n'existe plus), avec un bouton **Nettoyer** ;
    - indication quand une indexation est en cours depuis la CLI (verrou détenu par un autre processus) ;
    - tous les textes via `t()` en EN et FR.
- **Acceptation** :
  - le menu RAG apparaît, se masque et se réaffiche depuis Admin, et est proposé dans le sélecteur à l'installation ;
  - parcours complet depuis un projet neuf : activer → téléchargement → indexation → état « À jour » ;
  - modifier un document hors app → l'état affiche « 1 document en attente » ;
  - supprimer l'index puis le modèle libère l'espace disque ;
  - tests API des routes et test e2e du parcours principal (téléchargement simulé ou modèle de test léger, pour ne pas télécharger en CI).
- **Dépend de** : B3 (B5 pour tester de bout en bout).

### Ticket B7 — Sources affichées dans les agents du Workspace

- **Objectif** : afficher de façon fiable les sources utilisées par un agent du Workspace, sans dépendre de ce que le LLM a écrit.
- **Zones** : `src/routes/workspace.ts` (événements `tool_call` / `tool_result`, document de run d'agent), `src/frontend-svelte/src/lib/workspace/app.ts`, `src/frontend-svelte/src/lib/workspace/persistence.ts`, `src/frontend-svelte/src/lib/AgentsMenu.svelte`, catalogues i18n.
- **Scope inclus** :
  - quand un agent appelle `search_knowledge` (ou `read_document`), collecter les documents renvoyés depuis les `tool_result` ;
  - afficher sous la réponse finale une section **Sources** : titre, section, lien cliquable vers `?doc=<id>#<ancre>`, badge « peut-être obsolète » si `possiblyOutdated` ;
  - dédoublonner par document et section ;
  - inclure cette section dans le document de run d'agent généré ;
  - rappel : un agent n'a accès qu'aux outils nommés dans son prompt système, documenter qu'il faut y nommer `search_knowledge`.
- **Acceptation** : un agent dont le prompt nomme `search_knowledge` affiche la liste des sources consultées, même si sa réponse texte n'en cite aucune ; test sur le flux d'événements.
- **Dépend de** : B5.

### Ticket B8 — Documentation

- **Objectif** : documenter la recherche et le RAG pour les utilisateurs et pour les agents.
- **Livrables** :
  - ADR(s) de décision à la fin de chaque phase (recherche MiniSearch ; RAG local à la demande et limité à la documentation), sources attachées avec `add_metadata` ;
  - l'ADR existant [recherche insensible aux accents](?doc=ADRS%252F2026_06_06_16_17_%255BSEARCH%255D_accentinsensitive_search_across_global_api_and_indocument_highlight) passé en `Partially SuperSeeded` (la normalisation des accents est conservée, le matching et le surlignage changent) ;
  - guide utilisateur : mise à jour de `2_guide/…_recherche_plein_texte.md`, nouveau guide « Activer et utiliser le RAG » ;
  - `PROJECT-STACK.md` (MiniSearch, dépendance optionnelle transformers.js, modules `src/lib/search/` et `src/lib/rag/`) ;
  - `PROJECT-USEFUL-COMMANDS.md` (commandes `rag` de B9, tests associés) ;
  - `README.md` (et `npm run check:readme-sync`), dont l'emplacement du cache `~/.cache/.living-documentation/` ;
  - guide serveur MCP (`get_server_guide`) : quand utiliser `search_knowledge` (question sur la doc), la navigation `index.md` (exploration), `search_source` (code).
- **Acceptation** : `npm run okf:validate` sans erreur ; documents alignés avec le code et métadonnées rafraîchies.
- **Dépend de** : fin de la phase concernée.

### Ticket B9 — Commande CLI `rag`

- **Objectif** : activer, indexer et diagnostiquer le RAG depuis le terminal, sans ouvrir l'UI (préparation d'un poste, scripts, gros changement de branche).
- **Zones** : `bin/cli.ts` (nouvelle commande `commander`, sur le modèle de `migrate`, `validate`, `import`) ; réutilise `src/lib/rag/` (B2, B3) ; aide `--help` et bloc d'aide générale de `cli.ts`.
- **Scope inclus** :
  - `living-ai-documentation rag status [dossier]` : dépendance installée, modèle téléchargé, RAG activé, documents / passages indexés, documents en attente, dernière indexation, emplacements et tailles du cache ;
  - `living-ai-documentation rag enable [dossier]` : télécharge le modèle avec progression dans le terminal, puis écrit `rag.enabled: true` dans `.living-doc.json` ;
  - `living-ai-documentation rag index [dossier] [--full]` : indexation incrémentale, ou reconstruction complète avec `--full` ; progression affichée ;
  - `living-ai-documentation rag disable [dossier]` : `rag.enabled: false`, sans rien supprimer ;
  - `living-ai-documentation rag clear [dossier] [--model] [--orphans]` : supprime l'index du projet ; `--model` supprime aussi le modèle ; `--orphans` supprime les index des projets dont le dossier n'existe plus ;
  - `[dossier]` suit la même résolution que les autres commandes (défaut et chemins relatifs) ;
  - fonctionne **serveur lancé ou non** : verrou inter-processus de B3 ; si une indexation est déjà en cours, message clair et code de sortie non nul ;
  - codes de sortie : `0` succès ; non nul si dépendance absente, RAG non activé (`index` propose `rag enable`), téléchargement impossible, verrou détenu ;
  - `rag index` sur un RAG non activé ne télécharge **jamais** implicitement ;
  - messages actionnables (commande exacte à lancer ensuite).
- **Scope exclu** : planification (cron) ; la CLI ne fait qu'une exécution à la demande.
- **Acceptation** :
  - `rag enable` puis `rag index` sur `documentation/` produit le même index que l'écran B6 ;
  - lancer `rag index` pendant que le serveur tourne : le serveur voit le nouvel index sans redémarrage ;
  - lancer deux `rag index` en même temps : le second échoue proprement ;
  - sans la dépendance optionnelle : `rag status` l'indique, les autres sous-commandes échouent avec un message d'installation ;
  - tests CLI avec `LIVING_DOC_CACHE_DIR` temporaire et téléchargement simulé.
- **Dépend de** : B3.

---

## Hors périmètre

- Indexation du code source, des diagrammes et des pièces jointes.
- API d'embeddings distante (OpenAI, Voyage…).
- Génération de réponses côté serveur.
- Réindexation périodique par minuterie.
- Base de données vectorielle.
- RAG branché sur la barre de recherche de l'UI.
- Outil MCP séparé de recherche par mots-clés (ancien A3).
- Fichier d'index ou de modèle écrit dans le dossier du projet.

## Ordre recommandé

Convention : `[ ]` non démarré, `[x] ~~Ticket XX - ...~~` terminé. À chaque ticket terminé : cocher ici et créer un document `documentation/WORKLOG/AAAA_MM_JJ_HH_mm_[WORKLOG]_ticket_XX_<slug>.md`.

- [ ] Ticket A1 - Moteur de recherche MiniSearch côté serveur
- [ ] Ticket A2 - Résultats classés et surlignage mot par mot dans l'UI
- [x] ~~Ticket A3 - Outil MCP `search_documents`~~ (abandonné à la relecture)
- [ ] Ticket B8 (partiel) - ADR et guides de la phase A
- [ ] Ticket B1 - Découpage des documents en passages
- [ ] Ticket B5a - Outil MCP `search_knowledge` en mode mots-clés
- [ ] Ticket B2 - Moteur d'embeddings local et optionnel
- [ ] Ticket B3 - Index vectoriel sur disque et mise à jour incrémentale
- [ ] Ticket B9 - Commande CLI `rag`
- [ ] Ticket B4 - Déclencheurs de mise à jour automatique
- [ ] Ticket B5b - Mode hybride de `search_knowledge`
- [ ] Ticket B6 - Menu et page RAG
- [ ] Ticket B7 - Sources affichées dans les agents du Workspace
- [ ] Ticket B8 - ADR et guides de la phase B

B5a passe juste après B1 : les agents ont une recherche dans la doc sans modèle, avant tout le travail sur les embeddings. B9 passe avant B4-B6 : la CLI permet d'activer et d'indexer dès B3, donc de tester B5b sans attendre l'UI.

## Jalons

- **M1 — Recherche UI pertinente** : A1, A2.
- **M2 — Agents capables de chercher dans la doc, sans modèle** : B1, B5a.
- **M3 — Recherche par sens utilisable depuis le terminal** : B2, B3, B9, B4, B5b.
- **M4 — RAG complet** : B6, B7, B8.
