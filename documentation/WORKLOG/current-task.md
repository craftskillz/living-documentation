---
**date:** 2026-06-30
**status:** In progress
**description:** Production de la documentation utilisateur professionnelle pour Living Documentation comme atelier documentaire et laboratoire agentique.
**tags:** worklog, documentation, user-manual, product-docs, notes, process, agents, plan, assets, nano-banana-pro, markdown
---

# Current task

## Statut courant

In progress

## Tache realisee

Creation du plan documentaire utilisateur professionnel, puis production de la Phase 1.

Le travail a couvert :

- lecture des instructions projet, de la stack, des commandes utiles, de la memoire, des regles IA et du worklog courant ;
- inspection de `usermanual-documentation/` pour identifier les contenus reutilisables ;
- inspection du README public, des routes frontend et des ADR recentes afin d'inclure les surfaces produit actuelles ;
- creation de `documentation/DOCUMENTATION/Plan.md` ;
- definition d'une architecture documentaire cible fondee sur les parcours produit, et non sur Diataxis comme contrainte structurante ;
- maintien de Diataxis comme exemple methodologique possible dans un document de comprehension ;
- elargissement du positionnement : Living Documentation n'est pas un generateur de code ni seulement un outil d'ADR/documentation de code, mais un atelier de generation, maintenance, versioning et automatisation de documentation ;
- ajout des cas d'usage notes de reunion, processus, schemas, plans de travail, runs d'agents et laboratoire d'automatisation agentique ;
- definition des standards de redaction par type de document ;
- definition d'une strategie visuelle ;
- ajout de prompts exacts Nano Banana Pro pour les visuels conceptuels ;
- definition d'un backlog de production par phases ;
- creation des pages d'accueil utilisateur dans `documentation/DOCUMENTATION/00_ACCUEIL/` ;
- creation des fichiers d'assets dans `documentation/DOCUMENTATION/90_ASSETS/` ;
- extraction des prompts Nano Banana Pro dans un fichier dedie ;
- creation d'un backlog de captures d'ecran a produire ;
- integration des images conceptuelles generees dans les pages d'accueil ;
- creation d'un index des assets visuels ;
- creation des trois guides de demarrage de Phase 2.
- ajout des documents utilisateur finalises dans le starter francais `starter-doc-fr/000_DOCUMENTATION/` ;
- ajout dans `starter-doc-fr/images/DOCUMENTATION/` des images referencees par ces documents pour conserver l'affichage apres initialisation via `npx living-ai-documentation`.
- creation de la version anglaise du starter dans `starter-doc/000_DOCUMENTATION/` avec noms de fichiers traduits ;
- copie des images du starter francais vers `starter-doc/images/DOCUMENTATION/`.
- ajustement de l'ouverture par defaut de Home pour privilegier la categorie `DOCUMENTATION` avant `General`.
- ajout d'une ancre Admin `#git-integration` et redirection des toasts Git vers cette section.
- remplacement de `docsFolder` par le chemin reel du dossier documentaire configure dans les messages Git destines aux utilisateurs.
- refonte de `README.fr.md` pour mettre en avant les usages les plus attractifs : documentation local-first, Git/Versions, Workspace, Agents, MCP, diagrammes et automatisation agentique.
- copie d'assets visuels de documentation dans `images/DOCUMENTATION/` pour le README public.
- traduction anglaise de `README.fr.md` vers `README.md` avec la meme structure produit.
- correction du lien image Agents dans `README.fr.md` vers `./images/DOCUMENTATION/execution_d_agents.png`.
- ajout d'une detection CLI sans argument des projets Living Documentation existants via `.living-doc.json` dans le dossier courant puis dans les sous-dossiers directs.
- ajout de confirmations terminal pour lancer un projet detecte avant de retomber sur le wizard d'initialisation.
- ajout de l'initialisation automatique du dossier explicite lorsqu'il ne contient pas encore `.living-doc.json`.
- correction des workflows CodeQL pour utiliser la meme version `github/codeql-action` entre `init` et `analyze`.
- tache ponctuelle : reorganisation de la popup snippets avec renommage de `Colonnes` en `Disposition`, deplacement des listes et du tableau dans `Structure`, deplacement de `Comparaison` dans `Code & diagrammes`, et renommage de la categorie `Listes, code & donnees` en `Code & diagrammes`.
- tache ponctuelle : ajout du snippet `Mermaid` dans `Code & diagrammes`, avec un builder `PIE CHART` permettant de definir un titre et des elements ponderes, puis de generer un bloc Markdown `mermaid` compatible avec le rendu existant.
- tache ponctuelle : ajout de la regle de builder `PIE CHART` imposant que le total des elements ponderes ne depasse jamais 100, appliquee dans l'UI et dans le builder Markdown.
- tache ponctuelle : remplacement de l'exemple Mermaid inspire de la documentation par un exemple original localise (`DOC WORKFLOW` en anglais, `CYCLE DOCUMENTAIRE` en francais), avec consigne de creer de nouveaux exemples originaux a partir des exemples fournis.
- tache ponctuelle : ajout du type `TIMELINE` dans le builder Mermaid, avec edition dynamique d'un titre et d'evenements periodises, generation du bloc Markdown `timeline`, et exemple original de roadmap documentaire.
- tache ponctuelle : ajout du type `TREE VIEW` dans le builder Mermaid, avec edition dynamique des niveaux, noeuds, decorateurs et notes, generation du bloc Markdown `treeView-beta`, et exemple original d'espace documentaire.
- tache ponctuelle : ajout du type `SEQUENCE DIAGRAM` dans le builder Mermaid, avec edition dynamique des messages, fleches, participants et notes, generation du bloc Markdown `sequenceDiagram`, et exemple original de workflow documentaire.
- tache ponctuelle : diagnostic et correction du chargement lent du snippet `Kanban`, cause par un reload global des documents, counts et statuts apres la creation paresseuse des dossiers de colonnes ; le board utilise maintenant l'etat `home.allDocs` deja charge et met a jour localement les documents apres creation/deplacement de cartes.
- tache ponctuelle : simplification de l'entete des documents `Kanban` pour masquer les actions documentaires ordinaires (`Ecouter`, `Marqueur`, `Exporter PDF`, `Metadonnees`, `Versions`, `Modifier`, `TOC`, copie d'id et jauge metadata) et ne garder que `Supprimer`.
- tache ponctuelle : definition du format de creation des items Kanban (`# Title`, description courte, section `## Content`) et affichage de la description tronquee sur les cartes du board.
- tache ponctuelle : ajout de couleurs configurables pour les colonnes Kanban, avec correction de l'edition du snippet pour ne plus afficher `[object Object]` dans la definition ni dans l'apercu Markdown.

