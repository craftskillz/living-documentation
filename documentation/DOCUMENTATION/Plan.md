---
**date:** 2026-06-30
**status:** Draft
**description:** Plan de production d'une documentation utilisateur professionnelle pour Living Documentation comme atelier documentaire local et laboratoire d'automatisation agentique.
**tags:** documentation, user-manual, product-docs, notes, process, agents, onboarding, guides, reference, visual-assets, nano-banana-pro
---

# Plan documentaire utilisateur

## Objectif

Produire une documentation utilisateur professionnelle pour Living Documentation, en Markdown, dans `documentation/DOCUMENTATION/`.

Cette documentation doit aider un utilisateur final a comprendre rapidement :

- a quoi sert Living Documentation ;
- comment demarrer et configurer un espace documentaire ;
- comment creer, organiser, enrichir, versionner et restaurer des documents, notes, schemas et processus ;
- comment utiliser les fonctions avancees : diagrammes, fichiers, snippets, Git, Workspace, agents, MCP, generation d'images ;
- comment diagnostiquer les erreurs courantes.

Le dossier `usermanual-documentation/` sert de base de recherche, pas de cible finale. Il contient de bons elements sur les premiers tutoriels, les dossiers/categories, les snippets, la recherche, l'export, les diagrammes et Diataxis. Ces contenus doivent etre repris avec discernement : Diataxis peut etre cite comme exemple d'organisation documentaire, mais ne doit pas devenir la structure obligatoire de Living Documentation.

## Positionnement editorial

### Promesse produit

Living Documentation est un atelier local de production documentaire en Markdown. Il sert a documenter du code, mais aussi des reunions, des decisions, des processus, des schemas, des plans de travail, des runs d'agents et des supports d'equipe.

Ce n'est pas un outil de generation de code. C'est un outil de generation, de maintenance, de versioning et d'automatisation de documentation. Avec Workspace, MCP, les providers LLM et les tools internes, il devient aussi un laboratoire d'automatisation agentique appliquee a la documentation.

La documentation produite reste locale, lisible, versionnable dans Git, exportable, enrichissable par fichiers/images/diagrammes, et verifiable par metadonnees quand elle decrit du code ou des artefacts sources.

La documentation utilisateur doit eviter le ton "demo technique". Elle doit parler comme un produit mature :

- phrases courtes ;
- vocabulaire stable ;
- parcours orientes taches ;
- captures et visuels utiles ;
- prerequis explicites ;
- erreurs courantes traitees sans jargon inutile.

### Publics cibles

| Public | Besoin principal | Documents prioritaires |
| --- | --- | --- |
| Createur de documentation | Creer vite des documents, notes et supports propres | Demarrage, edition, snippets, images, fichiers |
| Developpeur solo | Garder notes, ADR, schemas et documentation de code au meme endroit | Quick start, recherche, Git, metadata, diagrammes |
| Tech lead | Structurer une base documentaire d'equipe et ses processus | Organisation, reunions, decisions, process, Git |
| Equipe avec agents IA | Automatiser des taches documentaires avec LLM, MCP et agents | MCP, Workspace, agents, image providers, run documents |
| Mainteneur documentation | Publier, exporter, restaurer, diagnostiquer | Export, Versions, Files, Admin, Troubleshooting |
| Utilisateur avance | Experimenter des workflows agentiques et visuels | Blueprint, Workspace, providers image, Shape Editor |

## Principes de structure produit

La documentation finale doit suivre les parcours reels du produit, pas une methode documentaire imposee.

Les grandes sections retenues sont :

- **Accueil** : comprendre rapidement la valeur, les parcours et les points d'entree.
- **Demarrage** : installer, lancer, creer les premiers contenus.
- **Usage quotidien** : ecrire, organiser, rechercher, enrichir, schematiser et exporter.
- **Automatisation IA** : MCP, Workspace, agents, providers LLM et images.
- **Administration et exploitation** : configuration, Git, versions, fichiers, depannage.
- **Reference** : commandes, champs, formats, limites et comportements exacts.

