---
**date:** 2026-05-12
**status:** To be validated
**description:** Ajout du workflow MCP `retrodocument_adrs_from_git` + prompt `retrodocument-adrs-from-git` pour rebâtir rétroactivement des ADRs depuis l'historique git, en classant chaque commit par `state` factuel et en datant l'ADR créée depuis le commit d'origine via un nouveau paramètre `date` optionnel sur `create_document`.
**tags:** mcp, adr, retrodocumentation, git, history, retrodocument_adrs_from_git, prompt, create_document, date-override, supersede, add_metadata, god-files, source-files, playwright
---

# Retrodocumentation d'ADRs depuis l'historique git via MCP

## Contexte

Les workflows MCP existants (`create-adr`, `audit-adrs-drift`, `review-adr-relevance`) couvrent la création d'une ADR pour une feature en cours, l'audit batch de dérive et la revue ciblée d'une ADR. Aucun ne traite le cas symétrique : un projet déjà mature mais documenté de façon clairsemée, où des décisions architecturales durables ont été prises commit après commit sans qu'une ADR ne soit écrite.

Faire ce rattrapage à la main demanderait à un agent de :

- lire `git log` brut, trier les commits par date, filtrer le bruit (merges, version bumps, formatage) ;
- pour chaque commit, juger si le diff porte une décision durable ;
- récupérer la date du commit pour la frontmatter et le préfixe de fichier ;
- exclure les god files de l'attache `add_metadata` ;
- maintenir un inventaire interne des ADRs déjà créées pour superseder l'ancienne quand une décision plus récente l'invalide.

`create_document` produisait par ailleurs un nom de fichier au timestamp courant. Daté de `now`, un fichier retro-documenté apparaissait après des ADRs réelles plus anciennes, brisant l'ordre chronologique et le sens même de la jauge de fiabilité.

## Décision

Reprendre la même séparation tool factuel / prompt LLM que `review_adr_relevance`, et étendre `create_document` au minimum nécessaire pour permettre la rétrodatation.

1. un tool factuel `retrodocument_adrs_from_git({ limit, since })` ;
2. un prompt d'orchestration `retrodocument-adrs-from-git` ;
3. un paramètre optionnel `date` sur `create_document` (ISO 8601) qui pilote le préfixe daté du nom de fichier.

### Tool `retrodocument_adrs_from_git`

Le tool :