## Contenu modifie

- `documentation/DOCUMENTATION/Plan.md`
- `documentation/DOCUMENTATION/00_ACCUEIL/00_index.md`
- `documentation/DOCUMENTATION/00_ACCUEIL/01_living_documentation_en_bref.md`
- `documentation/DOCUMENTATION/00_ACCUEIL/02_parcours_recommandes.md`
- `documentation/DOCUMENTATION/90_ASSETS/charte_visuelle.md`
- `documentation/DOCUMENTATION/90_ASSETS/index.md`
- `documentation/DOCUMENTATION/90_ASSETS/screenshots_a_capturer.md`
- `documentation/DOCUMENTATION/90_ASSETS/prompts_images.md`
- `documentation/DOCUMENTATION/90_ASSETS/images/*`
- `documentation/DOCUMENTATION/01_DEMARRAGE/01_creer_un_espace_documentaire.md`
- `documentation/DOCUMENTATION/01_DEMARRAGE/02_creer_modifier_et_retrouver_un_document.md`
- `documentation/DOCUMENTATION/01_DEMARRAGE/03_structurer_dossiers_categories_et_documents.md`
- `starter-doc-fr/000_DOCUMENTATION/*`
- `starter-doc-fr/images/DOCUMENTATION/*`
- `starter-doc/000_DOCUMENTATION/*`
- `starter-doc/images/DOCUMENTATION/*`
- `src/frontend-svelte/src/routes/Home.svelte`
- `src/frontend-svelte/src/routes/Admin.svelte`
- `src/frontend-svelte/src/lib/gitToast.ts`
- `src/frontend-svelte/src/styles/app.css`
- `src/frontend-svelte/src/lib/home/SnippetsModal.svelte`
- `src/frontend-svelte/src/lib/home/snippets/pickerData.ts`
- `src/frontend-svelte/src/lib/home/snippets/builders.ts`
- `src/frontend-svelte/src/lib/home/kanban.ts`
- `src/frontend-svelte/src/lib/home/DocViewer.svelte`
- `src/frontend-svelte/src/lib/home/wireContent.ts`
- `src/frontend-svelte/src/lib/home/EditableMarkdown.svelte`
- `src/frontend-svelte/src/lib/home/state.svelte.ts`
- `src/lib/git-integration.ts`
- `src/frontend-svelte/public/i18n/en.json`
- `src/frontend-svelte/public/i18n/fr.json`
- `tests/api/git.spec.ts`
- `tests/e2e/inline-snippet-edit.spec.ts`
- `tests/api/documents-move.spec.ts`
- `tests/e2e/kanban.spec.ts`
- `tests/fixtures/with-kanban/testdocs/3_projets/Doing/2026_01_07_10_00_[Task]_task_two.md`
- `README.fr.md`
- `README.md`
- `bin/cli.ts`
- `tests/api/cli.spec.ts`
- `.github/workflows/codeql.yml`
- `.github/workflows/publish.yml`
- `images/DOCUMENTATION/*`
- `documentation/WORKLOG/current-task.md`