Diataxis reste utile comme conseil methodologique pour les equipes qui veulent structurer leur propre documentation, mais ce n'est plus l'ossature du manuel utilisateur.

Regle : un document doit avoir une intention principale claire. Il peut melanger quelques elements d'explication et de procedure si cela sert le parcours utilisateur, mais il ne doit pas devenir un fourre-tout.

## Architecture cible

```text
documentation/DOCUMENTATION/
├── Plan.md
├── 00_ACCUEIL/
│   ├── 00_index.md
│   ├── 01_living_documentation_en_bref.md
│   └── 02_parcours_recommandes.md
├── 01_DEMARRAGE/
│   ├── 01_creer_un_espace_documentaire.md
│   ├── 02_creer_modifier_et_retrouver_un_document.md
│   └── 03_structurer_dossiers_categories_et_documents.md
├── 02_USAGE_QUOTIDIEN/
│   ├── organiser_une_documentation_projet.md
│   ├── prendre_des_notes_de_reunion.md
│   ├── documenter_un_processus.md
│   ├── configurer_l_application_dans_admin.md
│   ├── utiliser_les_snippets_les_images_et_les_fichiers.md
│   ├── creer_et_lier_un_diagramme.md
│   └── exporter_et_partager_la_documentation.md
├── 03_AUTOMATISATION_IA/
│   ├── connecter_un_client_mcp.md
│   ├── creer_un_premier_adr_assiste_par_ia.md
│   ├── configurer_un_workspace_llm.md
│   ├── executer_un_agent_workspace.md
│   ├── generer_une_image_depuis_un_agent.md
│   └── comprendre_tools_chat_only_et_providers_image.md
├── 04_ADMINISTRATION/
│   ├── configurer_l_application_dans_admin.md
│   ├── utiliser_git_et_les_versions.md
│   ├── restaurer_un_bloc_depuis_une_version_git.md
│   ├── gerer_les_fichiers_et_images_ai.md
│   └── depanner_les_erreurs_courantes.md
├── 05_COMPRENDRE/
│   ├── living_documentation_comme_atelier_documentaire.md
│   ├── documentation_vivante.md
│   ├── markdown_local_et_git.md
│   ├── notes_reunions_process_et_documentation_de_code.md
│   ├── adr_cycle_de_vie_et_validation.md
│   ├── metadonnees_et_fiabilite_documentaire.md
│   ├── mcp_et_agents_ia.md
│   ├── diagrammes_comme_vues_derivees.md
│   ├── workspace_agents_llm_et_providers_image.md
│   └── organiser_sa_documentation_avec_ou_sans_diataxis.md
├── 06_REFERENCE/
│   ├── commandes_cli.md
│   ├── configuration_living_doc_json.md
│   ├── pattern_de_nommage.md
│   ├── navigation_recherche_et_ancres.md
│   ├── snippets_markdown.md
│   ├── fichiers_images_et_images_ai.md
│   ├── parametres_admin.md
│   ├── outils_et_prompts_mcp.md
│   ├── champs_workspace.md
│   ├── integration_git.md
│   └── depannage.md
└── 90_ASSETS/
    ├── prompts_images.md
    ├── screenshots_a_capturer.md
    └── charte_visuelle.md
```

## Inventaire de reprise depuis l'existant

| Source existante | Reprise recommandee |
| --- | --- |
| `usermanual-documentation/2026_04_11_12_55_[GENERAL]_premiers_pas.md` | Reprendre l'idee de parcours debutant, mais la transformer en demarrage produit progressif. |
| `usermanual-documentation/3_concept/...diataxis...md` | Reprendre comme exemple d'organisation possible dans `organiser_sa_documentation_avec_ou_sans_diataxis.md`, sans en faire une norme produit. |
| `usermanual-documentation/4_reference/...tokens_pattern_nommage.md` | Transformer en reference exhaustive `pattern_de_nommage.md`. |
| `usermanual-documentation/4_reference/...dossiers_et_categories.md` | Reprendre dans un guide d'organisation + une reference courte. |
| `usermanual-documentation/2_guide/...recherche_plein_texte.md` | Mettre a jour dans `navigation_recherche_et_ancres.md`. |
| `usermanual-documentation/2_guide/...creer_et_lier_un_diagramme.md` | Reprendre, puis completer avec evidence, types C4/UML et Shape Editor. |
| `usermanual-documentation/1_tutorial/...snippets.md` | Reprendre les cas utiles, separer tutoriel et reference. |
| `README.md` | Utiliser comme source technique de quick start et de concepts MCP, mais elargir le positionnement au-dela de la documentation de code. |
| ADR recentes Workspace/Git/Images/Versions | Utiliser pour couvrir les fonctions absentes de l'ancien manuel. |

