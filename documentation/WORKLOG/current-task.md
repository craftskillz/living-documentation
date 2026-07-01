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
- `src/lib/git-integration.ts`
- `src/frontend-svelte/public/i18n/en.json`
- `src/frontend-svelte/public/i18n/fr.json`
- `tests/api/git.spec.ts`
- `README.fr.md`
- `images/DOCUMENTATION/*`
- `documentation/WORKLOG/current-task.md`

## Documentation

Le document `Plan.md` est un document de pilotage documentaire utilisateur, pas un ADR technique. Il ne decrit pas une decision de code durable et n'a pas besoin de metadonnees source.

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
- `git diff --check` execute avec succes.
- `npm run build` execute avec succes et recopie les starters dans `dist/`.

## Verifications restantes

- Relire les fichiers de Phase 1 et Phase 2.
- Produire ensuite les guides d'usage quotidien et d'administration prioritaires.
- Capturer les premiers ecrans reels de l'application quand l'interface de demo est prete.
- Verifier le contenu source de `2026_06_30_10_20_[DOCUMENTATION]_document_markdown.md`, qui porte un nom Markdown mais contient actuellement le guide Workspace.

## Prochaine action recommandee

Produire les guides prioritaires de Phase 3 : Admin, Git et Versions, puis notes de reunion et processus.