## Documentation

Le document `Plan.md` est un document de pilotage documentaire utilisateur, pas un ADR technique. Il ne decrit pas une decision de code durable et n'a pas besoin de metadonnees source.

La reorganisation de la popup snippets demandee ici est un ajustement UX de libelles et de categorie, sans changement de contrat Markdown ni decision d'architecture durable ; aucun nouvel ADR n'a ete cree.

Le snippet Mermaid ajoute un comportement utilisateur durable. Un ADR devra etre cree et attache aux fichiers source concernes quand l'arbre Git sera propre, conformement a la regle projet sur les metadonnees Living Documentation.

Les exemples Mermaid par defaut du builder ne reprennent pas textuellement les exemples fournis par l'utilisateur ou par la documentation Mermaid ; ils sont transformes en exemples originaux et localises.

Le type `TIMELINE` reprend uniquement la forme syntaxique de l'exemple Mermaid fourni ; l'exemple integre au produit porte sur une roadmap documentaire originale.

Le type `TREE VIEW` reprend uniquement la forme syntaxique de l'exemple Mermaid fourni ; l'exemple integre au produit porte sur une arborescence documentaire originale.

Le type `SEQUENCE DIAGRAM` reprend uniquement la forme syntaxique de l'exemple Mermaid fourni ; l'exemple integre au produit porte sur un workflow documentaire original.

Le snippet `Kanban` ajoute un comportement utilisateur durable : un marqueur de document transforme le rendu complet en board, les colonnes correspondent a des dossiers, et les deplacements de cartes deplacent les documents Markdown entre dossiers. Un ADR devra etre cree et attache aux fichiers source concernes quand l'arbre Git sera propre, conformement a la regle projet sur les metadonnees Living Documentation.

Les documents `Kanban` ne se comportent pas comme des documents Markdown ordinaires dans le viewer : leur entete masque les actions de lecture, annotation, export, metadonnees, versions, edition globale et TOC. L'edition des colonnes reste une action propre au board, exposee dans le rendu Kanban, tandis que l'action de suppression du document conteneur reste disponible.

Les items crees depuis une colonne Kanban sont des documents Markdown initialises avec un titre H1, une description courte, puis une section `## Content`. Le board lit la description situee entre le H1 et `## Content`, la normalise sur une ligne et la tronque sur la carte si elle est trop longue.

Les colonnes Kanban conservent leurs libelles dans `data-columns` et leurs couleurs dans l'attribut parallele `data-colors`. Les anciens snippets sans `data-colors` restent valides : le parser applique une palette par defaut par index (`sky`, `amber`, `emerald`, puis `rose`, `violet`, `slate`). La modal d'edition expose des lignes structurees label + couleur afin d'eviter toute serialisation implicite d'objets JavaScript dans le Markdown.