## Standards de redaction

### Gabarit Parcours guide

```markdown
# Titre oriente resultat

## Objectif

En X minutes, vous allez obtenir ...

## Prerequis

- ...

## Etapes

1. ...
2. ...
3. ...

## Resultat attendu

Vous devez voir ...

## Suite recommandee

Lire ...
```

### Gabarit Procedure

```markdown
# Comment ...

## Quand utiliser ce guide

...

## Prerequis

- ...

## Procedure

1. ...
2. ...

## Verifier le resultat

...

## Erreurs courantes

| Symptome | Cause probable | Correction |
| --- | --- | --- |
```

### Gabarit Explication

```markdown
# Concept

## Idee principale

...

## Pourquoi c'est important

...

## Comment Living Documentation le met en oeuvre

...

## Limites

...

## Lire ensuite

...
```

### Gabarit Reference

```markdown
# Reference

## Tableau principal

| Champ | Valeur | Description |
| --- | --- | --- |

## Notes

...
```

## Strategie visuelle

### Regle generale

- Utiliser de vraies captures d'ecran pour expliquer l'interface.
- Utiliser des images generees par Nano Banana Pro pour les concepts, les introductions de chapitre et les schemas non strictement UI.
- Ne pas generer de fausses captures d'ecran de l'application : elles deviennent vite inexactes.
- Chaque image doit avoir un role clair : orienter, expliquer, rassurer ou synthetiser.

### Captures d'ecran a produire

| Image | Usage |
| --- | --- |
| Home avec sidebar, document ouvert et topbar | Accueil, premier tour produit |
| New Document modal | Tutoriel premier document |
| Editeur Markdown + snippets | Guide authoring |
| Exemple de note de reunion dans Home | Notes de reunion |
| Exemple de process documente avec sections et checklist | Processus |
| Recherche avec occurrences | Navigation et recherche |
| Admin configuration generale | Guide Admin |
| Admin Git integration | Guide Git |
| Popup Versions avec diff cote-a-cote | Guide restauration Git |
| Workspace avec noeuds colores | Guide Workspace |
| Run agent avec timeline/debug | Guide agents |
| AI Context / MCP explorer | Guide MCP |
| Diagram editor avec evidence | Guide diagrammes |
| Files page avec sections | Guide fichiers |

### Prompts exacts Nano Banana Pro

Les prompts suivants sont en anglais pour maximiser la qualite du modele. Toujours demander un rendu sans texte illisible, sans logo tiers et sans interface fictive trop precise.

#### Prompt 1 - Hero produit

```text
Create a professional editorial hero illustration for a local-first documentation workspace called "Living Documentation". Show a calm workstation where Markdown documents, meeting notes, process cards, diagrams, a Git timeline, and small AI agent nodes are connected into one coherent documentation system. The mood is precise, trustworthy, modern, local-first, technical, and creative. Use a clean light background, subtle depth, realistic desktop details, and a restrained palette with black, white, slate, teal, and warm amber accents. Do not include fake UI text, unreadable text, brand logos, or cartoon characters. High-end documentation product style, 16:9, sharp, polished, minimal clutter.
```

#### Prompt 2 - Probleme de documentation obsolescente

```text
Create a professional conceptual illustration about documentation drift and knowledge fragmentation. On the left, show scattered outdated documents, meeting notes, process fragments, and code notes drifting apart. On the right, show a coherent local documentation workspace synchronized with Git commits, diagrams, process cards, and a reliability signal. The style should be elegant, editorial, and suitable for a serious documentation product. Use subtle contrast between chaos and order, no dramatic dystopian imagery. No readable text, no logos, no people close-up. 16:9, clean composition, modern technical aesthetic.
```

