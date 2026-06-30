---
**date:** 2026-06-30
**status:** Draft
**description:** Point d'entree de la documentation utilisateur Living Documentation.
**tags:** accueil, documentation-utilisateur, living-documentation, markdown, git, agents, workspace, mcp
---

### Bienvenue dans Living Documentation !

Votre atelier local de production documentaire en Markdown.

<!-- image-width: 2/3 -->
![Atelier local Living Documentation reliant documents Markdown, notes, processus, diagrammes, Git et agents IA](/images/DOCUMENTATION/concept-01-hero-produit.png)

Ce n'est pas un outil de generation de code, mais un outil de generation, de maintenance, de versioning et d'automatisation de documentation

Living Documentation sert a garder la connaissance utile au meme endroit, dans un format lisible et versionnable :

- documents Markdown classés par dossiers et catégories
- notes de réunion et comptes rendus
- procedures, processus et checklists
- documentation de code, décisions d'architecture (ADRs)
- diagrammes lies a des documents
- images, fichiers joints et visuels generes
- runs d'agents et traces d'automatisation
- historique Git et comparaison de versions

### Un modèle local-first

<!-- image-width: 2/3 -->
![Architecture local-first reliant un dossier Markdown, Git, une interface web, des diagrammes et des agents IA](/images/DOCUMENTATION/concept-03-local-first.png)

La documentation repose sur des fichiers presents dans votre espace local :

- les documents sont des fichiers Markdown pouvant être consultés par vous ou par vos LLMs
- le versionning utilise Git pour enregistrer les modifications au fil de l'eau et permettre la restauration de tous vos documents
- l'outil peut etre utilise seul, puis enrichi avec ses propres outils MCP et ses agents internes

### Commençons la visite !

Avant tout, je vous recommande de procéder à l'intégration de Git dans living documentation, vous pourrez ainsi bénéficier du versionning automatique de tous vos changements.
Vous devez disposez de git installé sur votre ordinateur, puis depuis le terminal ouvrez le dossier contenant living-documentation et initialisez un repository git.

```bash
git init
```

Pour commencer, choisissez le chemin qui vous intéresse
<!-- table-border: bordered -->
<!-- table-color: info -->
| Besoin                                          | Lire                                                                                                      |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Comprendre le produit en quelques minutes       | [Living Documentation en bref](?doc=DOCUMENTATION%252F00_ACCUEIL%252F2026_06_30_10_10_%255BDOCUMENTATION%255D_Living_Documentation_En_Bref)                                     |
| Choisir le bon parcours selon votre role        | [Parcours recommandes](./02_parcours_recommandes.md)                                                      |
| Creer votre premier espace documentaire         | [Creer un espace documentaire](../01_DEMARRAGE/01_creer_un_espace_documentaire.md)                        |
| Creer et retrouver un document                  | [Creer, modifier et retrouver un document](../01_DEMARRAGE/02_creer_modifier_et_retrouver_un_document.md) |
| Configurer Git, les versions et les sauvegardes | `../04_ADMINISTRATION/utiliser_git_et_les_versions.md`                                                    |
| Automatiser des taches avec des agents          | `../03_AUTOMATISATION_IA/executer_un_agent_workspace.md`                                                  |


## Ce que vous pouvez produire

Living Documentation peut devenir le point de rassemblement de plusieurs formes de connaissance :



## Grands parcours

| Parcours | Objectif | Section |
| --- | --- | --- |
| Demarrer | Installer, ouvrir un espace, creer les premiers documents | [01_DEMARRAGE](../01_DEMARRAGE/01_creer_un_espace_documentaire.md) |
| Ecrire au quotidien | Organiser, enrichir, rechercher et exporter | `02_USAGE_QUOTIDIEN/` |
| Automatiser | Configurer Workspace, MCP, agents et providers LLM | `03_AUTOMATISATION_IA/` |
| Administrer | Configurer l'application, Git, versions, fichiers et depannage | `04_ADMINISTRATION/` |
| Comprendre | Approfondir le modele produit et les principes documentaires | `05_COMPRENDRE/` |
| Verifier | Retrouver les formats, champs, commandes et comportements exacts | `06_REFERENCE/` |

## Documentation en construction

Cette documentation est produite progressivement selon le plan de travail versionne dans [Plan.md](../Plan.md). Les premiers documents stabilisent le vocabulaire, les parcours et la charte visuelle avant de produire les guides detailles.