## Verifications realisees

- Creation du plan cible demandee par l'utilisateur.
- Creation des premiers livrables de Phase 1.
- Integration des 12 images conceptuelles deposees par l'utilisateur.
- Creation des livrables de Phase 2.
- Copie des documents utilisateur finalises dans `starter-doc-fr/000_DOCUMENTATION/`.
- Copie et regroupement des images referencees dans `starter-doc-fr/images/DOCUMENTATION/`.
- Correction des liens Markdown du starter francais vers `/images/DOCUMENTATION/...`.
- Copie des images du starter francais vers le starter anglais.
- Traduction anglaise des documents du starter francais avec noms de fichiers anglais.
- Home ouvre maintenant par defaut le premier document de categorie `DOCUMENTATION`, puis retombe sur `General` ou le premier document disponible.
- Les toasts Git qui pointent vers Admin utilisent maintenant `/admin#git-integration`; Admin scrolle vers cette ancre au montage et aux changements de hash.
- Les messages Git n'exposent plus `docsFolder` comme terme technique lorsque le chemin reel est disponible.
- Test API ajoute pour verifier le message Git lorsque le dossier documentaire configure n'est pas dans un repository Git.
- README francais restructure avec une entree produit plus concise et plus commerciale, puis une suite technique compacte.
- Liens images du README francais verifies localement.
- README anglais synchronise avec le README francais.
- Contrat bilingue README verifie avec `./scripts/check-readme-sync.sh HEAD`.
- `git diff --check` execute avec succes.
- `npm run build` execute avec succes et recopie les starters dans `dist/`.
- Tests CLI ajoutes pour le lancement sans argument depuis un dossier courant deja configure et depuis un sous-dossier direct deja configure.
- Test CLI ajoute pour `npx living-ai-documentation ./doc -p <port>` lorsque `./doc/.living-doc.json` n'existe pas encore.
- `npm run build` reexecute avec succes apres ajout de la detection CLI `.living-doc.json`.
- `npx playwright test tests/api/cli.spec.ts --project=chromium` execute avec succes : 17 tests passes.
- `./scripts/check-readme-sync.sh HEAD` reexecute avec succes apres mise a jour des README.
- `git diff --check -- bin/cli.ts tests/api/cli.spec.ts README.md README.fr.md documentation/AI/PROJECT-USEFUL-COMMANDS.md documentation/WORKLOG/current-task.md` execute avec succes.
- `graphify update .` execute avec succes apres modification du code.
- Workflows CodeQL corriges pour eviter le mismatch `init v4.36.2` / `analyze v4.36.1` dans la pipeline.
- `npm run build` execute avec succes apres reorganisation de la popup snippets.
- `git diff --check -- src/frontend-svelte/src/lib/home/snippets/pickerData.ts src/frontend-svelte/src/lib/home/SnippetsModal.svelte src/frontend-svelte/public/i18n/fr.json src/frontend-svelte/public/i18n/en.json` execute avec succes.
- `graphify update .` execute avec succes apres reorganisation de la popup snippets.
- `npm run build` execute avec succes apres deplacement de `Comparaison` vers `Code & diagrammes`.
- `git diff --check -- src/frontend-svelte/src/lib/home/snippets/pickerData.ts src/frontend-svelte/src/lib/home/SnippetsModal.svelte src/frontend-svelte/public/i18n/fr.json src/frontend-svelte/public/i18n/en.json` execute avec succes apres deplacement de `Comparaison`.
- `graphify update .` execute avec succes apres deplacement de `Comparaison`.
- `npm run build` execute avec succes apres ajout du builder Mermaid.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "Mermaid picker builds and inserts a pie chart snippet" --project=chromium` execute avec succes : 1 test passe.
- `git diff --check -- src/frontend-svelte/src/lib/home/snippets/pickerData.ts src/frontend-svelte/src/lib/home/snippets/builders.ts src/frontend-svelte/src/lib/home/SnippetsModal.svelte src/frontend-svelte/public/i18n/fr.json src/frontend-svelte/public/i18n/en.json tests/e2e/inline-snippet-edit.spec.ts` execute avec succes.
- `graphify update .` execute avec succes apres ajout du builder Mermaid.
- `npm run build` execute avec succes apres ajout de la limite totale 100 du pie chart Mermaid.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "Mermaid picker builds and inserts a pie chart snippet" --project=chromium` execute avec succes apres ajout de la limite : 1 test passe.
- `git diff --check -- src/frontend-svelte/src/lib/home/SnippetsModal.svelte src/frontend-svelte/src/lib/home/snippets/builders.ts tests/e2e/inline-snippet-edit.spec.ts` execute avec succes.
- `graphify update .` execute avec succes apres ajout de la limite totale 100 du pie chart Mermaid.
- `npm run build` execute avec succes apres remplacement de l'exemple Mermaid par defaut.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "Mermaid picker builds and inserts a pie chart snippet" --project=chromium` execute avec succes apres remplacement de l'exemple : 1 test passe.
- `rg -n "NETFLIX|Time spent looking|Time spent watching|Time spent sleeping" src/frontend-svelte dist tests -g '!node_modules'` ne retourne aucune occurrence.
- `git diff --check -- src/frontend-svelte/src/lib/home/SnippetsModal.svelte src/frontend-svelte/src/lib/home/snippets/builders.ts src/frontend-svelte/src/lib/home/snippets/pickerData.ts src/frontend-svelte/public/i18n/fr.json src/frontend-svelte/public/i18n/en.json tests/e2e/inline-snippet-edit.spec.ts` execute avec succes apres remplacement de l'exemple.
- `graphify update .` execute avec succes apres remplacement de l'exemple Mermaid.
- `npm run build` execute avec succes apres ajout du type Mermaid `TIMELINE`.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "Mermaid picker builds and inserts" --project=chromium` execute avec succes apres ajout de `TIMELINE` : 2 tests passes.
- `rg -n "History of Social Media Platform|LinkedIn|Facebook|YouTube|Twitter|Google" src/frontend-svelte tests dist -g '!node_modules'` ne retourne aucune occurrence de l'exemple Mermaid fourni ; seules les chaines admin LinkedIn existantes restent presentes.
- `git diff --check -- src/frontend-svelte/src/lib/home/SnippetsModal.svelte src/frontend-svelte/src/lib/home/snippets/builders.ts src/frontend-svelte/public/i18n/fr.json src/frontend-svelte/public/i18n/en.json tests/e2e/inline-snippet-edit.spec.ts` execute avec succes apres ajout de `TIMELINE`.
- `graphify update .` execute avec succes apres ajout de `TIMELINE`.
- `npm run build` execute avec succes apres ajout du type Mermaid `TREE VIEW`.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "Mermaid picker builds and inserts" --project=chromium` execute avec succes apres ajout de `TREE VIEW` : 3 tests passes.
- `rg -n "my-project|App\\.tsx|index\\.js|environment variables|Dockerfile|package\\.json|main component|entry point" src/frontend-svelte tests dist -g '!node_modules'` ne retourne aucune occurrence de l'exemple Mermaid fourni dans les sources frontend ou les tests ; seules des chaines existantes de documentation/dist restent presentes.
- `git diff --check -- src/frontend-svelte/src/lib/home/SnippetsModal.svelte src/frontend-svelte/src/lib/home/snippets/builders.ts src/frontend-svelte/public/i18n/fr.json src/frontend-svelte/public/i18n/en.json tests/e2e/inline-snippet-edit.spec.ts` execute avec succes apres ajout de `TREE VIEW`.
- `graphify update .` execute avec succes apres ajout de `TREE VIEW`.
- `npm run build` execute avec succes apres ajout du type Mermaid `SEQUENCE DIAGRAM`.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "Mermaid picker builds and inserts" --project=chromium` execute avec succes apres ajout de `SEQUENCE DIAGRAM` : 4 tests passes.
- `rg -n "Alice|Bob|John|Hello Bob|How about you John|I am good thanks|Checking with John" src/frontend-svelte tests dist -g '!node_modules'` ne retourne aucune occurrence de l'exemple Mermaid fourni.
- `git diff --check -- src/frontend-svelte/src/lib/home/SnippetsModal.svelte src/frontend-svelte/src/lib/home/snippets/builders.ts src/frontend-svelte/public/i18n/fr.json src/frontend-svelte/public/i18n/en.json tests/e2e/inline-snippet-edit.spec.ts documentation/WORKLOG/current-task.md` execute avec succes apres ajout de `SEQUENCE DIAGRAM`.
- `graphify update .` execute avec succes apres ajout de `SEQUENCE DIAGRAM`.
- `npm run build` execute avec succes apres correction du chargement initial du board Kanban.
- `npx playwright test tests/api/documents-move.spec.ts tests/e2e/kanban.spec.ts --project=chromium` execute avec succes apres correction Kanban : 14 tests passes.
- Test E2E ajoute pour verifier que le rendu initial Kanban ne relance pas les agregats globaux `/api/documents/file-counts` et `/api/documents/statuses`.
- `git diff --check -- src/frontend-svelte/src/lib/home/kanban.ts src/frontend-svelte/src/lib/home/wireContent.ts src/frontend-svelte/src/lib/home/EditableMarkdown.svelte src/frontend-svelte/src/lib/home/state.svelte.ts src/frontend-svelte/src/routes/Home.svelte tests/e2e/kanban.spec.ts` execute avec succes.
- `graphify update .` execute avec succes apres correction Kanban.
- `npm run build` execute avec succes apres masquage des actions d'entete pour les documents Kanban.
- `npx playwright test tests/api/documents-move.spec.ts tests/e2e/kanban.spec.ts --project=chromium` execute avec succes apres simplification de l'entete Kanban : 15 tests passes.
- Test E2E ajoute pour verifier que l'entete d'un document Kanban ne garde que `Supprimer`, et que les documents de cartes ouverts ensuite gardent leurs actions normales.
- `git diff --check -- src/frontend-svelte/src/lib/home/DocViewer.svelte tests/e2e/kanban.spec.ts` execute avec succes.
- `graphify update .` execute avec succes apres simplification de l'entete Kanban.
- `npm run build` execute avec succes apres ajout du format Markdown par defaut des items Kanban et de l'affichage des descriptions.
- `npx playwright test tests/api/documents.spec.ts tests/api/documents-move.spec.ts tests/e2e/kanban.spec.ts --project=chromium` execute avec succes apres ajout des descriptions Kanban : 34 tests passes.
- Test E2E ajoute pour verifier qu'une carte existante affiche sa description et qu'un item cree depuis le board ecrit le squelette Markdown attendu.
- `git diff --check -- src/frontend-svelte/src/lib/home/kanban.ts src/routes/documents.ts tests/e2e/kanban.spec.ts tests/fixtures/with-kanban/testdocs/3_projets/Doing/2026_01_07_10_00_[Task]_task_two.md` execute avec succes.
- `graphify update .` execute avec succes apres ajout des descriptions Kanban.
- `npm run build` execute avec succes apres correction de l'edition des couleurs de colonnes Kanban.
- `npx playwright test tests/e2e/kanban.spec.ts --project=chromium` execute avec succes apres correction de l'edition Kanban : 8 tests passes.
- Tests E2E ajoutes pour verifier que la modal Kanban affiche les libelles et couleurs, ne contient pas `[object Object]`, sauvegarde `data-colors`, et que la creation depuis le picker utilise les libelles/couleurs par defaut.
- `git diff --check` execute avec succes apres correction de l'edition Kanban.

## Verifications restantes

- Relire les fichiers de Phase 1 et Phase 2.
- Produire ensuite les guides d'usage quotidien et d'administration prioritaires.
- Capturer les premiers ecrans reels de l'application quand l'interface de demo est prete.
- Verifier le contenu source de `2026_06_30_10_20_[DOCUMENTATION]_document_markdown.md`, qui porte un nom Markdown mais contient actuellement le guide Workspace.
- Creer l'ADR du snippet Mermaid et attacher les fichiers source concernes apres retour a un arbre Git propre.
- Creer l'ADR du snippet Kanban et attacher les fichiers source concernes apres retour a un arbre Git propre.

## Prochaine action recommandee

Produire les guides prioritaires de Phase 3 : Admin, Git et Versions, puis notes de reunion et processus.