#### Prompt 3 - Local-first architecture

```text
Create a clean technical illustration showing a local-first documentation system. Center: a local folder containing Markdown documents, meeting notes, process files, diagrams, attachments, and generated images. Around it: a browser UI, a Git repository, a diagram canvas, and AI agent connections, all connected to the same local filesystem. Make it clear that there is no cloud database. Use precise isometric or semi-flat technical style, white background, thin lines, black and teal accents, small amber highlights. No readable text except generic abstract file icons, no brand logos. 16:9.
```

#### Prompt 4 - MCP agent workflow

```text
Create a professional technical workflow illustration for an MCP-enabled documentation assistant. Show a user request flowing to an AI agent, then to MCP tools, then to Markdown documents, meeting notes, process documents, source files, metadata hashes, diagrams, and a final generated documentation artifact. Use a clean node-and-edge visual language, not a complex dashboard. Keep it readable as a concept image, with abstract labels represented as simple blocks rather than real text. Palette: slate, blue-gray, teal, amber, white. No logos, no fake product UI, no tiny unreadable text. 16:9.
```

#### Prompt 5 - ADR lifecycle

```text
Create an editorial technical illustration of an Architecture Decision Record lifecycle. Show a feature change becoming a draft ADR, then human validation, then future drift detection and possible supersession. Use a circular or staged workflow with document cards, a code branch, metadata links, and a validation check. Serious professional style, clean white background, subtle shadows, warm amber for decision points, teal for validated knowledge. No readable text, no logos. 16:9.
```

#### Prompt 6 - Metadata reliability

```text
Create a professional conceptual image explaining documentation reliability. Show Markdown documents connected by fine lines to source code files, each connection carrying a small hash/fingerprint symbol. Include a simple abstract reliability gauge moving from red to yellow to green, but without readable text. The visual should feel precise and trustworthy, suitable for a technical documentation manual. Minimal, clean, light theme, slate and teal palette with restrained red/yellow/green indicators. 16:9.
```

#### Prompt 7 - Workspace providers and agents

```text
Create a polished technical illustration inspired by a node graph workspace for configuring AI agents. Center node represents "Living Documentation" abstractly, connected to chat model providers, image generation providers, MCP tools, and task-specific agents. Use filled color nodes: central black node, gray MCP node, orange chat provider nodes, lighter orange agent nodes, strong yellow image provider node. Do not render real UI controls or readable text; focus on the topology and professional look. Clean grid background, modern canvas style, 16:9.
```

#### Prompt 8 - Git versions and restore

```text
Create a professional illustration of restoring a document block from Git history. Show a split diff concept: current document on the left, selected historical commit on the right, and a small arrow moving one block from right to left. Include a subtle Git commit timeline above. Use abstract blocks instead of readable code, precise technical style, clean light background, blue-gray and amber accents. No real text, no logos, no messy code. 16:9.
```

#### Prompt 9 - Documentation organization models

```text
Create a refined educational illustration of a flexible documentation system organized around user journeys, product features, technical knowledge, and reference material. Show a central documentation hub connected to several well-structured sections, with optional methodology cards in the background. The image should suggest that teams can choose their own organization model. Use icons and abstract cards, not readable labels. Clean, professional, calm style for a user manual. White background, slate outlines, teal and amber accents, minimal decoration. 16:9.
```

#### Prompt 10 - From code change to living documentation

```text
Create a high-end technical illustration showing the journey from raw work to living documentation. Left to right: meeting notes, process changes, code change, Git commit, AI assistant, MCP tools, updated documentation, refreshed diagram, reliability metadata, and a reusable knowledge artifact. Use a clean flow composition with document cards and small technical symbols. No readable text, no brand logos, no cartoon characters. Modern documentation workspace style, 16:9, crisp, polished, light theme.
```

## Backlog de production