- exige que `sourceRoot` soit dans un working tree git ;
- accepte `limit` (défaut 100, plafond 200) et `since` optionnel (expression `git --since`) ;
- exécute `git log --reverse --name-status` via `execFileSync` (pas de shell, pas d'injection possible via `since`) ;
- retourne les commits **du plus ancien au plus récent** : `sha`, `shortSha`, `committerDate`, `authorDate`, `author`, `subject`, `body` (tronqué à 4096 caractères), `parents` ;
- pour chaque fichier touché : `path`, `changeType` (premier caractère de la sortie `--name-status`), `underSourceRoot`, `existsNow`, `godFileSuspect` ;
- calcule un `state` par commit :
    - `merge` si plus d'un parent ;
    - `trivial` si aucun fichier non supprimé, non-godFile et sous `sourceRoot` ;
    - `candidate` sinon ;
- agrège `stateCounts` pour permettre un court-circuit côté prompt.

La détection des god files est statique : `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `tsconfig.json`, `requirements.txt`, `Cargo.lock`, `Cargo.toml`, `go.sum`, `go.mod`, `pyproject.toml`, `composer.lock`, `composer.json`, `Gemfile.lock`, `Gemfile`. Le tool flague, il n'exclut pas.

Le tool ne décide rien sur le caractère durable d'un commit ni sur la supersession éventuelle d'une ADR.

### Paramètre `date` sur `create_document`

`create_document` accepte un argument optionnel `date` (ISO 8601, par exemple `2024-08-12` ou `2024-08-12T14:33:00Z`). Quand il est présent et valide, le préfixe horodaté du nom de fichier est dérivé de cette date au lieu de `new Date()`. Quand il est absent ou non parsable, le comportement antérieur est conservé : `now()`. Le contrat d'usage est limité à la rétrodocumentation — la description du tool précise explicitement de ne pas l'utiliser hors de ce contexte.

### Prompt `retrodocument-adrs-from-git`

Le prompt porte le workflow sémantique :

1. appeler `retrodocument_adrs_from_git({ limit, since })` ;
2. appeler `list_documents` puis lire les ADRs candidates à supersession (pour ne pas refaire l'inventaire à chaque commit) ;
3. parcourir les commits du plus ancien au plus récent ;
4. court-circuiter les commits `trivial` et `merge` sauf signal explicite dans le sujet ;
5. relire jusqu'à environ cinq fichiers candidats par commit via `read_source_file`, en ignorant les fichiers supprimés et les god files ;
6. juger si le commit porte une décision durable selon les critères de `PROJECT-INSTRUCTIONS.md` (frontière d'architecture, contrat public, format, protocole, workflow, convention) ;
7. décider d'un Outcome :
    - **A — Nouvelle ADR** : `create_document` avec `date` = `committerDate`, frontmatter dans laquelle `**date:**` reprend la même date, statut `To be validated`, puis `add_metadata` pour chaque fichier candidat (`underSourceRoot && !godFileSuspect && existsNow`), puis `refresh_metadata` ;
    - **B — Supersession + nouvelle ADR** : `read_document` puis `update_document` sur l'ADR obsolétée avec `**status:** SuperSeeded` et pointeur explicite vers la nouvelle ADR, puis exécuter l'Outcome A ;
    - **C — Skip** : commit non durable ou message trop pauvre ;
8. mettre à jour l'inventaire en mémoire après chaque Outcome A ou B pour permettre la supersession des ADRs créées plus tôt dans la même boucle ;
9. faire une pause après les trois premières ADRs créées puis par batches de cinq, en demandant à l'utilisateur de confirmer la poursuite ;
10. produire un rapport final : commits traités, ADRs créées, ADRs superseded, commits sautés, commits dont les fichiers source n'existent plus.

### Garde-fous

Les contraintes rappelées en clôture du prompt formalisent les invariants :

- la date vient toujours du commit, jamais de `now()` ;
- aucune ADR fabriquée à partir d'un commit dont le message ne permet pas d'écrire la `description:` ;
- `godFileSuspect` est un skip dur pour `add_metadata`, idem pour `existsNow === false` ;
- la supersession exige une note explicite `> Superseded by: ... (commit <shortSha>)` dans l'ADR ancienne et une référence réciproque dans la nouvelle ;
- l'ordre de parcours est strictement chronologique ascendant ;
- aucun passage automatique à `Accepted`.

## Conséquences

### PROS

- Le tool reste factuel et testable : il lit git, classifie, ne décide rien.
- Le prompt encode l'arbre de décision A/B/C avec les mêmes garde-fous redondants que `review-adr-relevance`, ce qui rend l'auto-invocation prévisible.
- L'ordre oldest-first reconstruit naturellement les chaînes de supersession dans le sens chronologique de l'historique.
- Le filtrage god-files et l'état `trivial` évitent que le LLM brûle des tokens sur des bumps de version ou des refactors mécaniques.
- Le paramètre `date` sur `create_document` est rétrocompatible : aucun appel existant ne change de comportement.
- Le tool refuse explicitement de tourner si `sourceRoot` n'est pas dans un working tree git, ce qui évite tout fallback silencieux.
- `since` est passé via `execFileSync` sans interprétation shell, donc pas de surface d'injection.

### CONS

- La pertinence des ADRs créées dépend de la qualité des messages de commit historiques. Sur un repo où les commits sont laconiques, la majorité des candidats seront skip (Outcome C).
- L'ADR datée du commit décrit l'intention historique, mais les fichiers attachés sont hashés sur leur contenu actuel. Si le code a dérivé depuis, l'ADR rétrodocumentée pourra apparaître immédiatement dégradée dans `list_adrs_below_accuracy`.
- La détection god-files est une whitelist statique. Un projet utilisant un manifest non listé devra attacher manuellement ou être ignoré au cas par cas.
- La taille des réponses du tool peut être conséquente : 100 commits × N fichiers peut atteindre plusieurs centaines de kilo-octets de JSON.
- Le tool dépend du binaire `git` sur le `PATH` du process serveur. Pas d'installation portable.

## Validation

- `npm run build`
- `npx playwright test tests/api/mcp.spec.ts --project=chromium`
- Smoke test direct : `node -e "..."` exécutant `toolRetrodocumentAdrsFromGit` sur ce repo, vérifiant le classement `candidate` / `trivial` / `merge` et l'ordre `--reverse`.
- Smoke test du `date` override sur `toolCreateDocument` : date ISO → préfixe correspondant ; date omise → date du jour ; date invalide → fallback gracieux sur `now`.