### Phase 1 - Fondations

- [x] Creer `00_ACCUEIL/00_index.md`.
- [x] Creer `00_ACCUEIL/01_living_documentation_en_bref.md`.
- [x] Creer `00_ACCUEIL/02_parcours_recommandes.md`.
- [x] Creer `90_ASSETS/charte_visuelle.md`.
- [x] Creer `90_ASSETS/screenshots_a_capturer.md`.
- [x] Creer `90_ASSETS/prompts_images.md` depuis les prompts de ce plan.

### Phase 2 - Demarrage

- [x] Creer un espace documentaire.
- [x] Creer, modifier et retrouver un document.
- [x] Structurer dossiers et categories.

### Phase 3 - Usage quotidien et administration

- [ ] Admin et configuration.
- [ ] Git et Versions.
- [ ] Notes de reunion.
- [ ] Documentation de processus.
- [ ] Snippets, images, fichiers et `images-ai`.
- [ ] Diagrammes et Shape Editor.
- [ ] Workspace LLM, agents, providers image.
- [ ] Connexion MCP.
- [ ] Export et partage.

### Phase 4 - Automatisation IA

- [ ] Creer un premier ADR assiste par IA.
- [ ] Configurer un Workspace LLM.
- [ ] Executer un agent Workspace.
- [ ] Generer une image depuis un agent.
- [ ] Comprendre tools, chat-only et providers image.

### Phase 5 - Comprendre le modele produit

- [ ] Documentation vivante.
- [ ] Living Documentation comme atelier documentaire.
- [ ] Notes, reunions, process et documentation de code.
- [ ] Local-first Markdown + Git.
- [ ] ADR lifecycle.
- [ ] Metadata reliability.
- [ ] MCP et agents IA.
- [ ] Diagrammes comme vues derivees.
- [ ] Organiser sa documentation avec ou sans Diataxis.

### Phase 6 - Reference et depannage

- [ ] CLI.
- [ ] `.living-doc.json`.
- [ ] Pattern de nommage.
- [ ] Navigation, recherche, ancres.
- [ ] Snippets.
- [ ] Admin settings.
- [ ] MCP tools/prompts.
- [ ] Workspace fields.
- [ ] Git integration.
- [ ] Troubleshooting.

## Critere de finition par document

Un document est termine seulement si :

- son objectif est explicite des le premier paragraphe ;
- son public et son contexte d'usage sont identifiables ;
- il ne suppose pas une connaissance non introduite ;
- il contient les prerequis quand il demande une action ;
- les commandes ont ete verifiees ;
- les captures ou images attendues sont referencees ou listees comme a produire ;
- les liens vers les documents voisins sont prevus ;
- le ton est professionnel, sans blague interne ni formulation approximative.

## Ordre de travail recommande

1. Produire `00_ACCUEIL/*` et `90_ASSETS/*`.
2. Produire `01_DEMARRAGE/*` pour stabiliser le vocabulaire utilisateur.
3. Produire les guides Git, Versions, Workspace et MCP, car ils portent la valeur differenciante du produit.
4. Produire les explications de fond pour donner de la profondeur et reduire les repetitions.
5. Produire la reference et le depannage en dernier, quand le vocabulaire est stabilise.

## Notes de vigilance

- Ne pas dupliquer le README : la documentation utilisateur doit etre plus progressive et plus operationnelle.
- Ne pas reduire Living Documentation a un outil d'ADR ou de documentation de code : ce sont des cas d'usage importants, pas la limite du produit.
- Ne pas presenter Living Documentation comme un generateur de code : c'est un atelier documentaire et un laboratoire d'automatisation agentique.
- Ne pas transformer les ADR internes en documentation utilisateur brute : les ADR servent de source technique, mais le langage doit etre adapte.
- Ne pas melanger documentation utilisateur et documentation contributeur.
- Ne pas generer d'images qui montrent des faux ecrans de l'application ; preferer de vraies captures pour l'UI.
- Garder les prompts image versionnes dans `90_ASSETS/prompts_images.md` pour pouvoir regenerer les visuels de maniere coherente.
